import "dotenv/config";
import { initDatabase, usePostgres } from "./store.js";
import { seedDatabase } from "./seed.js";

if (!usePostgres) {
  console.error("Set DATABASE_URL to a PostgreSQL connection string (e.g. Supabase).");
  process.exit(1);
}

const reset = process.argv.includes("--reset");
await initDatabase();
await seedDatabase(reset);
console.log("PostgreSQL migrated and seeded.");
