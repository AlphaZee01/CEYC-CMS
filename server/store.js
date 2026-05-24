import Database from "better-sqlite3";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "church.db");

export const usePostgres = !!process.env.DATABASE_URL;

let sqliteDb;
let pgPool;

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function adaptSql(sql) {
  if (!usePostgres) return sql;
  return sql
    .replace(/datetime\('now'\)/gi, "NOW()")
    .replace(/expires_at > datetime\('now'\)/gi, "expires_at > NOW()")
    .replace(/date\('now'\)/gi, "CURRENT_DATE::text")
    .replace(/date\('now', '([^']+)'\)/gi, "(CURRENT_DATE + interval '$1')::text")
    .replace(
      /INSERT OR IGNORE INTO member_departments \(member_id, department_id\) VALUES \(\?, \?\)/gi,
      "INSERT INTO member_departments (member_id, department_id) VALUES (?, ?) ON CONFLICT DO NOTHING"
    )
    .replace(/\bactive\s*=\s*1\b/gi, "active IS TRUE")
    .replace(/\bread\s*=\s*1\b/gi, "read IS TRUE")
    .replace(/\bused\s*=\s*0\b/gi, "used IS FALSE")
    .replace(/\bbroadcast\s*=\s*1\b/gi, "broadcast IS TRUE")
    .replace(/\bpinned\s*=\s*1\b/gi, "pinned IS TRUE")
    .replace(/\bis_newcomer\s*=\s*1\b/gi, "is_newcomer = TRUE")
    .replace(/strftime\('%Y-%m', joined_at\)/gi, "to_char(joined_at::date, 'YYYY-MM')");
}

export async function initDatabase() {
  if (usePostgres) {
    pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
    const client = await pgPool.connect();
    try {
      const schema = fs.readFileSync(path.join(__dirname, "schema.postgres.sql"), "utf8");
      await client.query(schema);
      await client.query(`
        ALTER TABLE attendance_members ADD COLUMN IF NOT EXISTS is_newcomer BOOLEAN DEFAULT FALSE;
        ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
        CREATE TABLE IF NOT EXISTS attendance_guests (
          id TEXT PRIMARY KEY,
          record_id TEXT NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          contact TEXT
        );
        ALTER TABLE finances ADD COLUMN IF NOT EXISTS purpose_type TEXT;
        ALTER TABLE finances ADD COLUMN IF NOT EXISTS purpose_id TEXT;
        ALTER TABLE finances ADD COLUMN IF NOT EXISTS purpose_label TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      `);
    } finally {
      client.release();
    }
    console.log("PostgreSQL database connected.");
    return;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const { initSchema } = await import("./db.js");
  initSchema();
  console.log("SQLite database ready.");
}

export async function dbGet(sql, params = []) {
  const q = adaptSql(sql);
  if (usePostgres) {
    const res = await pgPool.query(toPg(q), params);
    return res.rows[0];
  }
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  return sqliteDb.prepare(q).get(...params);
}

export async function dbAll(sql, params = []) {
  const q = adaptSql(sql);
  if (usePostgres) {
    const res = await pgPool.query(toPg(q), params);
    return res.rows;
  }
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  return sqliteDb.prepare(q).all(...params);
}

export async function dbRun(sql, params = []) {
  const q = adaptSql(sql);
  if (usePostgres) {
    await pgPool.query(toPg(q), params);
    return;
  }
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  sqliteDb.prepare(q).run(...params);
}

export async function dbExec(sql) {
  if (usePostgres) {
    await pgPool.query(sql);
    return;
  }
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  sqliteDb.exec(sql);
}

/** Unified DB accessor — prepare().get/all/run return Promises (SQLite + Postgres) */
export function getDb() {
  if (!usePostgres) {
    if (!sqliteDb) {
      sqliteDb = new Database(DB_PATH);
      sqliteDb.pragma("journal_mode = WAL");
      sqliteDb.pragma("foreign_keys = ON");
    }
    const sync = sqliteDb;
    return {
      prepare(sql) {
        const q = sql;
        return {
          get: (...params) => Promise.resolve(sync.prepare(q).get(...params)),
          all: (...params) => Promise.resolve(sync.prepare(q).all(...params)),
          run: (...params) => Promise.resolve(sync.prepare(q).run(...params)),
        };
      },
      exec: (sql) => Promise.resolve(sync.exec(sql)),
    };
  }
  return {
    prepare(sql) {
      const q = adaptSql(sql);
      return {
        get: (...params) => dbGet(q, params),
        all: (...params) => dbAll(q, params),
        run: (...params) => dbRun(q, params),
      };
    },
    exec: (sql) => dbExec(sql),
  };
}

export function resetSqliteConnection() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

export async function closeDatabase() {
  if (pgPool) await pgPool.end();
  if (sqliteDb) sqliteDb.close();
}
