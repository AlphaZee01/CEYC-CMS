/**
 * Resolve Postgres connection for the API server.
 *
 * Option A — full URI (any Postgres host):
 *   DATABASE_URL=postgresql://...
 *
 * Option B — Supabase credentials only (no long connection string):
 *   USE_SUPABASE_DB=true
 *   SUPABASE_PROJECT_REF=gilcsmnyeuxwuvpxowik   (you already have this)
 *   SUPABASE_DB_PASSWORD=your-database-password  (Dashboard → Database → password)
 *   SUPABASE_DB_REGION=eu-central-1              (optional; see pooler host in dashboard)
 */

function projectRefFromEnv() {
  if (process.env.SUPABASE_PROJECT_REF?.trim()) {
    return process.env.SUPABASE_PROJECT_REF.trim();
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] || null;
}

/** Build Supabase transaction-pooler URI from project ref + DB password. */
export function buildSupabasePoolerUrl({ projectRef, password, region }) {
  const ref = projectRef?.trim();
  const pass = encodeURIComponent(password.trim());
  const reg = (region || "eu-central-1").trim();
  if (!ref || !password?.trim()) return null;
  return `postgresql://postgres.${ref}:${pass}@aws-0-${reg}.pooler.supabase.com:6543/postgres`;
}

export function resolveDatabaseUrl() {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const projectRef = projectRefFromEnv();
  if (!password || !projectRef) return null;

  return buildSupabasePoolerUrl({
    projectRef,
    password,
    region: process.env.SUPABASE_DB_REGION,
  });
}

export function canUseSupabaseDatabase() {
  if (process.env.USE_SUPABASE_DB === "false") return false;
  if (!process.env.USE_SUPABASE_DB || process.env.USE_SUPABASE_DB !== "true") {
    return !!resolveDatabaseUrl() && !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  }
  return !!resolveDatabaseUrl();
}
