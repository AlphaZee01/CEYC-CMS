/**
 * Create github.com/AlphaZee01/CEYC-CMS (or GITHUB_REPO_NAME) and push current branch to main.
 *
 * Requires a classic or fine-grained PAT with repo scope:
 *   set GITHUB_TOKEN=ghp_...   (cmd)
 *   $env:GITHUB_TOKEN="ghp_..." (PowerShell)
 *
 * Usage: node scripts/create-github-repo.mjs
 */
import "dotenv/config";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.GITHUB_TOKEN?.trim();
const owner = process.env.GITHUB_OWNER?.trim() || "AlphaZee01";
const repoName = process.env.GITHUB_REPO_NAME?.trim() || "CEYC-CMS";
const privateRepo = process.env.GITHUB_REPO_PRIVATE === "true";

if (!token) {
  console.error(`
Missing GITHUB_TOKEN.

1. GitHub → Settings → Developer settings → Personal access tokens → Generate (repo scope).
2. In this folder, run:

   PowerShell:
     $env:GITHUB_TOKEN="your_token_here"
     node scripts/create-github-repo.mjs

   Or create the repo manually (no token):
     https://github.com/new?name=${repoName}&description=Christ+Embassy+Church+CMS

   Then run:
     git remote rename origin the-style-edit
     git remote add origin https://github.com/${owner}/${repoName}.git
     git push -u origin HEAD:main
`);
  process.exit(1);
}

const api = `https://api.github.com/repos/${owner}/${repoName}`;
let exists = false;
{
  const check = await fetch(api, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  exists = check.status === 200;
}

if (!exists) {
  const create = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: repoName,
      description: "Christ Embassy Airport City Jesus Brand — church management system",
      private: privateRepo,
      auto_init: false,
    }),
  });
  const body = await create.json().catch(() => ({}));
  if (!create.ok) {
    if (create.status === 403) {
      console.error(`
GitHub returned 403 — this token cannot create repositories (common with fine-grained PATs).

1. Open (while signed in): https://github.com/new?name=${repoName}&description=Christ+Embassy+Church+CMS
   Create the repo empty (no README).
2. Re-run: npm run repo:github

Or use a classic personal access token with the "repo" scope instead.
`);
    } else {
      console.error("GitHub API create failed:", create.status, body.message || body);
    }
    process.exit(1);
  }
  console.log("Created:", body.html_url);
} else {
  console.log("Repo already exists:", `https://github.com/${owner}/${repoName}`);
}

const cloneUrl = `https://github.com/${owner}/${repoName}.git`;
const authUrl = `https://x-access-token:${token}@github.com/${owner}/${repoName}.git`;

function git(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
}

try {
  const remotes = execSync("git remote", { cwd: root, encoding: "utf8" });
  if (remotes.includes("the-style-edit")) {
    /* already renamed */
  } else if (remotes.includes("origin")) {
    git("git remote rename origin the-style-edit");
  }
  if (!execSync("git remote", { cwd: root, encoding: "utf8" }).includes("origin")) {
    git(`git remote add origin ${cloneUrl}`);
  } else {
    git(`git remote set-url origin ${cloneUrl}`);
  }
  git(`git push -u ${authUrl} HEAD:main`);
  console.log("\nDone. Open:", `https://github.com/${owner}/${repoName}`);
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
