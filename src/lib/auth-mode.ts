import { publicApi } from "@/lib/api";
import { authLog, authLogError } from "@/lib/auth-log";
import { supabaseAuthEnabled, supabaseConfigured } from "@/lib/supabase";

export type AuthMode = "jwt" | "supabase";

let authMode: AuthMode = "jwt";
let loaded = false;
let loadPromise: Promise<AuthMode> | null = null;

/** Fetch auth mode from server (single source of truth). */
export async function loadAuthMode(): Promise<AuthMode> {
  if (loaded) return authMode;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const retries = [0, 400, 1200];
    let lastError: unknown;
    authLog("loadAuthMode", `supabaseConfigured=${supabaseConfigured} viteAuth=${supabaseAuthEnabled}`);
    for (const delayMs of retries) {
      if (delayMs > 0) {
        authLog("loadAuthMode retry", `wait ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
      try {
        const config = await publicApi<{ authMode: AuthMode }>("/public/config");
        authMode = config.authMode === "supabase" ? "supabase" : "jwt";
        loaded = true;
        authLog("loadAuthMode ok", authMode);
        return authMode;
      } catch (err) {
        lastError = err;
        authLogError("loadAuthMode attempt failed", err);
      }
    }
    const fallback = supabaseAuthEnabled ? "supabase" : "jwt";
    authLogError("loadAuthMode using fallback", lastError);
    authLog("loadAuthMode fallback", fallback);
    authMode = fallback;
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
