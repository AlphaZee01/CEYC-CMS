import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = !!(url && anonKey);

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

export function isRefreshTokenError(message?: string) {
  return !!message && /refresh token/i.test(message);
}

/** Clear a revoked or expired Supabase session from local storage. */
export async function clearStaleSupabaseSession() {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: "local" });
}

export async function signOutSupabase(options?: { local?: boolean }) {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: options?.local ? "local" : "global" });
}

export function memberChatChannel(memberId: string) {
  return `member:${memberId}`;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error && isRefreshTokenError(error.message)) {
    await clearStaleSupabaseSession();
    return null;
  }
  return data.session?.access_token ?? null;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
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
