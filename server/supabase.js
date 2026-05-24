import { createClient } from "@supabase/supabase-js";
import { usePostgres } from "./store.js";

export const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Use Supabase Auth when connected to Supabase Postgres (or explicitly enabled). */
export function useSupabaseAuth() {
  if (process.env.USE_SUPABASE_AUTH === "false") return false;
  if (process.env.USE_SUPABASE_AUTH === "true") return !!(supabaseUrl && supabaseAnonKey);
  return usePostgres && !!(supabaseUrl && supabaseAnonKey);
}

let authClient;
let adminClient;

export function getSupabaseAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!authClient) {
    authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return authClient;
}

export function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export async function verifySupabaseAccessToken(accessToken) {
  const client = getSupabaseAuthClient();
  if (!client) return { user: null, error: new Error("Supabase Auth not configured") };
  const { data, error } = await client.auth.getUser(accessToken);
  return { user: data?.user ?? null, error };
}
