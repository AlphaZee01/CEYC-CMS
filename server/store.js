import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { useSupabaseDatabase } from "./sql-dialect.js";
import { getPgDb, initPostgres, closePostgres } from "./pg-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "church.db");

let sqliteDb;

export async function initDatabase() {
  if (useSupabaseDatabase()) {
    await initPostgres();
    return;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const { initSchema } = await import("./db.js");
  initSchema();
  console.log("SQLite database ready.");
}

export async function dbGet(sql, params = []) {
  if (useSupabaseDatabase()) return getDb().prepare(sql).get(...params);
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  return sqliteDb.prepare(sql).get(...params);
}

export async function dbAll(sql, params = []) {
  if (useSupabaseDatabase()) return getDb().prepare(sql).all(...params);
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  return sqliteDb.prepare(sql).all(...params);
}

export async function dbRun(sql, params = []) {
  if (useSupabaseDatabase()) return getDb().prepare(sql).run(...params);
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  sqliteDb.prepare(sql).run(...params);
}

export async function dbExec(sql) {
  if (useSupabaseDatabase()) return getDb().exec(sql);
  if (!sqliteDb) sqliteDb = new Database(DB_PATH);
  sqliteDb.exec(sql);
}

/** Unified DB accessor — prepare().get/all/run return Promises */
export function getDb() {
  if (useSupabaseDatabase()) return getPgDb();
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

export function resetSqliteConnection() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

export async function closeDatabase() {
  if (useSupabaseDatabase()) {
    await closePostgres();
    return;
  }
  if (sqliteDb) sqliteDb.close();
}
