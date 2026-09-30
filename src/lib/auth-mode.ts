import { publicApi } from "@/lib/api";
import { authLog, authLogError } from "@/lib/auth-log";
import { supabaseAuthEnabled, supabaseConfigured } from "@/lib/supabase";

export type AuthMode = "jwt" | "supabase";

let authMode: AuthMode = "jwt";
let loaded = false;
let loadPromise: Promise<AuthMode> | null = null;

const BOOTSTRAP_MODE_TIMEOUT_MS = 8_000;

function envFallbackMode(): AuthMode {
  return supabaseAuthEnabled ? "supabase" : "jwt";
}

async function fetchAuthModeFromServer(): Promise<AuthMode> {
  const retries = [0, 300];
  let lastError: unknown;
  authLog("loadAuthMode", `supabaseConfigured=${supabaseConfigured} viteAuth=${supabaseAuthEnabled}`);
  for (const delayMs of retries) {
    if (delayMs > 0) {
      authLog("loadAuthMode retry", `wait ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      const config = await publicApi<{ authMode: AuthMode }>("/public/config");
      const mode = config.authMode === "supabase" ? "supabase" : "jwt";
      authLog("loadAuthMode ok", mode);
      return mode;
    } catch (err) {
      lastError = err;
      authLogError("loadAuthMode attempt failed", err);
    }
  }
  authLogError("loadAuthMode using fallback", lastError);
  return envFallbackMode();
}

/** Fetch auth mode from server (single source of truth). Never blocks longer than ~8s. */
export async function loadAuthMode(): Promise<AuthMode> {
  if (loaded) return authMode;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutFallback = new Promise<AuthMode>((resolve) => {
      timeoutId = setTimeout(() => {
        const fallback = envFallbackMode();
        authLog("loadAuthMode timeout", `using ${fallback} after ${BOOTSTRAP_MODE_TIMEOUT_MS}ms`);
        resolve(fallback);
      }, BOOTSTRAP_MODE_TIMEOUT_MS);
    });
    try {
      const mode = await Promise.race([fetchAuthModeFromServer(), timeoutFallback]);
      authMode = mode;
      loaded = true;
      return authMode;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
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
