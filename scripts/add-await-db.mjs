import fs from "fs";
import path from "path";

const files = [
  "server/index.js",
  "server/auth.js",
  "server/seed.js",
  "server/jobs.js",
  "server/audit.js",
  "server/routes-complete.js",
  "server/rbac.js",
];

for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes("db.prepare")) continue;

  s = s.replace(/from "\.\/db\.js"/g, 'from "./store.js"');
  s = s.replace(/from '\.\/db\.js'/g, "from './store.js'");
  s = s.replace(/import \{ getDb, initSchema/g, "import { getDb");
  s = s.replace(/import \{ getDb, memberToJson/g, "import { getDb, memberToJson");
  s = s.replace(/import \{ getDb \} from "\.\/db\.js"/g, 'import { getDb } from "./store.js"');

  // Assignment from db.prepare().get/all
  s = s.replace(
    /(^|\n)(\s*)(const|let) (\w+) = db\.prepare\(/gm,
    "$1$2$3 $4 = await db.prepare("
  );
  s = s.replace(
    /(^|\n)(\s*)return db\.prepare\(/gm,
    "$1$2return await db.prepare("
  );
  // Standalone db.prepare().run without const
  s = s.replace(
    /(^|\n)(\s*)(?!await )db\.prepare\(([\s\S]*?)\)\.run\(/gm,
    (m, a, sp, inner) => `${a}${sp}await db.prepare(${inner}).run(`
  );
  // .all( on next line patterns - db.prepare(...)\n    .all
  s = s.replace(/db\.prepare\(([^)]+)\)\s*\.all\(/g, "await db.prepare($1).all(");
  s = s.replace(/db\.prepare\(([^)]+)\)\s*\.get\(/g, "await db.prepare($1).get(");

  // Double await fix
  s = s.replace(/await await /g, "await ");

  fs.writeFileSync(file, s);
  console.log("Updated", file);
}
