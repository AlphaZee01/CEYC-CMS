import { getSupabaseAccessToken, supabaseConfigured } from "@/lib/supabase";

const API_BASE = "/api";

function getLegacyToken() {
  return localStorage.getItem("celcm_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("celcm_token", token);
  else localStorage.removeItem("celcm_token");
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
  if (supabaseConfigured) {
    token = await getSupabaseAccessToken();
  } else {
    token = getLegacyToken();
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (!supabaseConfigured) setToken(null);
    window.location.href = "/";
    throw new Error("Session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<{ user: unknown; pages: string[] }>("/auth/me"),
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
