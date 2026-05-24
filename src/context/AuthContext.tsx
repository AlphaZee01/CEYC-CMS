import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { api, authApi, setToken } from "@/lib/api";
import {
  supabase,
  supabaseConfigured,
  signInWithEmail,
  signOutSupabase,
} from "@/lib/supabase";
import type { AuthUser, PageId } from "@/types/church";
import { cacheBranding, getCachedBranding, type ChurchBranding, DEFAULT_BRANDING } from "@/lib/branding";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pages, setPages] = useState<PageId[]>([]);
  const [branding, setBranding] = useState<ChurchBranding>(getCachedBranding);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const data = await authApi.me();
        setUser(data.user as AuthUser);
        setPages(data.pages as PageId[]);
        if (data.branding) {
          setBranding({
            name: data.branding.name,
            tagline: data.branding.tagline,
            logoUrl: data.branding.logoUrl || undefined,
          });
          cacheBranding({
            name: data.branding.name,
            tagline: data.branding.tagline,
            logoUrl: data.branding.logoUrl || undefined,
          });
        }
      } catch {
        setUser(null);
        setPages([]);
        setToken(null);
        if (supabaseConfigured) await signOutSupabase();
      }
    })();

    try {
      await refreshPromiseRef.current;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (supabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && mounted) await refresh();

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            if (session && event !== "PASSWORD_RECOVERY") await refresh();
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
    if (supabaseConfigured) {
      await signInWithEmail(email, password);
      await refresh();
      return;
    }
    const { token, user: u } = await authApi.login(email, password);
    setToken(token);
    setUser(u as AuthUser);
    const me = await authApi.me();
    setPages(me.pages as PageId[]);
    if (me.branding) {
      setBranding({
        name: me.branding.name,
        tagline: me.branding.tagline,
        logoUrl: me.branding.logoUrl || undefined,
      });
      cacheBranding({
        name: me.branding.name,
        tagline: me.branding.tagline,
        logoUrl: me.branding.logoUrl || undefined,
      });
    }
  };

  const logout = async () => {
    if (supabaseConfigured) await signOutSupabase();
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
      const d = await api<typeof data>("/bootstrap");
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}
