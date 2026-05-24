import "dotenv/config";
import { initDatabase } from "../server/store.js";
import { syncAuthUsers } from "../server/auth-sync.js";
await initDatabase();
const resetPasswords = process.argv.includes("--reset-passwords");
const result = await syncAuthUsers({ resetPasswords });
console.log("Auth sync result:", result);
process.exit(0);
