import { publicApi } from "@/lib/api";

export type AuthMode = "jwt" | "supabase";

let authMode: AuthMode = "jwt";
let loaded = false;
let loadPromise: Promise<AuthMode> | null = null;

/** Fetch auth mode from server (single source of truth). */
export async function loadAuthMode(): Promise<AuthMode> {
  if (loaded) return authMode;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const config = await publicApi<{ authMode: AuthMode }>("/public/config");
      authMode = config.authMode === "supabase" ? "supabase" : "jwt";
    } catch {
      authMode =
        import.meta.env.VITE_USE_SUPABASE_AUTH === "true" ? "supabase" : "jwt";
    }
    loaded = true;
    return authMode;
  })();

  return loadPromise;
}

export function getAuthMode(): AuthMode {
  return authMode;
}

export function useSupabaseForAuth(): boolean {
  return authMode === "supabase";
}

export function resetAuthModeCache() {
  loaded = false;
  loadPromise = null;
  authMode = "jwt";
}
