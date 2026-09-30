import { initDatabase } from "../server/store.js";

let dbReadyPromise = null;

export function ensureDatabase() {
  if (!dbReadyPromise) {
    dbReadyPromise = initDatabase().catch((err) => {
      dbReadyPromise = null;
      throw err;
    });
  }
  return dbReadyPromise;
}
