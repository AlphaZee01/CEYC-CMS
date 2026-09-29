import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const AUTH_CALL_TIMEOUT_MS = 15_000;

/** Supabase client available (realtime chat, optional features). */
export const supabaseConfigured = !!(url && anonKey);

/** Supabase sign-in — must match server USE_SUPABASE_AUTH=true. */
export const supabaseAuthEnabled =
  import.meta.env.VITE_USE_SUPABASE_AUTH === "true" && supabaseConfigured;

export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

let cachedAccessToken: string | null = null;
let passwordSignInInProgress = false;

function withAuthTimeout<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out — check network or Supabase config`));
    }, AUTH_CALL_TIMEOUT_MS);
    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token ?? null;
  });
}

export function beginPasswordSignIn() {
  passwordSignInInProgress = true;
}

export function endPasswordSignIn() {
  passwordSignInInProgress = false;
}

export function isPasswordSignInInProgress() {
  return passwordSignInInProgress;
}

export function getCachedSupabaseAccessToken() {
  return cachedAccessToken;
}

export function setCachedSupabaseAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export function isRefreshTokenError(message?: string) {
  return !!message && /refresh token|invalid refresh token/i.test(message);
}

/** Drop broken persisted Supabase sessions (e.g. after password reset or auth:sync). */
export async function ensureValidSupabaseSession() {
  if (!supabase || passwordSignInInProgress) return;
  await withAuthTimeout("Session check", async () => {
    const { data, error } = await supabase!.auth.getSession();
    if (error && isRefreshTokenError(error.message)) {
      await clearStaleSupabaseSession();
      return;
    }
    if (!data.session) return;
    cachedAccessToken = data.session.access_token ?? null;
    const { error: userError } = await supabase!.auth.getUser();
    if (userError && isRefreshTokenError(userError.message)) {
      await clearStaleSupabaseSession();
    }
  }).catch(() => {
    /* Non-fatal during bootstrap — login can still proceed */
  });
}

/** Clear a revoked or expired Supabase session from local storage. */
export async function clearStaleSupabaseSession() {
  if (!supabase) return;
  cachedAccessToken = null;
  await supabase.auth.signOut({ scope: "local" });
}

export async function signOutSupabase(options?: { local?: boolean }) {
  if (!supabase) return;
  cachedAccessToken = null;
  await supabase.auth.signOut({ scope: options?.local ? "local" : "global" });
}

export function memberChatChannel(memberId: string) {
  return `member:${memberId}`;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  if (passwordSignInInProgress) {
    return cachedAccessToken;
  }
  if (cachedAccessToken) return cachedAccessToken;

  try {
    const { data, error } = await withAuthTimeout("getSession", () => supabase!.auth.getSession());
    if (error && isRefreshTokenError(error.message)) {
      await clearStaleSupabaseSession();
      return null;
    }
    cachedAccessToken = data.session?.access_token ?? null;
    return cachedAccessToken;
  } catch {
    return cachedAccessToken;
  }
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await withAuthTimeout("Sign in", () =>
    supabase!.auth.signInWithPassword({ email, password })
  );
  if (error) throw new Error(error.message);
  if (!data.session?.access_token) throw new Error("Sign-in succeeded but no session was returned");
  cachedAccessToken = data.session.access_token;
  return data.session;
}

export async function resetPasswordForEmail(email: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function updateSupabasePassword(password: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function changeSupabasePassword(currentPassword: string, newPassword: string, email: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (signInError) throw new Error("Current password is incorrect");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
