# Christ Embassy — Local Church Management System

Production-ready church management platform with a **React frontend**, **Express API**, and **SQLite** (default) or **PostgreSQL / Supabase** database. Data persists across restarts; each user signs in with email and password. Optional **SMTP** sends password-reset emails in production.

## Features

- **16 modules** with full CRUD where applicable
- **Supabase Auth** when `DATABASE_URL` points to Supabase (JWT sessions via Supabase; legacy JWT for local SQLite)
- **Role-based access control** on API and UI
- **Supabase PostgreSQL** (or local SQLite) — all church data stored in Postgres on Supabase
- **SMTP email** for password reset (falls back to dev token in API when unset)
- **File uploads** for media library (`uploads/`)
- **Notifications** for tasks, messages, and assignments

## Supabase setup

This app uses **Supabase PostgreSQL** for all church data and **Supabase Auth** for sign-in when `DATABASE_URL` is set.

**Project:** [CEYC CMS](https://supabase.com/dashboard/project/gilcsmnyeuxwuvpxowik) (`gilcsmnyeuxwuvpxowik`)

### Environment variables

From **Project Settings → API**, add to `.env`:

| Variable | Where |
|----------|--------|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**server only — never expose to frontend**) |

### Connection string

From **Project Settings → Database**, copy the URI and put your password in `.env`:

```
postgresql://postgres:[YOUR-PASSWORD]@db.gilcsmnyeuxwuvpxowik.supabase.co:5432/postgres
```

| Setting  | Value |
|----------|-------|
| Host     | `db.gilcsmnyeuxwuvpxowik.supabase.co` |
| Port     | `5432` |
| Database | `postgres` |
| User     | `postgres` |

Also set `DATABASE_SSL=true` in `.env`.

**IPv4 networks:** The direct host (`db.*.supabase.co`) is not IPv4 compatible. Use the **Session pooler** instead:

```
postgresql://postgres.gilcsmnyeuxwuvpxowik:[YOUR-PASSWORD]@aws-1-us-west-1.pooler.supabase.com:5432/postgres
```

Copy the exact pooler URI from **Project Settings → Database → Connection pooling → Session mode**. This project uses `aws-1-us-west-1` (not `aws-0`).

If your password contains special characters (`&`, `@`, `#`, etc.), URL-encode them in the connection string (`&` → `%26`).

### Verify and run

```bash
npm run db:test:pg   # should print "Connected to Supabase PostgreSQL successfully"
npm run auth:sync    # creates Supabase Auth accounts for church users (needs SERVICE_ROLE_KEY)
npm run dev
```

In **Authentication → URL Configuration**, add redirect URLs:

- `http://localhost:8080/reset-password` (dev)
- Your production URL + `/reset-password`

On server start, users without a linked `auth_user_id` are synced automatically when `SUPABASE_SERVICE_ROLE_KEY` is set.

Schema and seed data are on Supabase. Default login: `pastor@celcm.org` / `ChangeMe123!`

To re-seed: `npm run db:reset:pg`

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

## Production deployment

```bash
cp .env.example .env
# Edit JWT_SECRET, SEED_PASSWORD, and optionally:
#   DATABASE_URL=postgresql://...   (Supabase connection string)
#   DATABASE_SSL=true
#   SMTP_HOST, SMTP_USER, SMTP_PASS, APP_URL
npm install
npm run db:reset          # SQLite
# npm run db:reset:pg     # PostgreSQL (requires DATABASE_URL)
npm run build
npm start
```

`npm start` serves the API and the built React app from `dist/` on port **3001** (or `PORT` from `.env`).

## Deploy on Render (Web Service)

One **Web Service** runs the Express API and serves the built React app from `dist/`. Database and auth stay on **Supabase**.

### Step-by-step — New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Connect GitHub repo **AlphaZee01/the-style-edit** (or your fork).
3. Branch: `cursor/church-production-system-90cb` (or `main` if merged).
4. Settings:

| Field | Value |
|-------|--------|
| **Name** | `christ-embassy-lcm` (or your choice) |
| **Runtime** | Node |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

5. **Environment** — add these (copy from your local `.env`):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase **Session pooler** URI |
| `DATABASE_SSL` | `true` |
| `SUPABASE_URL` | `https://gilcsmnyeuxwuvpxowik.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | same as anon key |
| `JWT_SECRET` | random string (Generate in Render) |

`VITE_*` vars must be set **before the first build** so Supabase auth is baked into the frontend.

6. Click **Create Web Service** and wait for the build (~2–5 min).
7. Open your URL: `https://christ-embassy-lcm.onrender.com` (name varies).
8. In **Supabase → Authentication → URL Configuration**, add:
   - Site URL: your Render URL
   - Redirect: `https://your-app.onrender.com/reset-password`

Render sets `RENDER_EXTERNAL_URL` automatically — password-reset links use that if `APP_URL` is unset.

### Option B — Blueprint (`render.yaml`)

**New** → **Blueprint** → select repo. Render reads `render.yaml` and creates the Web Service. Fill in secret env vars when prompted.

### After deploy

- Health check: `GET https://your-app.onrender.com/api/health` → `{ "ok": true }`
- Login: `pastor@celcm.org` / your `SEED_PASSWORD` (default `ChangeMe123!`)
- Free tier sleeps when idle; first load may take ~30s.
- Logo and media uploads are stored in **Supabase Storage** on production when `SUPABASE_SERVICE_ROLE_KEY` is set. Re-upload the logo in **Settings** if an old `/uploads/…` URL returns 404 after deploy.

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
| `npm run db:migrate:pg` | Apply Postgres schema (requires `DATABASE_URL`) |
| `npm run db:reset:pg` | Reset and seed PostgreSQL |
| `npm run auth:sync` | Link church users to Supabase Auth (`auth.users`) |
