import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { authApi, fetchBootstrap, setToken } from "@/lib/api";
import { useStaleWhileRevalidate } from "@/hooks/useStaleWhileRevalidate";
import { clearPageDataCache } from "@/hooks/useStaleWhileRevalidate";
import { loadAuthMode, useSupabaseForAuth } from "@/lib/auth-mode";
import {
  supabase,
  signInWithEmail,
  signOutSupabase,
  clearStaleSupabaseSession,
  ensureValidSupabaseSession,
  isRefreshTokenError,
  beginPasswordSignIn,
  endPasswordSignIn,
  getCachedSupabaseAccessToken,
  setCachedSupabaseAccessToken,
} from "@/lib/supabase";
import type { AuthUser, PageId } from "@/types/church";
import {
  cacheBranding,
  clearBrandingCache,
  getCachedBranding,
  type ChurchBranding,
  DEFAULT_BRANDING,
} from "@/lib/branding";
import { clearPwaInstallDismiss } from "@/lib/pwa-install";
import { authLog, authLogError, authLogStart, authLogTimed } from "@/lib/auth-log";

interface AuthState {
  user: AuthUser | null;
  pages: PageId[];
  departmentAbilities: string[];
  branding: ChurchBranding;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  syncBranding: (branding: ChurchBranding) => void;
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
  setDepartmentAbilities: (a: string[]) => void,
  setBranding: (b: ChurchBranding) => void,
  data: {
    user: unknown;
    pages: string[];
    departmentAbilities?: string[];
    branding?: { name: string; tagline?: string; logoUrl?: string | null };
  }
) {
  setUser(data.user as AuthUser);
  setPages(data.pages as PageId[]);
  setDepartmentAbilities(data.departmentAbilities || []);
  applyBranding(setBranding, data.branding);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pages, setPages] = useState<PageId[]>([]);
  const [departmentAbilities, setDepartmentAbilities] = useState<string[]>([]);
  const [branding, setBranding] = useState<ChurchBranding>(getCachedBranding);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  /** True while login() is loading the session — skip SIGNED_IN listener refresh (avoids auth lock deadlock). */
  const signInFlowRef = useRef(false);
  /** Skip duplicate SIGNED_IN refresh after persisted session already loaded via /api/auth/me. */
  const sessionHydratedRef = useRef(false);

  const clearSession = useCallback(async () => {
    setUser(null);
    setPages([]);
    setDepartmentAbilities([]);
    setToken(null);
    sessionHydratedRef.current = false;
    clearPageDataCache();
    if (useSupabaseForAuth()) await clearStaleSupabaseSession();
  }, []);

  const refresh = useCallback(async () => {
    if (signInFlowRef.current) return;
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const data = await authLogTimed("GET /api/auth/me", () => authApi.me());
        applySession(setUser, setPages, setDepartmentAbilities, setBranding, data);
        sessionHydratedRef.current = true;
        authLog("Session loaded", (data.user as AuthUser)?.member?.email);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        authLogError("Session refresh failed", err);
        if (
          isRefreshTokenError(message) ||
          /session expired|authentication required|invalid session/i.test(message)
        ) {
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

  const scheduleSessionRefresh = useCallback(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      let unsubscribe: (() => void) | undefined;
      try {
        const mode = await loadAuthMode();
        authLog("Auth mode from server", mode);

        if (mode === "supabase" && supabase) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            authLog(`Supabase auth: ${event}`, session ? "has session" : "no session");

            if (event === "INITIAL_SESSION") return;

            if (event === "SIGNED_OUT" || event === "USER_DELETED") {
              setUser(null);
              setPages([]);
              setDepartmentAbilities([]);
              return;
            }

            if (!session) return;

            if (event === "SIGNED_IN" && signInFlowRef.current) return;
            if (event === "SIGNED_IN" && sessionHydratedRef.current) return;

            if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
              scheduleSessionRefresh();
            }
          });
          unsubscribe = () => subscription.unsubscribe();

          // Do not block the login UI on session restore (Vercel /api can be slow on cold start).
          void (async () => {
            await ensureValidSupabaseSession();
            const hasPersistedSession = !!getCachedSupabaseAccessToken();
            if (mounted && !hasPersistedSession) {
              setUser(null);
              setPages([]);
              setDepartmentAbilities([]);
            }
            if (mounted && hasPersistedSession) void refresh();
          })();
        } else {
          const token = localStorage.getItem("celcm_token");
          if (token && mounted) void refresh();
        }
      } finally {
        authLog("Auth bootstrap finished", "loading=false");
        if (mounted) setLoading(false);
      }
      return unsubscribe;
    };

    const unsubPromise = init();
    return () => {
      mounted = false;
      unsubPromise.then((unsub) => unsub?.());
    };
  }, [refresh, scheduleSessionRefresh]);

  const login = async (email: string, password: string) => {
    authLogStart(`Sign-in: ${email}`);
    signInFlowRef.current = true;
    beginPasswordSignIn();
    try {
      const mode = await loadAuthMode();
      authLog("login()", `mode=${mode} useSupabase=${useSupabaseForAuth()}`);

      if (useSupabaseForAuth()) {
        if (!supabase) {
          throw new Error(
            "Supabase Auth is enabled on the server but VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing in the client build."
          );
        }
        const session = await authLogTimed("Supabase signInWithPassword", () =>
          signInWithEmail(email, password)
        );
        setCachedSupabaseAccessToken(session.access_token);
        const data = await authLogTimed("GET /api/auth/me", () =>
          Promise.race([
            authApi.meWithBearer(session.access_token),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Server profile load timed out — try again in a moment")), 45_000)
            ),
          ])
        );
        applySession(setUser, setPages, setDepartmentAbilities, setBranding, data);
        sessionHydratedRef.current = true;
        authLog("Sign-in complete");
        return;
      }

      const { token, user: u } = await authLogTimed("POST /api/auth/login", () =>
        authApi.login(email, password)
      );
      setToken(token);
      setUser(u as AuthUser);
      const me = await authLogTimed("GET /api/auth/me", () => authApi.me());
      setPages(me.pages as PageId[]);
      setDepartmentAbilities(me.departmentAbilities || []);
      applyBranding(setBranding, me.branding);
      sessionHydratedRef.current = true;
      authLog("Sign-in complete", "jwt");
    } catch (err) {
      authLogError("login() failed", err);
      throw err;
    } finally {
      signInFlowRef.current = false;
      endPasswordSignIn();
      authLog("login() finally", "signInFlow cleared");
    }
  };

  const syncBranding = useCallback((next: ChurchBranding) => {
    setBranding(next);
    cacheBranding(next);
  }, []);

  const logout = async () => {
    if (useSupabaseForAuth()) await signOutSupabase();
    clearPwaInstallDismiss();
    clearBrandingCache();
    setToken(null);
    setUser(null);
    setPages([]);
    setDepartmentAbilities([]);
    setBranding(DEFAULT_BRANDING);
  };

  return (
    <AuthContext.Provider
      value={{ user, pages, departmentAbilities, branding, loading, login, logout, refresh, syncBranding }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export type BootstrapData = {
  members: unknown[];
  fellowships: unknown[];
  cells: unknown[];
  departments: unknown[];
  settings: Record<string, string>;
};

export function useBootstrap(enabled: boolean, userId?: string) {
  const cacheKey = userId ? `bootstrap:${userId}` : "bootstrap:pending";
  const { data, initialLoading, refreshing, reload } = useStaleWhileRevalidate<BootstrapData>(
    cacheKey,
    () =>
      authLogTimed("GET /api/bootstrap", () => fetchBootstrap<BootstrapData>()).then((d) => {
        authLog("Bootstrap loaded", `${(d?.members as unknown[])?.length ?? 0} members`);
        return d;
      }),
    { enabled }
  );

  return { data: data ?? null, loading: initialLoading, refreshing, reload };
}
