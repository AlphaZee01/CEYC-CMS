import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { toPostgresSql } from "./sql-dialect.js";
import {
  buildSupabaseDirectUrl,
  buildSupabasePoolerUrlCandidates,
  resolveDatabaseUrl,
} from "./supabase-db-url.js";
import { alignPostgresSchema } from "./pg-align.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool;

function getPool() {
  if (!pool) {
    throw new Error("Postgres pool not initialized. Call initPostgres() first.");
  }
  return pool;
}

async function tryPool(connectionString) {
  pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 2 : 10,
    connectionTimeoutMillis: 12_000,
    idleTimeoutMillis: 20_000,
  });
  const client = await pool.connect();
  await client.query("SELECT 1");
  client.release();
}

async function connectWithFallback() {
  const candidates = [];
  const primary = resolveDatabaseUrl();
  if (primary) candidates.push(primary);

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (process.env.SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  if (password && projectRef) {
    for (const url of buildSupabasePoolerUrlCandidates({ projectRef, password, region: process.env.SUPABASE_DB_REGION })) {
      if (!candidates.includes(url)) candidates.push(url);
    }
    if (process.env.USE_SUPABASE_DB_DIRECT === "true") {
      const direct = buildSupabaseDirectUrl({ projectRef, password });
      if (direct && !candidates.includes(direct)) candidates.push(direct);
    }
  }

  if (!candidates.length) {
    throw new Error("Supabase database URL could not be resolved from environment.");
  }

  let lastError;
  for (const connectionString of candidates) {
    try {
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
      await tryPool(connectionString);
      if (connectionString !== primary) {
        console.warn("Connected to Supabase Postgres using a fallback connection string.");
      }
      return;
    } catch (err) {
      lastError = err;
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
    }
  }
  throw lastError;
}

async function ensurePostgresSchema() {
  const p = getPool();
  const exists = await p.query("SELECT to_regclass('public.events') AS reg");
  if (exists.rows[0]?.reg) return;
  const schemaPath = path.join(__dirname, "schema.postgres.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await p.query(sql);
  console.log("Applied Postgres schema (schema.postgres.sql).");
}

export async function initPostgres() {
  if (!pool) await connectWithFallback();
  await ensurePostgresSchema();
  await alignPostgresSchema(pool);
  console.log("Supabase Postgres database ready.");
}

export function getPgDb() {
  const p = getPool();
  return {
    prepare(sql) {
      const pgSql = toPostgresSql(sql);
      return {
        async get(...params) {
          const result = await p.query(pgSql, params);
          return result.rows[0];
        },
        async all(...params) {
          const result = await p.query(pgSql, params);
          return result.rows;
        },
        async run(...params) {
          const result = await p.query(pgSql, params);
          return { changes: result.rowCount ?? 0 };
        },
      };
    },
    async exec(sql) {
      const statements = sql
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await p.query(toPostgresSql(statement));
      }
    },
  };
}

export async function closePostgres() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
