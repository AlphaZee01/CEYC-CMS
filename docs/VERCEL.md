# Deploy on Vercel

This app deploys as a **Vite static frontend** plus a **single serverless API** (`api/index.js` → Express).

## Requirements

- **Supabase Postgres** — required (`USE_SUPABASE_DB=true`). SQLite does not work on Vercel.
- **Supabase Auth** — recommended (`USE_SUPABASE_AUTH=true` + `VITE_USE_SUPABASE_AUTH=true`).
- **Supabase Storage** — recommended for uploads (`USE_SUPABASE_STORAGE=true`). Local `uploads/` is ephemeral on serverless.

---

## Step 1 — Import from GitHub (recommended)

1. Open **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. **Import** repository **`AlphaZee01/CEYC-CMS`** (branch **`main`**).
3. Leave **Root Directory** empty (project root).
4. Vercel should detect **Vite** from `vercel.json`:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Do not deploy yet** — add environment variables first (Step 2).

---

## Step 2 — Environment variables

In the import screen (or later: **Project → Settings → Environment variables**), add **Production** and **Preview** for each row below.

Copy values from your local `.env` (same Supabase project as dev).

| Variable | Required | Notes |
|----------|----------|--------|
| `USE_SUPABASE_DB` | Yes | `true` |
| `SUPABASE_DB_PASSWORD` | Yes | Database password |
| `SUPABASE_PROJECT_REF` | Yes | e.g. `gilcsmnyeuxwuvpxowik` |
| `SUPABASE_DB_REGION` | Yes | e.g. `us-west-1` |
| `SUPABASE_POOLER_AWS_CLUSTER` | Often | `1` if pooler host is `aws-1-{region}` |
| `USE_SUPABASE_AUTH` | Yes | `true` |
| `VITE_USE_SUPABASE_AUTH` | Yes | `true` (baked into frontend at **build**) |
| `SUPABASE_URL` | Yes | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only — never expose in client |
| `VITE_SUPABASE_URL` | Yes | Same as `SUPABASE_URL` (build-time) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Same as anon key (build-time) |
| `USE_SUPABASE_STORAGE` | Recommended | `true` |
| `SUPABASE_BUCKET_MEDIA` | Recommended | `church-media` |
| `JWT_SECRET` | Yes | Long random string |
| `CHURCH_NAME` | Yes | Display name |
| `APP_URL` | After 1st deploy | `https://your-project.vercel.app` (no trailing slash) |

Optional: `SMTP_*` for password-reset email (otherwise reset may return a dev token in API responses).

Click **Deploy**.

---

## Step 3 — After the first deploy

1. Copy your production URL (e.g. `https://ceyc-cms.vercel.app`).
2. In Vercel → **Settings → Environment variables**, set **`APP_URL`** to that URL (Production + Preview).
3. **Deployments → … → Redeploy** (so the API and emails use the correct URL).
4. In **Supabase → Authentication → URL Configuration**:
   - **Site URL:** your `APP_URL`
   - **Redirect URLs:** add  
     `https://your-project.vercel.app/reset-password`  
     `https://your-project.vercel.app/**` (optional, for auth callbacks)
5. Test:
   - `https://your-project.vercel.app/api/health` → `{ "ok": true, "database": "supabase" }`
   - Open `/` and sign in (users from `npm run auth:sync` on your machine, same Supabase project).

---

## Step 4 — Data (one time, local machine)

Against the **same** Supabase database:

```bash
npm run db:seed
npm run auth:sync
```

---

## Option B — Vercel CLI (from your PC)

```bash
cd "path/to/CEYC CMS"
npx vercel login
npx vercel link
npm run vercel:env
npm run vercel:deploy
```

Then complete **Step 3** (`APP_URL` + Supabase redirect URLs + redeploy).

`npm run vercel:env` reads `.env` and pushes listed keys to Vercel (skips `PORT`, `SEED_PASSWORD`, `DATABASE_URL`).

---

## Troubleshooting

### Pushed to GitHub but Vercel did not deploy

1. **Confirm GitHub has the commit** — open [github.com/AlphaZee01/CEYC-CMS/commits/main](https://github.com/AlphaZee01/CEYC-CMS/commits/main). Production should track **`main`** on **`AlphaZee01/CEYC-CMS`** (not the old `the-style-edit` repo).
2. **Vercel → Project → Settings → Git**
   - **Connected Git Repository** = `AlphaZee01/CEYC-CMS`
   - **Production Branch** = `main`
   - If the project still points at **`the-style-edit`**, either **change the connected repo** or create a **new** Vercel project imported from **CEYC-CMS**.
3. **Deployments tab** — check the latest build for **Error** / **Canceled** (a failed deploy leaves the old site live).
4. **Manual redeploy** — Deployments → latest **Production** → **⋯ → Redeploy**, turn **off** “Use existing Build Cache”.
5. **Deploy Hook** (optional) — Settings → Git → **Deploy Hooks** → create hook for `main`, then `curl -X POST "<hook-url>"` after pushes.
6. **GitHub Actions fallback** — add repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (see `.github/workflows/vercel-production.yml`). Each push to `main` runs `vercel --prod` even if the Vercel Git webhook failed.
7. **CLI from your PC** — `npx vercel login` → `npx vercel link` (pick the CEYC CMS project) → `npm run vercel:deploy`.
8. **Browser still shows old UI** — hard refresh or clear site data; PWA may cache old `index-*.js` until a new deploy updates the service worker.

| Symptom | Fix |
|---------|-----|
| Login uses JWT / “Use Supabase Auth” error | Set `VITE_USE_SUPABASE_AUTH=true` and **redeploy** (Vite env vars need a new build). |
| `/api/*` 500 or 503 | Check Vercel **Functions** logs; verify `SUPABASE_DB_*` and pooler region/cluster. |
| Uploads fail | Use `USE_SUPABASE_STORAGE=true` and `SUPABASE_SERVICE_ROLE_KEY`. |
| Wrong church name on login | Set `CHURCH_NAME` or update **Settings** in the app; clear browser cache. |
| Health `database: unavailable` | DB password/ref/region wrong, or cold start still bootstrapping — retry `/api/health`. |
| Sign-in OK but “Server profile load timed out” | Usually cold start loading the full API; deploy latest `main` (uses fast `api/light-auth-me.js` for `GET /api/auth/me`). |
| Signup “Request timed out after 55s” | Deploy latest `main` (`api/light-auth-signup.js`). First signup after idle may still be slow if DB pooler is cold — retry once. |
| Chat sends but other user does not see messages live | Ensure `SUPABASE_SERVICE_ROLE_KEY` on Vercel; apply `supabase/migrations/20260930120000_realtime_chat_broadcast_policy.sql`; client must use Supabase Auth (`VITE_USE_SUPABASE_AUTH=true`). |

---

## Notes

- **Cold start** — `/api/public/config`, health, **`GET /api/auth/me`**, and **`GET /api/bootstrap`** use lightweight handlers so login and first app load are not blocked by importing the full Express app.
- **Background jobs** (overdue report emails) do not run on Vercel. Use [Vercel Cron](https://vercel.com/docs/cron-jobs) later if needed.
- **Function timeout:** 60s on the API (`vercel.json`).
- **Local dev** unchanged: `npm run dev` (Vite :8080 + API :3001).
