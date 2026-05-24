# Changelog

## [2026-05-24] — Mobile logo and faster sign-in

### Fixed
- **Logo on mobile**: absolute logo URLs from the request host; white backing on header/login images so light logos show on the gradient; larger stacked login logo; cached branding shows immediately after sign-in
- **Slow sign-in**: removed full-page reload after login (SPA navigation); deduped `/auth/me` calls; bootstrap loads member departments in one query instead of N+1

## [2026-05-24] — Login page church branding

### Changed
- **Login page** shows church **name**, **logo**, and **tagline** from Settings (via public `/api/public/branding` — no sign-in required)

## [2026-05-24] — Reports page empty state fix

### Fixed
- **Reports & Analytics** no longer stays blank when one API call fails — single `/reports/analytics` endpoint returns growth, departments, and attendance trends
- **Postgres crash** on `/api/departments` (missing `await` on nested query) — this was killing the API server and breaking all pages including Reports
- Empty-state messages when there is no attendance or department data yet; loading and error banners on Reports page
- Attendance trends now include service attendance and look back 12 months (was cell-only, 60 days)

## [2026-05-24] — Persist page on reload

### Fixed
- **Navigation**: active page is synced to the URL (`/app/members`, `/app/cells`, etc.) so browser refresh stays on the current page instead of resetting to Dashboard

## [2026-05-24] — Add members to cells

### Added
- **Cells page**: **Add members** on each cell — multi-select modal to assign/remove members; quick remove from expanded member list
- **API** `PUT /api/cells/:id/members` — bulk sync of cell membership (sets `cell_id` + fellowship)

## [2026-05-24] — Dev server log noise

### Fixed
- **Realtime broadcast**: server chat push uses `channel.httpSend()` instead of deprecated `send()` REST fallback
- **SMTP placeholder**: `smtp.example.com` in `.env` is treated as unconfigured (no failed send attempts on startup/jobs)

## [2026-05-24] — Console warnings cleanup

### Fixed
- **Chat thread 500**: Postgres boolean comparisons (`broadcast = 0`, `read = 1`, etc.) now use `= TRUE/FALSE` instead of integer `0/1`
- **Duplicate React keys** on pastor dashboard guest list (`key={g.name}` → unique guest `id`)
- React Router v7 future-flag warnings (`v7_startTransition`, `v7_relativeSplatPath`)

## [2026-05-24] — Logo uploads on Render & PWA meta fix

### Fixed
- **Logo 404 on Render**: uploads go to **Supabase Storage** (`church-assets` bucket) when `SUPABASE_SERVICE_ROLE_KEY` is set; media uploads use the same path
- **Broken logo images** fall back to church initials in the header/sidebar
- Deprecated PWA meta warning: added `mobile-web-app-capable`; cleaned stale OG tags in `index.html`

### Added
- **Logo URL** field in Settings (paste a public `https://` image link)

## [2026-05-24] — Church branding in header

### Changed
- **Top header** always shows church **logo** and **full name** (plus tagline when set in Settings), on every page including Chat
- Sidebar brand block uses the same logo and name from settings

## [2026-05-24] — Independent desktop sidebar scroll

### Changed
- **Desktop layout**: sidebar nav and main content scroll independently (fixed viewport height, separate overflow regions)
- Subtle thin scrollbar on sidebar nav at `lg` breakpoint

## [2026-05-24] — Render Web Service deploy guide

### Changed
- README **Deploy on Render (Web Service)** — step-by-step manual Web Service setup
- `render.yaml` — `npm ci`, auto-deploy on commit
- `RENDER_EXTERNAL_URL` used automatically for password-reset links on Render

## [2026-05-24] — Mobile bottom nav & Render deployment

### Added
- **Floating mobile bottom nav** — frosted pill bar, primary active tab, clearer labels (Home, Chat, News), Attendance prioritized in quick nav
- **`render.yaml`** Blueprint for one-click deploy on Render
- **`GET /api/health`** for Render health checks
- **`.node-version`** and `engines.node` for consistent Node on Render
- README **Deploy on Render** section with env var checklist

### Changed
- Express sets `trust proxy` in production (Render / reverse proxies)
- Chat footer padding aligned with taller floating nav

## [2026-05-24] — API server startup reliability

### Fixed
- **Sign-in / ECONNREFUSED**: API server now reports a clear message when port 3001 is already in use instead of crashing silently under `node --watch`
- Startup sample-data steps (newcomers, birthdays, auth sync) no longer block the API if a Postgres query fails
- Postgres-safe boolean checks in newcomer sample seed (`is_newcomer IS TRUE`)
- **`/api/attendance/trends`**: fixed Postgres `GROUP BY` error (`c.name` must be grouped) that crashed the API when opening Attendance

## [2026-05-24] — Attendance calendar view

### Added
- **Calendar-first Attendance page**: default tab shows a month calendar with total present count on each day that has events
- **Day event list**: selecting a date lists all cell meetings and services with present/absent totals
- **Event detail**: tapping an event shows every member grouped by fellowship and cell with present/absent badges

### Changed
- Replaced **Event History** tab with **Calendar** as the first Attendance tab

## [2026-05-24] — Attendance records by member

### Added
- **Attendance page tabs**: Record, Event History, and By Member
- **Event History**: expand any event to see every present, absent, and guest name
- **By Member**: searchable list of all members with individual attendance logs, present/absent counts, and rate
- Attendance tabs reordered: **Event History** and **By Member** first; **Add New Attendance** on the far right (renamed from Record)

## [2026-05-24] — Birthday celebrants on pastor dashboard

### Added
- **`date_of_birth`** on members (schema migration + member profile edit)
- **Birthdays — this month** section on pastor/admin dashboard with celebrant list
- **Birthday browser modal** — tap the section to browse celebrants in previous and upcoming months (`GET /api/dashboard/birthdays`)
- Sample birthday data seeded automatically when no birthdays exist
- Birthday celebrants card moved below **Giving & Finances** on the pastor dashboard

## [2026-05-24] — Skeleton loading

### Added
- **Skeleton loading** for auth session check, app bootstrap, dashboard, members directory, and chat conversations
- Reusable skeleton components in `src/components/church/skeletons.tsx` (stat cards, dashboard sections, member list, chat list/thread, app shell)

## [2026-05-24] — Blue & white theme

### Changed
- **Icon color system**: 10-tone palette (blue, sky, indigo, violet, cyan, teal, emerald, amber, rose, orange) applied to sidebar nav, page headers, stat cards, dashboard sections, chat avatars, and media items
- **App color scheme** updated from purple/teal/coral to **blue and white** across login, sidebar, headers, dashboard, chat, and shared UI components
- Theme tokens in `src/index.css` (`--primary`, `--sidebar-*`, `--accent`, `--highlight`) drive buttons, badges, and navigation

## [2026-05-24] — Supabase Auth & data on Supabase

### Added
- **Supabase Auth** for sign-in, sign-out, password reset, and session refresh (when `DATABASE_URL` is set)
- `auth_user_id` on `users` table linking church accounts to `auth.users`
- `server/supabase.js`, `server/auth-sync.js`, and `npm run auth:sync` to provision Auth accounts
- Frontend uses Supabase session tokens for all API requests

### Fixed
- **Auth loading spinner**: `AuthContext` now clears `loading` after session restore so the app no longer stays stuck on "Loading..."
- **Background jobs on Supabase**: `jobs.js` now uses Postgres store instead of SQLite (`better-sqlite3` crash on Node 24)
- **`npm run auth:sync`**: fixed import path; added `--reset-passwords` flag to reset synced user passwords
- New church users created in Settings/Members also get Supabase Auth accounts (with service role key)
- README updated for Supabase Auth configuration

## [2026-05-24] — Expense tracking on Finances page

### Added
- **Expenses tab** on Finances: record expenses linked to Sunday services, events, cell meetings, outreach, or general church activities
- Expense categories: Refreshments, Transport, Sound & Media, Venue, Printing, Utilities, Outreach, and more
- **`GET /api/finances/expense-contexts`**: dropdown data for services, events, and cells
- `purpose_type`, `purpose_id`, and `purpose_label` fields on finance records for expense attribution
- Expense records grouped by purpose with subtotals; Purpose column on All Transactions

### Changed
- Income recording moved to Tithe Ledger tab; expenses have a dedicated form and list

## [2026-05-24] — Pastor dashboard overview

### Added
- **`GET /api/dashboard/overview`**: aggregated church health metrics (last service attendance, giving, cell ministry, prayers, tasks, reports)
- **Pastor dashboard UI**: multi-section overview for Senior Pastor, Associate Pastor, and Admin with attendance trend chart
- **Sample dashboard data** seeded automatically when no attendance records exist (service/cell attendance, offerings, prayers, tasks)

### Changed
- **Pastor dashboard**: last service section shows new people (members flagged as new + first-time guests)
- **Service attendance**: record Sunday service with newcomer flags and guest names
- **Pastor dashboard**: service attendance trend chart moved directly below last service attendance

## [2026-05-24] — Header & chat UI polish

### Changed
- **App header**: purple gradient bar, page icon, avatar initials, refined notification/logout buttons
- **Chat headers**: branded gradient on conversation list and thread view; app header hidden on mobile chat to avoid duplication
- **Page headers**: accent border styling on inner pages

## [2026-05-24] — Chat-style Communications (Supabase Realtime)

### Added
- **Chat UI** (`ChatApp.tsx`): mobile-first messaging with conversation list, thread view, message bubbles, and sticky composer
- **Supabase Realtime Broadcast** for instant message delivery via `@supabase/supabase-js`
- API routes: `GET /api/messages/conversations`, `GET /api/messages/thread/:partnerId`
- Realtime enabled on `messages` and `message_recipients` tables in Supabase
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars for client Realtime

### Changed
- Communications page replaced email-style inbox/compose with WhatsApp-like chat experience
- Message send no longer requires a subject (body-only chat messages)

## [2026-05-24] — Supabase connection (CEYC CMS)

### Added
- Connected to Supabase project **CEYC CMS** (`gilcsmnyeuxwuvpxowik`): schema migration + seed data applied
- Row Level Security enabled on all tables (blocks Supabase Data API; Express uses direct Postgres)
- `npm run db:test:pg` and `scripts/test-supabase-connection.mjs` to verify `DATABASE_URL`
- Supabase setup docs in README and `.env.example`

### Fixed
- Supabase Session pooler host for CEYC CMS is **`aws-1-us-west-1`**, not `aws-0-us-west-1`
- Document URL-encoding special characters in database passwords for `DATABASE_URL`

## [2026-05-24] — Fix API server crashes (missing await)

### Fixed
- `/api/events`, `/api/attendance`, `/api/attendance/trends`, `/api/prayers`, and `/api/follow-ups` routes now `await` async database queries correctly
- Prevents the Express API from crashing (which caused login and all API calls to return 500 via the Vite proxy)

## [2026-05-24] — Mobile-first layout

### Added
- **Bottom navigation bar** on phones for quick access to key modules plus a More menu
- **Mobile card lists** for Members and Finance transactions (tables remain on tablet/desktop)
- **`TabBar`**, **`ModalFooter`**, and safe-area utilities for touch-friendly UI

### Changed
- App header shows current page title and compact actions on mobile
- Modals slide up as bottom sheets on small screens
- Buttons, inputs, and selects use 44px minimum touch targets; inputs use `text-base` on mobile to prevent iOS zoom
- Dashboard stats use a 2-column grid on phones; Communications shows inbox before compose on mobile
- Login and main content respect device safe areas (notches, home indicator)

## [2026-05-24] — Currency: Ghana Cedis (GHS)

### Changed
- Finances UI and activity logs now display amounts in **Ghana Cedis** (`₵`, `GHS`) instead of Nigerian Naira
- Added shared `formatCurrency` helpers in `src/lib/utils.ts` and `server/currency.js`

## [2025-05-22] — Optional: SMTP email + PostgreSQL / Supabase

### Added
- **SMTP** (`server/email.js`): password reset emails via nodemailer; optional `SMTP_NOTIFY` for notification emails
- **PostgreSQL** support (`server/store.js`, `server/schema.postgres.sql`): set `DATABASE_URL` to use Supabase or any Postgres instance instead of SQLite
- **Migration scripts**: `npm run db:migrate:pg`, `npm run db:reset:pg`
- **Settings API**: `emailConfigured` and `database` fields on `GET /api/settings`
- **`.env.example`**: documented `DATABASE_URL`, `DATABASE_SSL`, and SMTP variables

### Changed
- Server routes use async/await consistently for unified SQLite + Postgres `getDb()` layer
- `dotenv` loaded at server startup; forgot-password returns `resetToken` only when SMTP is not configured
- Login page shows dev reset token when email is not sent

### Fixed
- Seed duplicate department inserts on `db:reset`
- Syntax errors from `await` inside non-async route handlers

## [2025-05-22] — Feature completion (production polish)

### Added
- **Password management**: change password (Settings), forgot/reset password flow (`/reset-password`)
- **Overdue report job**: background cron marks late reports and sends notifications
- **Tithe ledger**: `/api/finances/tithes` + Finances UI tab per member
- **Event calendar**: month view with `react-day-picker`, filter events by selected day
- **Attendance trends chart** on Attendance page
- **Logo file upload** for church settings
- **Media streaming**: in-app video/audio player; share target on upload
- **Welfare notes** on members (Admin/Pastor)
- **Department reports** for department heads; **Sub-cell Leader** report access
- **Admin full access level** extends modules (departments, reports, media, etc.)
- **Audit log** API and Settings view
- **DELETE** endpoints for events, announcements, tasks, media
- **Rate limiting** on auth endpoints
- **RBAC unit tests** (`src/test/church-rbac.test.ts`)

### Changed
- Login routes: `/`, `/reset-password`, `/app` (protected)
- Removed unused e-commerce storefront code from `src/`

### Security
- Set `JWT_SECRET` in production `.env`
- Configure SMTP for email-based password reset (dev mode returns token in API response)

## [2025-05-22] — Production system (database + API + auth)

### Added
- Express + SQLite backend, JWT auth, REST API, 16 modules, file uploads

## [2025-05-22] — Initial demo (superseded)

- In-memory prototype
