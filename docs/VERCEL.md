# Deploy on Vercel

This app deploys as a **Vite static frontend** plus a **single serverless API** (`api/index.js` → Express).

## Requirements

- **Supabase Postgres** — required (`USE_SUPABASE_DB=true`). SQLite does not work on Vercel.
- **Supabase Auth** — recommended (`USE_SUPABASE_AUTH=true`).
- **Supabase Storage** — recommended for uploads (`USE_SUPABASE_STORAGE=true`). Local `uploads/` is ephemeral on serverless.

## Option A — GitHub (recommended)

1. **Commit and push** your branch to GitHub (this repo: `AlphaZee01/the-style-edit`).
2. Open [vercel.com/new](https://vercel.com/new) → **Import** the repository.
3. **Root directory**: project root (where `vercel.json` lives).
4. Framework: **Vite** (auto-detected from `vercel.json`).
5. Add **Environment variables** (Production **and** Preview) — see table below.
6. **Deploy**. Copy the production URL (e.g. `https://ceyc-cms.vercel.app`).
7. In Vercel → **Settings → Environment variables**, set **`APP_URL`** to that URL (no trailing slash), then **Redeploy**.
8. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: your `APP_URL`
   - **Redirect URLs**: `https://your-app.vercel.app/reset-password`
9. Log in on production with a user from `npm run auth:sync` (run locally against the same Supabase project).

## Option B — Vercel CLI (from this machine)

```bash
npx vercel login
npx vercel link
npm run vercel:env
npx vercel --prod
```

Then set **`APP_URL`** on Vercel to the production URL and redeploy (step 7–8 above).

## Environment variables

Add these in the Vercel dashboard (Production + Preview):

| Variable | Notes |
|----------|--------|
| `USE_SUPABASE_DB` | `true` |
| `SUPABASE_DB_PASSWORD` | Database password |
| `SUPABASE_PROJECT_REF` | e.g. `gilcsmnyeuxwuvpxowik` |
| `SUPABASE_DB_REGION` | e.g. `us-west-1` |
| `SUPABASE_POOLER_AWS_CLUSTER` | `1` if pooler host is `aws-1-{region}` |
| `USE_SUPABASE_AUTH` | `true` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as anon key |
| `USE_SUPABASE_STORAGE` | `true` |
| `JWT_SECRET` | Random string (legacy JWT fallback) |
| `CHURCH_NAME` | Display name |
| `APP_URL` | `https://your-project.vercel.app` (your production URL) |

4. Deploy. After first deploy, in **Supabase → Authentication → URL Configuration**, add:
   - Site URL: `https://your-project.vercel.app`
   - Redirect URLs: `https://your-project.vercel.app/reset-password`

5. One-time data: run locally against the same Supabase DB:
   ```bash
   npm run db:seed
   npm run auth:sync
   ```

## Notes

- **Background jobs** (overdue report emails) do not run on Vercel. Use [Vercel Cron](https://vercel.com/docs/cron-jobs) or an external scheduler calling an API route if you add one later.
- **Function timeout**: default 60s on the API (`vercel.json`). Heavy reports may need Pro limits or optimization.
- **Local dev** is unchanged: `npm run dev` (Vite + Node API on :3001).
