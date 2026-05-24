import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await client.auth.signInWithPassword({
  email: "pastor@celcm.org",
  password: process.env.SEED_PASSWORD || "ChangeMe123!",
});

if (error) {
  console.error("Login failed:", error.message, error.status);
  process.exit(1);
}
console.log("Login OK for", data.user?.email);
