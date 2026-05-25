# Christ Embassy — Local Church Management System

Production-ready church management platform with a **React frontend**, **Express API**, and **SQLite** database. Data persists across restarts; each user signs in with email and password. Optional **SMTP** sends password-reset emails in production.

## Features

- **16 modules** with full CRUD where applicable
- **JWT auth** (default) or optional **Supabase Auth** when `USE_SUPABASE_AUTH=true`
- **Role-based access control** on API and UI
- **SQLite** — all church data stored locally in `data/church.db`
- **SMTP email** for password reset (falls back to dev token in API when unset)
- **File uploads** for media library (`uploads/`)
- **Notifications** for tasks, messages, and assignments

## Quick start

```bash
npm install
npm run db:reset    # create / reset database with seed data
npm run dev         # API on :3001 + Vite on :8080
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

Change `SEED_PASSWORD` in `.env` before running `npm run db:reset` in production.

## Optional Supabase Auth

To use Supabase for sign-in instead of local JWT:

1. Copy `.env.example` to `.env` and set:
   - `USE_SUPABASE_AUTH=true`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (required before build)
2. Run `npm run auth:sync` to create Supabase Auth accounts for seeded users.
3. In **Supabase → Authentication → URL Configuration**, add redirect URLs:
   - `http://localhost:8080/reset-password` (dev)
   - Your production URL + `/reset-password`

Church data remains in SQLite; Supabase is used only for authentication (and optionally file storage with `USE_SUPABASE_STORAGE=true`).

## Production deployment

```bash
cp .env.example .env
# Edit JWT_SECRET, SEED_PASSWORD, and optionally SMTP_*, APP_URL
npm install
npm run db:reset
npm run build
npm start
```

`npm start` serves the API and the built React app from `dist/` on port **3001** (or `PORT` from `.env`).

## Deploy on Render (Web Service)

One **Web Service** runs the Express API and serves the built React app from `dist/`. SQLite data lives on the service disk (use a persistent disk on Render for production).

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

4. **Environment** — add `JWT_SECRET`, `SEED_PASSWORD`, and optionally Supabase Auth vars (`USE_SUPABASE_AUTH`, `SUPABASE_*`, `VITE_SUPABASE_*`).

5. Click **Create Web Service** and wait for the build (~2–5 min).

Render sets `RENDER_EXTERNAL_URL` automatically — password-reset links use that if `APP_URL` is unset.

### Option B — Blueprint (`render.yaml`)

**New** → **Blueprint** → select repo. Render reads `render.yaml` and creates the Web Service. Fill in secret env vars when prompted.

### After deploy

- Health check: `GET https://your-app.onrender.com/api/health` → `{ "ok": true, "database": "sqlite" }`
- Login: `pastor@celcm.org` / your `SEED_PASSWORD` (default `ChangeMe123!`)
- Free tier sleeps when idle; first load may take ~30s.

## Project structure

```
server/           Express API + SQLite
  db.js           Schema
  seed.js         Seed data
  auth.js         JWT middleware
  rbac.js         Permissions
  index.js        Routes
src/
  pages/church/   All 16 page modules
  components/     Layout + UI
  context/        Auth state
  lib/api.ts      API client
data/             SQLite database (gitignored)
uploads/          Media files (gitignored)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev: frontend + API with hot reload |
| `npm run build` | Build React for production |
| `npm start` | Run production server |
| `npm run db:reset` | Reset and re-seed SQLite database |
| `npm run auth:sync` | Link church users to Supabase Auth (`auth.users`) |
