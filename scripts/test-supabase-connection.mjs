import "dotenv/config";
import pg from "pg";
import { buildSupabasePoolerUrlCandidates, resolveDatabaseUrl } from "../server/supabase-db-url.js";

const password = process.env.SUPABASE_DB_PASSWORD?.trim();
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  (process.env.SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];

const attempts = [];
const resolved = resolveDatabaseUrl();
if (resolved) attempts.push(["resolved DATABASE_URL / transaction pooler", resolved]);
if (password && projectRef) {
  for (const url of buildSupabasePoolerUrlCandidates({ projectRef, password, region: process.env.SUPABASE_DB_REGION })) {
    if (url === resolved) continue;
    const port = url.includes(":5432/") ? "5432" : "6543";
    const host = url.match(/@([^/]+)\//)?.[1] || "pooler";
    attempts.push([`pooler ${host}:${port}`, url]);
  }
}

if (!attempts.length) {
  console.error("No connection string could be built. Set DATABASE_URL or SUPABASE_DB_PASSWORD + SUPABASE_PROJECT_REF.");
  process.exit(1);
}

let ok = false;
for (const [label, connectionString] of attempts) {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  try {
    await pool.query("SELECT 1 AS ok");
    console.log(`✓ ${label}`);
    ok = true;
    await pool.end();
    break;
  } catch (err) {
    console.error(`✗ ${label}: ${err.message}`);
    await pool.end().catch(() => {});
  }
}

if (!ok) {
  console.error(
    "\nIf you see 'tenant/user ... not found', verify SUPABASE_DB_PASSWORD in .env " +
      "(Supabase → Project Settings → Database). You can also paste the full pooler URI as DATABASE_URL."
  );
  process.exit(1);
}
