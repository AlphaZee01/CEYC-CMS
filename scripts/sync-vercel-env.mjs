/**
 * Push variables from .env to the linked Vercel project (production + preview).
 * Usage: node scripts/sync-vercel-env.mjs
 * Requires: vercel CLI logged in and project linked (.vercel/project.json).
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

const SKIP = new Set(["PORT", "SEED_PASSWORD", "DATABASE_URL"]);

const VERCEL_KEYS = [
  "JWT_SECRET",
  "APP_URL",
  "CHURCH_NAME",
  "USE_SUPABASE_DB",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_DB_REGION",
  "SUPABASE_POOLER_AWS_CLUSTER",
  "USE_SUPABASE_AUTH",
  "VITE_USE_SUPABASE_AUTH",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "USE_SUPABASE_STORAGE",
  "SUPABASE_BUCKET_MEDIA",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_NOTIFY",
];

function parseEnvFile(file) {
  if (!fs.existsSync(file)) {
    console.error("Missing .env at", file);
    process.exit(1);
  }
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function vercelEnvRemove(name, target) {
  spawnSync("npx", ["vercel", "env", "rm", name, target, "--yes"], {
    cwd: root,
    stdio: "ignore",
    shell: true,
  });
}

function vercelEnvAdd(name, value, target) {
  const r = spawnSync("npx", ["vercel", "env", "add", name, target], {
    cwd: root,
    input: value,
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    console.error(`Failed to set ${name} (${target}):`, r.stderr || r.stdout);
    process.exit(1);
  }
}

const parsed = parseEnvFile(envPath);
const keys = VERCEL_KEYS.filter((k) => parsed[k] != null && parsed[k] !== "" && !SKIP.has(k));

if (!keys.length) {
  console.error("No Vercel env keys found in .env");
  process.exit(1);
}

console.log(`Syncing ${keys.length} variables to Vercel (production + preview)...`);

for (const key of keys) {
  const value = parsed[key];
  for (const target of ["production", "preview"]) {
    vercelEnvRemove(key, target);
    vercelEnvAdd(key, value, target);
  }
  console.log("  ok", key);
}

console.log("Done. Redeploy for changes to apply: npx vercel --prod");
