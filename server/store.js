import { assertDatabaseConfigured } from "./supabase-db-url.js";
import { getPgDb, initPostgres, closePostgres } from "./pg-store.js";

export async function initDatabase() {
  assertDatabaseConfigured();
  await initPostgres();
}

export async function dbGet(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}

export async function dbAll(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}

export async function dbRun(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}

export async function dbExec(sql) {
  return getDb().exec(sql);
}

/** Unified DB accessor — prepare().get/all/run return Promises */
export function getDb() {
  return getPgDb();
}

export async function closeDatabase() {
  await closePostgres();
}
