import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, authApi, setToken } from "@/lib/api";
import type { AuthUser, PageId } from "@/types/church";

interface AuthState {
  user: AuthUser | null;
  pages: PageId[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pages, setPages] = useState<PageId[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user as AuthUser);
      setPages(data.pages as PageId[]);
    } catch {
      setUser(null);
      setPages([]);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("celcm_token");
    if (token) refresh().finally(() => setLoading(false));
    else setLoading(false);
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login(email, password);
    setToken(token);
    setUser(u as AuthUser);
    const me = await authApi.me();
    setPages(me.pages as PageId[]);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPages([]);
  };

  return (
    <AuthContext.Provider value={{ user, pages, loading, login, logout, refresh }}>
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
