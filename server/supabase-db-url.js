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

function poolerHostname(region, awsCluster) {
  if (process.env.SUPABASE_POOLER_HOST?.trim()) {
    return process.env.SUPABASE_POOLER_HOST.trim();
  }
  const reg = (region || process.env.SUPABASE_DB_REGION || "us-west-1").trim();
  const cluster = (awsCluster ?? process.env.SUPABASE_POOLER_AWS_CLUSTER ?? "0").trim();
  return `aws-${cluster}-${reg}.pooler.supabase.com`;
}

/** Build Supabase transaction-pooler URI from project ref + DB password. */
export function buildSupabasePoolerUrl({ projectRef, password, region, port = 6543, awsCluster }) {
  const ref = projectRef?.trim();
  const pass = encodeURIComponent(password.trim());
  if (!ref || !password?.trim()) return null;
  const host = poolerHostname(region, awsCluster);
  return `postgresql://postgres.${ref}:${pass}@${host}:${port}/postgres`;
}

/** Some projects use aws-1-{region} pooler hosts instead of aws-0. */
export function buildSupabasePoolerUrlCandidates({ projectRef, password, region }) {
  const clusters = new Set(["0", "1"]);
  const configured = process.env.SUPABASE_POOLER_AWS_CLUSTER?.trim();
  if (configured) {
    clusters.clear();
    clusters.add(configured);
  }
  const urls = [];
  for (const awsCluster of clusters) {
    for (const port of [6543, 5432]) {
      const url = buildSupabasePoolerUrl({ projectRef, password, region, port, awsCluster });
      if (url && !urls.includes(url)) urls.push(url);
    }
  }
  return urls;
}

/** Session pooler (IPv4-friendly on some networks). */
export function buildSupabaseSessionPoolerUrl(opts) {
  return buildSupabasePoolerUrl({ ...opts, port: 5432 });
}

/** Direct DB host (IPv6). Fallback when pooler tenant lookup fails. */
export function buildSupabaseDirectUrl({ projectRef, password }) {
  const ref = projectRef?.trim();
  const pass = encodeURIComponent(password.trim());
  if (!ref || !password?.trim()) return null;
  return `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`;
}

export function resolveDatabaseUrl() {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const projectRef = projectRefFromEnv();
  if (!password || !projectRef) return null;

  const pooler = buildSupabasePoolerUrl({
    projectRef,
    password,
    region: process.env.SUPABASE_DB_REGION,
  });
  if (process.env.USE_SUPABASE_DB_DIRECT === "true") {
    return buildSupabaseDirectUrl({ projectRef, password });
  }
  return pooler;
}

export function canUseSupabaseDatabase() {
  return !!resolveDatabaseUrl();
}

export function assertDatabaseConfigured() {
  if (!resolveDatabaseUrl()) {
    throw new Error(
      "Supabase Postgres is required. Set DATABASE_URL or USE_SUPABASE_DB=true with SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_REF, and SUPABASE_DB_REGION."
    );
  }
}
