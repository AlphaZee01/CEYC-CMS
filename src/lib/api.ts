import { getSupabaseAccessToken } from "@/lib/supabase";
import { useSupabaseForAuth } from "@/lib/auth-mode";
import { authLog } from "@/lib/auth-log";

const API_BASE = "/api";

function getLegacyToken() {
  return localStorage.getItem("celcm_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("celcm_token", token);
  else localStorage.removeItem("celcm_token");
}

function isLoginRoute() {
  const path = window.location.pathname;
  return path === "/" || path === "/reset-password";
}

export async function publicApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
}

/** Authenticated fetch using an explicit bearer token (avoids Supabase getSession during sign-in). */
export async function apiWithBearer<T>(
  path: string,
  bearerToken: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  headers.Authorization = `Bearer ${bearerToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const message = (data.error as string) || "Session expired";
    throw new Error(message);
  }

  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let token: string | null = null;
  if (useSupabaseForAuth()) {
    token = await getSupabaseAccessToken();
    if (token) authLog("Supabase access token ready");
  } else {
    token = getLegacyToken();
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const message = (data.error as string) || "Session expired";
    if (!isLoginRoute()) {
      if (!useSupabaseForAuth()) setToken(null);
      else {
        const { clearStaleSupabaseSession } = await import("@/lib/supabase");
        await clearStaleSupabaseSession();
      }
      if (!window.location.pathname.startsWith("/app")) {
        throw new Error(message);
      }
      window.location.href = "/";
    }
    throw new Error(message);
  }

  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    publicApi<{ token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () =>
    api<{
      user: unknown;
      pages: string[];
      departmentAbilities?: string[];
      branding?: { name: string; tagline?: string; logoUrl?: string | null };
    }>("/auth/me"),
  meWithBearer: (bearerToken: string) =>
    apiWithBearer<{
      user: unknown;
      pages: string[];
      departmentAbilities?: string[];
      branding?: { name: string; tagline?: string; logoUrl?: string | null };
    }>("/auth/me", bearerToken),
};

export function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
