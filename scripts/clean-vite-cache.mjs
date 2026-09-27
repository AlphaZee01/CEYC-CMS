import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const rel of ["node_modules/.vite", "dev-dist"]) {
  const dir = path.join(root, ...rel.split("/"));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("Removed", dir);
  } catch {
    /* ignore */
  }
}
