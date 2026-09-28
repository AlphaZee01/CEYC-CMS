# Christ Embassy — Local Church Management System

Production-ready church management platform with a **React frontend**, **Express API**, and **Supabase Postgres** database. Data persists in your Supabase project; each user signs in with email and password. Optional **SMTP** sends password-reset emails in production.

## Features

- **16 modules** with full CRUD where applicable
- **JWT auth** (default) or optional **Supabase Auth** when `USE_SUPABASE_AUTH=true`
- **Role-based access control** on API and UI
- **Supabase Postgres** — all church data in your Supabase database
- **SMTP email** for password reset (falls back to dev token in API when unset)
- **File uploads** for media library (`uploads/`)
- **Notifications** for tasks, messages, and assignments

## GitHub repository

This project is intended to live in **`AlphaZee01/CEYC-CMS`**. Older pushes may still be on `the-style-edit` branch `cursor/church-production-system-90cb`.

**Create the new repo and push (one time):**

1. Create a **classic** [personal access token](https://github.com/settings/tokens?type=beta) with **repo** scope (fine-grained tokens often cannot *create* new repos).
2. In PowerShell, from this folder:

```powershell
$env:GITHUB_TOKEN="ghp_your_token_here"
npm run repo:github
```

That creates **CEYC-CMS**, keeps the old remote as `the-style-edit`, sets `origin` to the new repo, and pushes **`main`**.

**Manual alternative:** [Create an empty repo named CEYC-CMS](https://github.com/new?name=CEYC-CMS&description=Christ+Embassy+Church+CMS), then:

```bash
git remote rename origin the-style-edit
git remote add origin https://github.com/AlphaZee01/CEYC-CMS.git
git push -u origin HEAD:main
```

## Quick start

1. Copy `.env.example` to `.env` and configure Supabase Postgres:
   - Set `USE_SUPABASE_DB=true`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, and `SUPABASE_DB_REGION` (or paste `DATABASE_URL` from the Supabase dashboard).
2. Verify connection: `npm run db:test:pg`
3. Install and run:

```bash
npm install
npm run db:seed      # seed empty database (skipped if members already exist)
npm run auth:sync    # link seeded users to Supabase Auth (when USE_SUPABASE_AUTH=true)
npm run dev          # API on :3001 + Vite on :8080
```

Open **http://localhost:8080** and sign in.

### Default accounts (password: `ChangeMe123!`)

| Email | Role |
|-------|------|
| pastor@celcm.org | Senior Pastor |
| grace@celcm.org | Associate Pastor |
| admin@celcm.org | Admin |
| samuel@celcm.org | Fellowship Leader |
| chioma@celcm.org | Cell Leader |
| member1@celcm.org | Church Member |

Change `SEED_PASSWORD` in `.env` before seeding production data.

## Optional Supabase Auth

To use Supabase for sign-in instead of local JWT:

1. In `.env`, set:
   - `USE_SUPABASE_AUTH=true`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (required before build)
2. Run `npm run auth:sync` to create Supabase Auth accounts for seeded users.
3. In **Supabase → Authentication → URL Configuration**, add redirect URLs:
   - `http://localhost:8080/reset-password` (dev)
   - Your production URL + `/reset-password`

Church data lives in Supabase Postgres; Supabase Auth handles sign-in (and optionally file storage with `USE_SUPABASE_STORAGE=true`).

## Production deployment

```bash
cp .env.example .env
# Edit JWT_SECRET, SEED_PASSWORD, Supabase DB + auth vars, and optionally SMTP_*, APP_URL
npm install
npm run db:seed
npm run auth:sync
npm run build
npm start
```

`npm start` serves the API and the built React app from `dist/` on port **3001** (or `PORT` from `.env`).

## Deploy on Vercel

Frontend + API as a **serverless** deployment. Requires **Supabase Postgres** (and recommended: Supabase Auth + Storage).

See **[docs/VERCEL.md](docs/VERCEL.md)** for environment variables, Supabase redirect URLs, and seeding.

## Deploy on Render (Web Service)

One **Web Service** runs the Express API and serves the built React app from `dist/`. Church data is stored in **Supabase Postgres** (not on the Render disk).

### Step-by-step — New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Connect your GitHub repo.
3. Settings:

| Field | Value |
|-------|--------|
| **Runtime** | Node |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

4. **Environment** — add `JWT_SECRET`, `SEED_PASSWORD`, Supabase database vars (`USE_SUPABASE_DB`, `SUPABASE_DB_*` or `DATABASE_URL`), and optionally Supabase Auth (`USE_SUPABASE_AUTH`, `SUPABASE_*`, `VITE_SUPABASE_*`).

5. Click **Create Web Service** and wait for the build (~2–5 min).

Render sets `RENDER_EXTERNAL_URL` automatically — password-reset links use that if `APP_URL` is unset.

### Option B — Blueprint (`render.yaml`)

**New** → **Blueprint** → select repo. Render reads `render.yaml` and creates the Web Service. Fill in secret env vars when prompted.

### After deploy

- Health check: `GET https://your-app.onrender.com/api/health` → `{ "ok": true, "database": "supabase" }`
- Login: `pastor@celcm.org` / your `SEED_PASSWORD` (default `ChangeMe123!`)
- Free tier sleeps when idle; first load may take ~30s.

## Project structure

```
server/           Express API + Supabase Postgres
  store.js        Database access (pg)
  pg-store.js     Connection pool + schema bootstrap
  seed.js         Seed data
  auth.js         JWT / Supabase auth middleware
  rbac.js         Permissions
  index.js        Routes
src/
  pages/church/   All 16 page modules
  components/     Layout + UI
  context/        Auth state
  lib/api.ts      API client
uploads/          Media files (gitignored)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev: frontend + API with hot reload |
| `npm run build` | Build React for production |
| `npm start` | Run production server |
| `npm run db:seed` | Seed empty Supabase database |
| `npm run db:test:pg` | Test Postgres connection |
| `npm run auth:sync` | Link church users to Supabase Auth (`auth.users`) |
