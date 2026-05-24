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

## Deploy on Render

This app runs as a **single Web Service** (Express API + static Vite build). Use Supabase for Postgres and Auth in production.

### Option A — Blueprint (recommended)

1. Push this repo to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint** → connect the repo (uses `render.yaml`).
3. Set secret env vars when prompted (see table below).
4. After deploy, copy your service URL (e.g. `https://christ-embassy-lcm.onrender.com`).

### Option B — Manual Web Service

| Setting | Value |
|---------|--------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

### Required environment variables (Render)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase **Session pooler** URI (IPv4-friendly) |
| `DATABASE_SSL` | `true` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon key (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (server only) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` — needed at **build** time |
| `VITE_SUPABASE_ANON_KEY` | Same as anon key — needed at **build** time |
| `JWT_SECRET` | Random secret (Render can auto-generate) |
| `SEED_PASSWORD` | Initial user passwords if you re-seed |
| `APP_URL` | Your Render URL, e.g. `https://your-app.onrender.com` |

Optional: `SMTP_*` for password-reset email, `CHURCH_NAME`.

### Supabase after deploy

In **Authentication → URL Configuration**, add:

- `https://your-app.onrender.com/reset-password`
- `https://your-app.onrender.com` as site URL if needed

Run locally once (with production keys): `npm run auth:sync` to link church users to Supabase Auth.

### Notes

- Render’s filesystem is **ephemeral** — uploaded media in `uploads/` may not persist across deploys. Use Supabase Storage for production media if needed.
- Free tier services spin down after inactivity; first request may take ~30s.
- Health check: `GET /api/health` → `{ "ok": true }`

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
