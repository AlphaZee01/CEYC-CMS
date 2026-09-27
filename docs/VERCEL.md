# Deploy on Vercel

This app deploys as a **Vite static frontend** plus a **single serverless API** (`api/index.js` → Express).

## Requirements

- **Supabase Postgres** — required (`USE_SUPABASE_DB=true`). SQLite does not work on Vercel.
- **Supabase Auth** — recommended (`USE_SUPABASE_AUTH=true`).
- **Supabase Storage** — recommended for uploads (`USE_SUPABASE_STORAGE=true`). Local `uploads/` is ephemeral on serverless.

## Setup

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com/new).
2. Framework preset: **Vite** (from `vercel.json`).
3. Add **Environment variables** (Production + Preview):

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
