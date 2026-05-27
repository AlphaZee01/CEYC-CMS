import pg from "pg";
import { toPostgresSql } from "./sql-dialect.js";
import { resolveDatabaseUrl } from "./supabase-db-url.js";

let pool;

function getPool() {
  if (!pool) {
    const connectionString = resolveDatabaseUrl();
    if (!connectionString) {
      throw new Error(
        "Supabase database not configured. Set DATABASE_URL or SUPABASE_DB_PASSWORD + SUPABASE_PROJECT_REF (and USE_SUPABASE_DB=true)."
      );
    }
    pool = new pg.Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

export async function initPostgres() {
  const client = await getPool().connect();
  try {
    await client.query("SELECT 1");
    console.log("Supabase Postgres database ready.");
  } finally {
    client.release();
  }
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
