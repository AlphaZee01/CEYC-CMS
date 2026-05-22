# Christ Embassy — Local Church Management System

Production-ready church management platform with a **React frontend**, **Express API**, and **SQLite database**. Data persists across restarts; each user signs in with email and password.

## Features

- **16 modules** with full CRUD where applicable
- **JWT authentication** (real login, not a demo role switcher)
- **Role-based access control** on API and UI
- **SQLite** database (`data/church.db`)
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

## Production deployment

```bash
cp .env.example .env
# Edit JWT_SECRET and SEED_PASSWORD
npm install
npm run db:reset
npm run build
npm start
```

`npm start` serves the API and the built React app from `dist/` on port **3001** (or `PORT` from `.env`).

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
| `npm run db:reset` | Reset and re-seed database |
