import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env");
  console.error("Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI)");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  const res = await pool.query("SELECT COUNT(*)::int AS members FROM members");
  console.log("Connected to Supabase PostgreSQL successfully.");
  console.log(`Members in database: ${res.rows[0].members}`);
  process.exit(0);
} catch (err) {
  console.error("Connection failed:", err.message);
  console.error("\nCheck DATABASE_URL and DATABASE_SSL=true in .env");
  process.exit(1);
} finally {
  await pool.end();
}
