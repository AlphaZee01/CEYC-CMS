import { publicApi } from "@/lib/api";
import { supabaseAuthEnabled } from "@/lib/supabase";

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
    for (const delayMs of retries) {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      try {
        const config = await publicApi<{ authMode: AuthMode }>("/public/config");
        authMode = config.authMode === "supabase" ? "supabase" : "jwt";
        loaded = true;
        return authMode;
      } catch (err) {
        lastError = err;
      }
    }
    const fallback = supabaseAuthEnabled ? "supabase" : "jwt";
    console.warn(
      `[auth] Could not load /api/public/config; using ${fallback} login from client env.`,
      lastError
    );
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
