import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { api, authApi, setToken } from "@/lib/api";
import { loadAuthMode, useSupabaseForAuth } from "@/lib/auth-mode";
import {
  supabase,
  signInWithEmail,
  signOutSupabase,
  clearStaleSupabaseSession,
  isRefreshTokenError,
} from "@/lib/supabase";
import type { AuthUser, PageId } from "@/types/church";
import { cacheBranding, getCachedBranding, type ChurchBranding, DEFAULT_BRANDING } from "@/lib/branding";
import { authLog, authLogError, authLogStart, authLogTimed } from "@/lib/auth-log";

interface AuthState {
  user: AuthUser | null;
  pages: PageId[];
  branding: ChurchBranding;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function applyBranding(
  setBranding: (b: ChurchBranding) => void,
  branding?: { name: string; tagline?: string; logoUrl?: string | null }
) {
  if (!branding) return;
  const next = {
    name: branding.name,
    tagline: branding.tagline,
    logoUrl: branding.logoUrl || undefined,
  };
  setBranding(next);
  cacheBranding(next);
}

function applySession(
  setUser: (u: AuthUser | null) => void,
  setPages: (p: PageId[]) => void,
  setBranding: (b: ChurchBranding) => void,
  data: { user: unknown; pages: string[]; branding?: { name: string; tagline?: string; logoUrl?: string | null } }
) {
  setUser(data.user as AuthUser);
  setPages(data.pages as PageId[]);
  applyBranding(setBranding, data.branding);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pages, setPages] = useState<PageId[]>([]);
  const [branding, setBranding] = useState<ChurchBranding>(getCachedBranding);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const clearSession = useCallback(async () => {
    setUser(null);
    setPages([]);
    setToken(null);
    if (useSupabaseForAuth()) await clearStaleSupabaseSession();
  }, []);

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const data = await authLogTimed("GET /api/auth/me", () => authApi.me());
        applySession(setUser, setPages, setBranding, data);
        authLog("Session loaded", (data.user as AuthUser)?.member?.email);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        authLogError("Session refresh failed", err);
        if (isRefreshTokenError(message) || /session expired|authentication required|invalid session/i.test(message)) {
          await clearSession();
        } else {
          setUser(null);
          setPages([]);
          setToken(null);
          if (useSupabaseForAuth()) await signOutSupabase({ local: true });
        }
      }
    })();

    try {
      await refreshPromiseRef.current;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [clearSession]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const mode = await loadAuthMode();
        authLog("Auth mode from server", mode);

        if (mode === "supabase" && supabase) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            authLog(`Supabase auth: ${event}`, session ? "has session" : "no session");

            if (event === "SIGNED_OUT" || event === "USER_DELETED") {
              setUser(null);
              setPages([]);
              return;
            }

            if (event === "INITIAL_SESSION") {
              if (session) await refresh();
              else {
                setUser(null);
                setPages([]);
              }
              return;
            }

            if (session && event === "TOKEN_REFRESHED") {
              await refresh();
            }

            if (!session) {
              setUser(null);
              setPages([]);
            }
          });

          return () => subscription.unsubscribe();
        }

        const token = localStorage.getItem("celcm_token");
        if (token && mounted) await refresh();
      } finally {
        if (mounted) setLoading(false);
      }
      return undefined;
    };

    const unsubPromise = init();
    return () => {
      mounted = false;
      unsubPromise.then((unsub) => unsub?.());
    };
  }, [refresh]);

  const login = async (email: string, password: string) => {
    authLogStart(`Sign-in: ${email}`);

    if (useSupabaseForAuth()) {
      await authLogTimed("Supabase signInWithPassword", () => signInWithEmail(email, password));
      const data = await authLogTimed("GET /api/auth/me", () => authApi.me());
      applySession(setUser, setPages, setBranding, data);
      authLog("Sign-in complete");
      return;
    }

    const { token, user: u } = await authLogTimed("POST /api/auth/login", () => authApi.login(email, password));
    setToken(token);
    setUser(u as AuthUser);
    const me = await authLogTimed("GET /api/auth/me", () => authApi.me());
    setPages(me.pages as PageId[]);
    applyBranding(setBranding, me.branding);
    authLog("Sign-in complete");
  };

  const logout = async () => {
    if (useSupabaseForAuth()) await signOutSupabase();
    setToken(null);
    setUser(null);
    setPages([]);
    setBranding(DEFAULT_BRANDING);
  };

  return (
    <AuthContext.Provider value={{ user, pages, branding, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useBootstrap(enabled: boolean) {
  const [data, setData] = useState<{
    members: unknown[];
    fellowships: unknown[];
    cells: unknown[];
    departments: unknown[];
    settings: Record<string, string>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const d = await authLogTimed("GET /api/bootstrap", () => api<typeof data>("/bootstrap"));
      setData(d);
      authLog("Bootstrap loaded", `${(d?.members as unknown[])?.length ?? 0} members`);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}
