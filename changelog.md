# Changelog

## [2026-09-30] — Dashboard activities & announcements on Vercel

### Fixed
- **`GET /api/activities`** and **`GET /api/announcements`** — lightweight Vercel handlers (dashboard no longer waits 30s on Express cold start).
- **Dashboard fetch** — loads stats/overview first, then parallel activities/announcements.

## [2026-09-30] — Dashboard stats on Vercel

### Fixed
- **`GET /api/dashboard/stats`** — lightweight Vercel handler (`api/light-dashboard-stats.js`) so Church Member / cell dashboards load without waiting for full Express cold start.
- **Client** — longer timeout for `/dashboard/*`; if stats API fails but bootstrap already has counts, show those without a scary toast.

## [2026-09-30] — PWA service worker cache errors

### Fixed
- **Service worker** — removed Google Fonts `runtimeCaching` (common `Cache.put()` network failures); raised precache size limit; `sw-handlers.js` logs non-fatal cache errors; explicit `registerSW` in `main.tsx`.

## [2026-09-30] — Dashboard debug logs

### Added
- **`[dashboard]` console traces** (dev or `VITE_AUTH_DEBUG=true`) — per-endpoint fetch timing in `useDashboardData`, bootstrap counts, and JSON summary when dashboard data is ready / revalidated.

## [2026-09-30] — Supabase sign-in timeout on slow networks

### Fixed
- **Login** — `signInWithPassword` allows **45s** (was 15s) and recovers the session if Supabase completes shortly after a timeout.
- **Realtime** — client websocket timeout raised to 25s; reduced noisy “access token ready” logs on every API call.

## [2026-09-30] — Signup timeout on Vercel

### Fixed
- **`POST /api/auth/signup`** — handled by lightweight `api/light-auth-signup.js` (Postgres + Supabase user create only), avoiding 55s cold-start wait for the full Express app.
- **Shared logic** — `server/public-signup.js` used by both Vercel light handler and Express.

## [2026-09-30] — Signup button / form UX

### Fixed
- **Login** — full-width **Sign up** router link below Continue (replaces small text link / “Create account” label); works on Vercel SPA routing.
- **Signup** — `noValidate` plus visible validation for name, email, and password; toast + inline errors on failure; redirect to `/app` after success.
- **Vercel** — light `/api/public/config` includes `allowSignup` (matches full API).

## [2026-09-30] — Vercel deploy troubleshooting

### Added
- **GitHub Actions** — `.github/workflows/vercel-production.yml` deploys Production on push to `main` when `VERCEL_*` secrets are configured.
- **docs/VERCEL.md** — checklist when Git pushes do not trigger a Vercel build (wrong repo/branch, failed deploy, PWA cache, CLI redeploy).

## [2026-09-30] — Signup Supabase auth trigger fix

### Fixed
- **Signup** — removed legacy `on_auth_user_created` trigger that inserted into missing `public.profiles` (caused “Database error creating new user” / 500 on `/api/auth/signup`). Migration: `20260930160000_drop_legacy_auth_profiles_trigger.sql`.

## [2026-09-30] — Public signup page

### Added
- **`/signup`** — self-registration (name, email, optional phone, password) with link from the login page.
- **`POST /api/auth/signup`** — creates a **Church Member** account and login (Supabase or JWT). Set `ALLOW_PUBLIC_SIGNUP=false` to disable.
- **Signup tracing** — `authLog` / `authLogError` on the signup page and in `signup()` (same as login when `VITE_AUTH_DEBUG=true` or in dev); server logs `[auth/signup]` lines.

### Changed
- **Login** — **Create account** button under **Continue** (was only a small “Sign up” text link).

## [2026-09-30] — Chat rebuild (Supabase Realtime postgres_changes)

### Changed
- **Communications / Chat** — Rebuilt from modular components (`chat/ChatPage`, conversation list, thread, composer) with `useChatRealtime` subscribing to `postgres_changes` on `messages` and `message_recipients` (debounced thread/list refresh).
- **Server** — Removed duplicate Broadcast push on send/read; live updates rely on database Realtime publication.

### Added
- **Supabase** — `chat_current_member_id()`, RLS SELECT policies for chat tables, and `supabase_realtime` publication entries for `messages` / `message_recipients`.

## [2026-09-30] — Modern chat UI (Communications)

### Changed
- **Communications / Chat** — Refined messaging UI to match the rest of CEYC CMS: theme primary bubbles, glassy headers, soft gradient thread background, rounded composer, and cleaner conversation list (replaces flat legacy-green clone).

## [2026-09-30] — WhatsApp-style chat UI (superseded)

### Changed
- **Communications / Chat** — Earlier WhatsApp-like layout (replaced by modern theme-aligned UI above).

## [2026-09-30] — Chat Realtime (live messages)

### Fixed
- **Chat** — call `realtime.setAuth()` with the Supabase session JWT before subscribing (required when Realtime Authorization is enabled).
- **Server push** — chat broadcasts use `SUPABASE_SERVICE_ROLE_KEY` when set (anon-only REST broadcast often failed silently).
- **Supabase** — migration adds `authenticated_users_receive_broadcasts` on `realtime.messages` for broadcast delivery.

## [2026-09-30] — Attendance request storm (infinite SWR loop)

### Fixed
- **`useStaleWhileRevalidate`** — no longer depends on `initialData` / `revalidate` identity in effects (inline `{ records: [] }` or `initialData: []` was new every render and re-triggered fetch forever).
- **Fetch** — dedupe in-flight revalidations per hook instance so one background refresh runs at a time.

## [2026-09-30] — Stale PWA bundle (`load is not defined`)

### Fixed
- **Deploy/cache** — PWA `skipWaiting` / `clientsClaim`; `Cache-Control: no-cache` for `index.html` and service worker on Vercel so fixes reach browsers after redeploy.
- **Debug** — production console logs `[CEYC CMS] client build <id>` (git SHA on Vercel) to confirm you are not on an old `index-*.js` bundle.

## [2026-09-30] — Attendance page crash

### Fixed
- **Attendance** — calendar refresh callback used removed `load` after SWR refactor (`loadAttendance`).
- **All SWR pages** — use hook `reload` directly (no `reload: load` alias); audited callbacks/props so nothing references an undefined `load`.

## [2026-09-30] — App-wide stale-while-revalidate

### Changed
- **All app pages** — shared `useStaleWhileRevalidate` caches API data per user/route; navigating back shows the last view immediately and re-fetches in the background with **Updating…** on the page header (shell spinner while bootstrap revalidates).
- **Bootstrap** — members/cells/departments cache no longer blocks the whole app on `onRefresh`; only the first visit shows the full skeleton.

## [2026-09-30] — Dashboard stale-while-revalidate

### Changed
- **Dashboard** — caches the last loaded home data per user; returning to Dashboard shows previous content immediately and refreshes in the background with an **Updating…** spinner on the header.

## [2026-09-30] — Bootstrap timeout on Vercel

### Fixed
- **Vercel API** — `GET /api/bootstrap` uses `api/light-bootstrap.js` (shared `server/bootstrap-payload.js`) without loading the full Express app.
- **Client** — 55s fetch timeout for `/bootstrap`; retries on 503/timeout; skip duplicate `SIGNED_IN` → `/api/auth/me` when session already hydrated.

## [2026-09-30] — Faster bootstrap and dashboard load

### Changed
- **`GET /api/bootstrap`** — runs members, fellowships, cells, departments, settings, and all `member_departments` rows in parallel; one junction query instead of per-department lookups.
- **Dashboard** — loads activities, overview/stats, events, and announcements in parallel (`Promise.all`); stats fallback only when pastoral overview fails.

## [2026-09-30] — `/api/auth/me` timeout after sign-in (Vercel)

### Fixed
- **Vercel API** — `GET /api/auth/me` is handled by `api/light-auth-me.js` without importing the full Express app, so login profile load no longer waits ~45s on cold start.
- **Auth** — shared `resolveUserFromAuthHeader()` for Express middleware and the light handler; returns **503** when Postgres is not ready.
- **Client** — `loadAuthMode` clears its 8s race timer when `/public/config` succeeds (no spurious timeout log).

## [2026-09-30] — Login button stuck on Loading

### Fixed
- **Login UI** — Continue is no longer disabled while auth bootstraps; slow `/api/public/config` on Vercel no longer shows infinite **Loading…** (caused by tying the button to `authLoading`).
- **Auth bootstrap** — session restore runs in the background; `loadAuthMode` caps wait at 8s with env fallback; `/public/config` fetch timeout 8s.

## [2026-09-30] — Vercel cold start / 504 fixes

### Fixed
- **Vercel API** — `/api/public/config`, branding, health, and manifest respond instantly via `api/light-public.js` without loading the full Express app; static `public/manifest.webmanifest` served from the build.
- **Serverless bootstrap** — on Vercel, skip seed/auth-sync on every cold start; Postgres pool uses shorter timeouts and smaller `max` connections.
- **Express** — removed top-level `await` for rate-limit (faster `server/index.js` import).

## [2026-09-30] — Sign-in debug logging

### Added
- **`VITE_AUTH_DEBUG=true`** — verbose `[sign-in +Nms]` console logs on production/Vercel (HTTP status for `/api/auth/*` and `/api/public/config`, Supabase steps, login page flow).
- **Login** — Continue disabled while auth bootstrap runs; clearer log when submit is blocked.

## [2026-09-28] — Sign-in spinner stuck on Continue

### Fixed
- **Supabase login hang** — `onAuthStateChange` no longer awaits `/api/auth/me` inside the auth callback (avoids a Supabase client lock deadlock with `signInWithPassword`). Manual sign-in loads the profile with the token returned from sign-in instead of calling `getSession()` mid-flow.
- **Login page** — Continue stays disabled until auth mode is loaded from `/api/public/config`; the button spinner always clears in `finally` if sign-in fails.
- **White screen after deploy** — `scheduleSessionRefresh` referenced `refresh` before initialization (TDZ crash); helper is now declared after `refresh`.
- **Login button stuck on Loading** — auth bootstrap no longer waits on `/api/auth/me` before showing the form; session restore runs in the background and bootstrap always clears the global loading flag.
- **Sign-in spinner never stops** — block background session refresh during password sign-in (Supabase auth lock deadlock with `getSession`); cache access tokens from auth events; add API/auth timeouts and clearer 503 errors; Vercel API no longer blocks every request until DB bootstrap finishes.
- **Vercel build** — export `getCachedSupabaseAccessToken` used by `AuthContext` (fixes Rollup PWA build error).

## [2026-09-28] — Vercel hosting guide

### Changed
- **docs/VERCEL.md** — step-by-step deploy for `AlphaZee01/CEYC-CMS`, env table, post-deploy Supabase URLs, and troubleshooting; README quick Vercel steps.

## [2026-09-28] — Dedicated GitHub repo setup

### Added
- **`npm run repo:github`** — creates `CEYC-CMS` on GitHub (classic PAT with **repo** scope) and pushes `main`; fine-grained PATs get instructions to create the empty repo first, then re-run.

## [2026-09-27] — Vercel deploy helpers

### Added
- **`npm run vercel:env`** — syncs `.env` to the linked Vercel project (production + preview).
- **`npm run vercel:deploy`** — production deploy via Vercel CLI.

### Changed
- **`vercel.json`** — SPA fallback rewrite for `/app/*` client routes.

## [2026-09-27] — Church display name

### Changed
- **Branding** — church name set to **Christ Embassy Airport City Jesus Brand** (`.env`, seed defaults, `church_settings` in Supabase, login/PWA fallbacks).

## [2026-09-27] — Edit media after upload

### Added
- **Media library** — **Edit** on each item (uploader, Admin, or pastoral roles) to change title, speaker, series, topic, date, sharing, Google Drive link, or replace the file after upload.
- **PATCH /api/media/:id** — metadata updates alongside existing pastor approve/reject.
- **Upload form** — **Topic** field on new uploads.

## [2026-09-27] — Vite outdated optimize deps

### Fixed
- **PWA in dev** — service worker is off during `npm run dev` (was caching Vite pre-bundles → 504 `Outdated Optimize Dep`). Set `VITE_PWA_DEV=true` only if you need to test install prompts locally.

### Added
- **`npm run dev:clean`** — clears `node_modules/.vite` and `dev-dist` then starts dev.

## [2026-09-27] — API listens before DB bootstrap

### Fixed
- **Dev startup** — Express binds to port 3001 immediately; Supabase Postgres seed/init runs in the background so `/api/public/config` and `/api/public/branding` work while the DB is still connecting.
- **Auth** — if `/api/public/config` fails briefly, the client falls back using `VITE_USE_SUPABASE_AUTH` (set alongside `USE_SUPABASE_AUTH=true`).

## [2026-09-27] — Church media storage bucket

### Added
- **Supabase Storage** — `church-media` bucket (public, 100MB file limit) with the same RLS pattern as logos/avatars/banners. Migration: `20260927120000_church_media_bucket.sql`. Media uploads use this bucket when `USE_SUPABASE_STORAGE=true` (`SUPABASE_BUCKET_MEDIA=church-media`).

## [2026-09-27] — Supabase Storage bucket mapping

### Fixed
- **Storage** — removed hard-coded `church-assets` bucket (auto-create). Uploads now target your existing buckets: **church logos**, **member avatars**, and **event banners** (auto-detected by name, or set `SUPABASE_BUCKET_*` in `.env`). **Media library** files (audio/video) stay on `/uploads` unless you create a media bucket and set `SUPABASE_BUCKET_MEDIA`.

## [2026-09-27] — Media upload POST fix

### Fixed
- **POST /api/media** — when Supabase Storage rejects a file (bucket limits, config), the file is saved under local `/uploads` instead of failing the whole upload. Added validation, clearer errors, and schema alignment for older `media_items` tables.

## [2026-09-27] — Media library API stability

### Fixed
- **GET /api/media** — safer file URL mapping (avoids crashes on bad `file_path` values), normalizes query params, and returns a clear error instead of an unhandled **500**.

## [2026-09-27] — Reports analytics on Postgres

### Fixed
- **GET /api/reports/analytics** — translates SQLite `strftime()` to Postgres `TO_CHAR()` so member growth and related charts load on Supabase.

## [2026-09-27] — Postgres fixes for discipleship & PWA manifest

### Fixed
- **GET /api/follow-ups** — replaced SQLite `rowid` sort with `id` so class notes load on Supabase Postgres.
- **manifest.webmanifest** — returns a valid manifest with branding fallback instead of **500** when the DB read fails.
- **SQL dialect** — maps `rowid` → `id` for any remaining legacy queries.

## [2026-09-27] — API starts when database is misconfigured

### Fixed
- **Server startup** — Express listens even if Supabase Postgres fails to connect; `/api/public/config` and `/api/public/branding` still respond (branding uses `CHURCH_NAME` fallback). Other `/api/*` routes return **503** with a clear message instead of the Vite proxy showing **500** for every request.

## [2026-09-27] — Department card opens modal

### Fixed
- **Ministry Departments** — clicking a department card opens the detail modal (`Card` now forwards `onClick` and other div props).

## [2026-09-27] — Header menu icon

### Changed
- **App header** — menu control is hamburger-only (no “More” label); `aria-label` is “Open menu”.

## [2026-09-27] — Ministry department detail modal

### Added
- **Ministry Departments** — horizontal department tabs and department cards open a modal with **Details** (head, members, permissions) and **Settings** (name, abilities, head, roster). Managers can save from the Settings tab; others see read-only settings.

## [2026-09-27] — Session survives page reload

### Fixed
- **Auth** — refreshing `/app/...` no longer sends you to login while Supabase restores the session. The app now loads the persisted session before finishing the auth bootstrap, and no longer treats a brief “no session” event or a transient network error as a sign-out.

## [2026-09-27] — Remove SQLite; Supabase Postgres only

### Removed
- **SQLite** — `better-sqlite3`, local `data/church.db`, and the SQLite schema/migrations in `server/db.js`. The API always connects to Supabase Postgres.

### Changed
- **`server/store.js`** — Postgres-only database layer; startup fails with a clear error if `DATABASE_URL` / Supabase DB env vars are missing.
- **`npm run db:reset`** — still blocked for remote Supabase (use dashboard or a fresh project); no local SQLite reset path.
- **`.env.example`**, **README** — document Supabase Postgres as the only database option.
- **`/api/health`** — always reports `database: "supabase"`.

## [2026-09-26] — Demo login session crash

### Fixed
- **Sign-in** — demo (and any Supabase) login no longer crashes with `Cannot read properties of undefined (reading 'user')`. Session setup was missing the department-abilities setter, so the profile response was never passed through.

## [2026-09-27] — Mobile nav: More on bottom bar

### Changed
- **Bottom nav** — **More** opens the full menu again; **Events** removed from the tab bar (still in the sidebar).
- **Header** — menu button removed on mobile (notifications + role badge only).

## [2026-09-27] — Vercel deployment

### Added
- **Vercel** — `vercel.json`, `api/index.js` (Express via `serverless-http`), and [docs/VERCEL.md](docs/VERCEL.md) for env vars and Supabase setup.
- **`APP_URL`** — falls back to `VERCEL_URL` when unset.

### Changed
- **API server** — skips `listen()` and background jobs when `VERCEL` is set; uploads use `/tmp` on serverless.

## [2026-09-27] — Stale Supabase session on load

### Fixed
- **Auth** — clears invalid refresh tokens on startup and when `/api/auth/me` fails (e.g. after `auth:sync` or API restart).

## [2026-09-26] — Supabase connection fixes

### Fixed
- **Pooler host** — supports `aws-1-{region}` (`SUPABASE_POOLER_AWS_CLUSTER=1`) for CEYC CMS on `us-west-1`.
- **Postgres SQL** — integer flags (`active`, `is_newcomer`, etc.) no longer rewritten to booleans.

## [2026-09-26] — Supabase as primary church database

### Changed
- **Database** — API uses Supabase Postgres when `USE_SUPABASE_DB=true` (set `SUPABASE_DB_REGION`; use `SUPABASE_POOLER_AWS_CLUSTER=1` if your pooler host is `aws-1-{region}`).
- **Connection** — pooler connection falls back to direct `db.<project>.supabase.co` if the pooler tenant lookup fails.
- **Schema** — `server/schema.postgres.sql` applied automatically on first Postgres connect; Supabase migration resets legacy tables to the CEYC CMS schema.
- **Seed** — `node server/seed.js` populates an empty Supabase database with demo church data (then run `npm run auth:sync`).

## [2026-09-25] — More menu in header & event hosting

### Changed
- **More button** — moved from the mobile bottom nav into the app header (replacing the header logout icon), with a visible **More** label; opens the full sidebar menu.
- **Bottom nav** — shows up to five primary destinations without a More slot.
- **Log out** — moved into the sidebar under the user profile card.
- **Create event** — **Hosted by** field: whole church, a fellowship, or a cell; host shown on event cards.

### Added
- **Events** — `fellowship_id` and `cell_id` on events (SQLite migration + Supabase migration).

## [2026-05-27] — Install app prompt after login

### Added
- **Post-login install prompt** — modal appears right after sign-in with an **Install** button (Chrome/Edge/Android) or step-by-step **Add to Home Screen** guide on iPhone/iPad Safari.
- Dismissal is remembered for the session; logging out clears it so the prompt can show again on the next login.

## [2026-05-27] — Progressive Web App (installable)

### Added
- **PWA** — service worker (offline shell, auto-update), `standalone` display mode, and dynamic `/manifest.webmanifest` from church settings.
- **Favicon & install icons** — browser tab icon, Apple touch icon, and manifest icons use the current church logo from settings (updated when branding loads or changes).

### Changed
- **Document title & meta** — page title, description, and Open Graph tags follow church name/tagline/logo from branding cache and API.

## [2026-05-27] — Supabase as primary database

### Added
- **Supabase Postgres backend** — when `DATABASE_URL` and `USE_SUPABASE_DB=true` are set, the API reads/writes all pages through your Supabase database instead of local SQLite.
- **SQL adapter** — translates app queries for Postgres (dates, booleans, placeholders).
- **Schema migration** — `supabase/migrations/20260527120000_align_app_schema.sql` adds columns/constraints the app expects (events programme, media approval, department abilities, leaders announcements, etc.).

### Changed
- **`/api/health`** — reports `database: supabase` or `sqlite`.
- **`db:reset`** — blocked when pointed at Supabase to avoid wiping production data.

### Setup
Either paste the full **DATABASE_URL** (pooler URI from the dashboard), or set only **`SUPABASE_DB_PASSWORD`** with your existing **`SUPABASE_PROJECT_REF`** — the server builds the pooler URL for you.

## [2026-05-27] — Attendance calendar clarity

### Changed
- **Attendance calendar** — each day shows a clear green count of people present; tapping a day lists everyone who was present, grouped by fellowship then cell (with meeting tabs when multiple meetings share a day).

## [2026-05-27] — Attendance UI upgrade

### Changed
- **Attendance page** — summary stat cards (monthly records, last service/cell, turnout); **Record** action in header; redesigned record flow with roster search, mark all/clear, progress bar, tap-to-toggle present, and sticky save.
- **By member** — attendance rate progress bars on each member card.
- **Trends chart** — dynamic cell names from data instead of hardcoded series.

## [2026-05-27] — Dashboard announcement details

### Changed
- **Dashboard announcements** — each notice shows full message body, audience target, and expiry (and post date when available), not just the title.
- **Visibility** — dashboard uses the same targeting rules as the Announcements page; up to five active items are shown.

## [2026-05-27] — Media library Google Drive links

### Changed
- **Media upload modal** — removed the Topic field from the add-media form.
- **Media upload** — for videos, choose **Upload file** or **Google Drive link**; link mode accepts a Drive share URL instead of uploading the file to the server.
- **Media playback** — Google Drive videos play in an embedded preview player; other videos still use the native `<video>` element.
- **Media actions** — Drive items show **Open in Drive** instead of download.

## [2026-05-27] — Finances modals

### Changed
- **Finances export** — export dialog uses a smaller compact layout (`sm` modal size).
- **Record Income** — moved from an inline card to a **Record Income** modal opened from the Tithe Ledger tab header; ledger tab shows only the member tithe & offering list.
- **Record Expense** — same modal pattern on the Expenses tab; inline form removed.
- **Modal & header actions** — Cancel/Save (and Export) buttons sit on one horizontal row in finance modals; page header actions use a single horizontal row on mobile.

## [2026-05-26] — Finance export date range modal

### Changed
- **Finances export** — clicking **Export** opens a modal to choose from/to dates and presets before downloading CSV; live preview shows transaction count and income/expense totals for the range. Main page lists show all records.

## [2026-05-26] — Chat message status indicators

### Added
- **Chat** — outgoing messages show status: Sending, Sent, Read (double check), or Failed; incoming unread messages show a “New” label until opened.
- **Read receipts** — when a recipient reads a direct message, the sender is notified in real time and status updates to Read.

## [2026-05-26] — Prayer requests: visibility for all members

### Changed
- **Prayer page** — all member roles can access and submit requests with a clear choice: visible to **everyone in the church** or **prayer & intercession team, pastors & admin only** (team-only / private).
- **Visibility rules** — public requests appear on the church wall for all members; team-only requests are visible only to pastors, admins, and members with prayer department access (`access_prayer` / `manage_prayer`).
- **Intercession workflow** — responding (mark prayed / answered) is limited to pastors, admins, and `manage_prayer`; filters for All, My requests, Church wall, and Team only.

## [2026-05-26] — Edit and delete mentoring sessions

### Added
- **New Believers Class** — mentors and class managers can edit or delete individual session logs (date, notes, outcome) via `PATCH` / `DELETE` on `/api/follow-ups/:id/notes/:noteId`.

## [2026-05-26] — New Believers Class (discipleship)

### Changed
- **Discipleship page** — redesigned as a mentor-led class: enroll church members or guest invitees, assign mentors (pastors/admins), group roster by mentor, log mentoring sessions, and track progress stages (Invitee → New Convert → In Training → Graduated).
- **Mentor view** — assigned mentors see only their students and can log sessions and update progress; pastors/admins see the full class and reassign mentors.
- **API** — follow-ups filtered by mentor; guest enrollment; mentor assignment restricted to pastors/admins; DELETE to remove students from class.

## [2026-05-26] — Announcements for all leaders

### Added
- **Target: All leaders** — post announcements visible only to ministry leaders (pastors, admins, fellowship/cell/sub-cell leaders, and department heads). Regular members and church/cell members do not see these notices.

## [2026-05-26] — Edit and delete announcements

### Added
- **Announcements page** — users who can post announcements see Edit and Delete on each notice; edit reuses the post form (title, content, target, expiry, pin).
- **API** — `PATCH /api/announcements/:id` and secured `DELETE /api/announcements/:id` (same permission as posting); managers see all announcements including expired for upkeep.

## [2026-05-26] — Dashboard stats show after overview API failure

### Fixed
- **Pastor/Admin dashboard** — when `GET /api/dashboard/overview` failed, the UI fell back to stat cards with zeros because `/dashboard/stats` was never requested and errors were swallowed. Overview failures now toast, load stats as a fallback, and seed counts from bootstrap data so member/cell/fellowship/department totals still appear.
- **Non-pastoral dashboard** — failed `/dashboard/stats` now toasts and uses bootstrap counts instead of all zeros.
- **Server** — `dashboard/overview` wrapped in try/catch; invalid birthday rows no longer crash the whole overview response.

## [2026-05-26] — Chat conversations persist across refresh

### Fixed
- **Conversation list** — failed API loads no longer wipe the UI with an empty list; last successful list is cached in `sessionStorage` per user
- **Message send** — errors surface via toast instead of failing silently; invalid broadcast thread replies are blocked
- **Active chat** — last open thread is restored after refresh when still available
- **Direct messages** — server rejects sends with no valid recipient so threads are always stored in the database
- **Broadcast history threads** — read-only (no broken reply box); cached list stays visible while refreshing

## [2026-05-26] — Church name/logo persist after refresh

### Fixed
- **Branding cache** — saving settings or uploading a logo now updates `localStorage` and auth branding immediately; bootstrap no longer falls back to stale cached name/logo after reload
- **Settings API** — `PUT /api/settings` and `POST /api/settings/logo` return resolved `branding` from the database
- **Logo URLs** — `/uploads/…` paths from the database stay served even when the file check fails, so the header does not revert to an old cached logo

## [2026-05-26] — Dashboard stat cards on small screens

### Fixed
- **Stat cards** — icon moved to the left with stacked text so labels and values are readable in narrow columns; long values wrap instead of truncating
- **Stat grid** — single column below 400px width, then 2 columns, then 4 on large screens; grid children use `min-w-0` to prevent overflow clipping
- **Stat typography** — smaller value/label sizes on phones (`text-base` / `text-sm` for long values); dashboard mini-stat tiles and skeletons scaled down to match

## [2026-05-26] — Mobile layout CSS fixes

### Fixed
- **Viewport shell** — use `100svh` with `100dvh` fallback, `overflow-x: hidden`, and `#root` min-height so the app fills the screen without horizontal scroll on phones
- **Safe areas** — moved horizontal insets from `body` to app shells (`px-safe`) so fixed bottom nav and content align
- **Chat on mobile** — hide duplicate app header on small screens; remove negative horizontal margins that caused overflow
- **Loading shell** — auth skeleton matches app flex scroll layout and bottom-nav padding

## [2026-05-26] — Dashboard stat cards always visible

### Fixed
- **Pastor dashboard stat row** — Departments, Last Offering, and New at Service were mutually exclusive (only one could show). All core cards now render; New at Service and Last Offering appear as extra cards when data exists.

## [2026-05-25] — Duplicate import fix (ChurchPages)

### Fixed
- **`ChurchPages.tsx`** — removed duplicate `DEPARTMENT_ABILITIES` import that broke the app bundle

## [2026-05-25] — Department-specific abilities

### Added
- **`departments.abilities`** — JSON list of capability keys per department; all members in that department inherit them (union across multiple departments)
- **Preset abilities** by department name (e.g. Media → upload media, Ushering → service attendance) with pastor override in **Ministry Departments** UI
- **Effective nav pages** — `access_*` abilities grant matching app modules (media, tasks, events, reports, prayer, discipleship, attendance)
- **API guards** — upload media, manage events/tasks, post announcements, prayer responses, discipleship follow-ups, service attendance, and department reports respect department abilities
- **`departmentAbilities` on `/api/auth/me`** — client merges into sidebar pages after login or when departments are saved

### Changed
- Replaced hardcoded `Media` department name check with `upload_media` ability
- Department report submission uses `submit_department_report` for any member in the department (not only heads)

## [2026-05-25] — Department delete confirmation UI

### Fixed
- **Delete department** — in-app confirmation modal and Sonner toast on success/error (replaces `window.confirm`, which often does not appear in embedded or PWA browsers)

## [2026-05-25] — Delete departments (pastors & admin)

### Added
- **`DELETE /api/departments/:id`** — Senior Pastor, Associate Pastor, and Admin can remove a department; member links cascade, events/tasks/reports clear `department_id`, department-targeted announcements lose their target id
- **Departments page** — delete button (trash icon) on each department card for authorized roles

### Security
- **`canManageDepartments`** — server and client RBAC; Fellowship Leaders and below cannot create, edit, or delete departments via API

## [2026-05-25] — Logo not displaying (CDN 403)

### Fixed
- **Church logo** — API now serves uploaded files from `/uploads/` when the saved logo URL points at an external CDN that blocks hotlinking (403); previously the recovered `https://cdnvideos.ceflix.org/…` URL loaded in the browser but failed, so the UI fell back to initials

## [2026-05-25] — App header church branding

### Fixed
- **Top header** shows church **name** and **logo** again (from Settings / cached branding), with optional tagline on `sm+` screens — restored after the light UI refresh had replaced it with page title / welcome text only

## [2026-05-25] — Event programme pastor confirmation before notify

### Added
- **Programme approval** — assignees on an event programme are not notified until a Senior or Associate Pastor confirms via **Confirm & notify**
- **Draft status** — saving a programme with assignees marks it as awaiting pastor approval; pastors receive a notification to review
- **`POST /api/events/:id/programme/confirm`** — sends task notifications to all programme assignees once confirmed

### Changed
- **PUT programme** — no longer notifies assignees immediately; uses `task_assignees.notified = 0` until confirmation

## [2026-05-25] — Event programme outline (step 2 of create)

### Added
- **Create Event wizard** — step 1: event details; step 2: programme outline (activities with time slot, notes, and optional assignees)
- **`PUT /api/events/:id/programme`** — saves programme items as tasks linked to the event
- **Event cards** — show numbered programme outline for attendees
- **Tasks** — display linked event name and scheduled time for programme tasks

### Changed
- **Tasks schema** — `event_id`, `sort_order`, and `scheduled_time` on tasks for event programmes

## [2026-05-25] — Discipleship follow-up member picker

### Changed
- **New Follow-up modal** — select a member from the directory (with search) instead of typing name and contact; contact is filled from their profile
- **`follow_ups.member_id`** — links follow-ups to members; prevents duplicate follow-ups for the same person

## [2026-05-25] — Reports department participation legend

### Changed
- **Reports page** — Department Participation uses a high-contrast pie palette, donut-style chart, and a two-column legend grid with department name, member count, and percentage (replacing the cramped Recharts legend)

## [2026-05-25] — Local login auth mode fix

### Fixed
- **Login 400 with seed users** — `USE_SUPABASE_AUTH=true` blocked `/api/auth/login` while a failed `/api/public/config` made the client fall back to JWT; local `.env` now defaults to JWT for SQLite seed accounts
- **Auth mode loading** — retries `/api/public/config` when the API is briefly unavailable during server restart (avoids proxy 500 → wrong auth path)

## [2026-05-25] — Members can edit their own profile

### Added
- **Self-service profile edit** — every member can update their own name, email, phone, and date of birth from their profile page
- **`canEditMemberProfile`** client helper and **`requireMembersPageOrSelf`** API guard so Cell/Church members need not have the Members nav page

### Changed
- **`PUT /api/members/:id`** — self-updates ignore role, cell, fellowship, departments, and active status; login `users.email` stays in sync when email changes
- Profile modal shows only contact fields when editing your own profile; leaders still get full edit for members they manage

## [2026-05-25] — Attendance calendar syntax fix

### Fixed
- **AttendanceCalendar.tsx** — corrected JSX closing tags in the view-mode roster (`groups.map` ternary branch), which caused Vite “Unterminated regexp literal” / 500 on module load

## [2026-05-25] — Member profile pages

### Added
- **Member profile** at `/app/members/:id` — contact details, role, cell, fellowship, departments, and join date
- **GET `/api/members/:id`** — scoped by RBAC; welfare notes only for Senior Pastor / Admin viewing others
- **Members directory** — member names link to their profile
- **Sidebar** — tap your name/avatar to open your own profile (all roles, including Cell/Church Member)

### Changed
- Profile edit from the profile page when the viewer can manage that member (same rules as the members list)

## [2026-05-25] — Cell Leader attendance edit & approved media access

### Added
- **Edit cell attendance**: Cell Leaders can update present/absent for their cell meetings from the attendance calendar (Edit button on cell records)
- **Media library access**: Cell Leaders can browse **pastor-approved** media in the Media Library nav page
- **Media approval workflow**: uploads from the Media & Technical team start as `pending`; Senior/Associate Pastor approve or reject before members and cell leaders can access

### Changed
- `PUT /api/attendance/:id` — update cell attendance with cell-scoped RBAC
- `GET /api/media` — cell leaders and members only see `approved` items
- Media team (Media & Technical department members/heads) can upload; pastors auto-approve their own uploads

## [2026-05-25] — Cell reports use description field

### Changed
- **Cell reports**: replaced separate "Prayer Points" and "Challenges" fields with a single **Description** field in the form, API, and report display
- **Database**: added `description` column with migration that merges existing prayer points and challenges into description

## [2026-05-25] — Mobile bottom nav no longer blocks content

### Fixed
- **Bottom nav overlap**: increased mobile bottom padding via shared `--mobile-nav-offset` utility (`pb-mobile-nav`)
- **Chat layout**: removed negative bottom margin and viewport-height hack; chat now fills the main content area above the nav
- **Chat input/footer**: removed duplicate bottom padding that pushed content inconsistently

## [2026-05-25] — Cell Leader events (view only)

### Changed
- **Cell Leaders and Sub-cell Leaders** can view church events, calendar, details, and RSVP — but cannot create or delete events
- **Server**: `POST /api/events` and `DELETE /api/events/:id` require `canManageEvents` (Pastors, Admin, Fellowship Leader)
- **Events page**: "New Event" button and create modal hidden for roles without event management permission

## [2026-05-25] — Chat stays open after sending

### Fixed
- **Chat thread closing after send**: stopped `scrollIntoView` from scrolling the outer app layout on mobile; chat page main area is now non-scrollable
- **Send UX**: messages append immediately after send; conversation/thread refresh runs silently without replacing the thread with a loading skeleton

## [2026-05-25] — Server startup syntax error

### Fixed
- **`server/index.js`**: invalid mix of `??` and `||` when resolving fellowship on member create crashed the API server on boot (500 on `/api/public/config`, `/api/public/branding`, and login)

## [2026-05-25] — Cell Leader permissions (RBAC)

### Added
- **Server RBAC**: Cell Leaders and Sub-cell Leaders can manage members in their own cell only, assign roles below Cell Leader, mark cell attendance, message cell members and leadership, and submit cell reports
- **Frontend RBAC** (`src/lib/rbac.ts`): mirrors server rules for member management, attendance, and role assignment in the UI
- **Dashboard**: cell-scoped stat cards for Cell Leaders (cell member count, last meeting, cell name)
- **Attendance**: service attendance tab hidden for cell-scoped roles; cell field locked to their cell
- **Reports**: cell report submissions scoped to the leader's cell; list filtered by cell

### Security
- Cell Leaders cannot edit members above their rank, move members out of their cell, record service attendance, or submit reports for other cells

## [2026-05-25] — Dashboard welcome includes role

### Changed
- Dashboard subtitle now shows the signed-in user's role (e.g. `Welcome back, Sis. Chioma Nwosu · Cell Leader`)

## [2026-05-25] — Sign-in 401 / dashboard not loading

### Fixed
- **Auth mode mismatch**: frontend now reads `authMode` from `GET /api/public/config` (server is the single source of truth) instead of relying only on `VITE_USE_SUPABASE_AUTH`
- **Login 401 loop**: failed `/api/auth/me` on the login page no longer clears the Supabase session immediately
- **Supabase login flow**: after sign-in, session is loaded directly instead of racing with auth state listeners
- **`authApi.login`** uses `publicApi` (no bearer token required)

### Note
- With `USE_SUPABASE_AUTH=true`, run `npm run auth:sync -- --reset-passwords` after `db:reset` so Supabase passwords match `SEED_PASSWORD`
- **Restart `npm run dev`** after changing `.env`

## [2026-05-25] — Modern UI refresh

### Changed
- **Design system**: Plus Jakarta Sans typography, softer palette, rounded cards with subtle shadows, refined buttons and form fields
- **App shell**: light sidebar with grouped navigation (Overview, People, Ministry, Operations, Admin), clean header without heavy gradient, user card in sidebar footer
- **Login page**: split-screen layout on desktop, clearer form hierarchy, demo credentials in a dedicated info box (not pre-filled)
- **Dashboard**: updated stat cards and section headers
- **Mobile nav**: cleaner floating tab bar
- **Toasts**: Sonner notifications enabled app-wide

## [2026-05-25] — Sign-in auth mode mismatch

### Fixed
- **Sign-in 401 after Supabase login**: frontend no longer uses Supabase Auth just because `VITE_SUPABASE_*` keys exist — auth requires `VITE_USE_SUPABASE_AUTH=true` to match server `USE_SUPABASE_AUTH=true`; otherwise local JWT via `/api/auth/login` is used

### Fixed
- **`better-sqlite3@12`** — upgraded for **Node.js 24** prebuilt binaries (v11 had no prebuild for `NODE_MODULE_VERSION 137`, causing "Could not locate the bindings file" on `npm run dev`)

### Fixed
- **`npm run db:reset`** deletes the SQLite file before migrations run (avoids failed ALTER on stale databases)
- SQLite migration for `auth_user_id` no longer uses `ADD COLUMN … UNIQUE` (unsupported in SQLite)

## [2026-05-25] — Remove PostgreSQL

### Removed
- **PostgreSQL / Supabase Postgres** support — app uses **SQLite only** (`data/church.db`)
- `pg` dependency, `server/schema.postgres.sql`, `server/migrate-pg.js`, and `scripts/test-supabase-connection.mjs`
- `npm run db:migrate:pg`, `db:reset:pg`, and `db:test:pg` scripts
- `DATABASE_URL` and `DATABASE_SSL` from `.env.example` and `render.yaml`

### Changed
- **Supabase Auth** is opt-in via `USE_SUPABASE_AUTH=true` (no longer tied to `DATABASE_URL`)
- **Supabase Storage** for uploads is opt-in via `USE_SUPABASE_STORAGE=true`
- README and deployment docs updated for SQLite-only setup

## [2026-05-24] — Sign-in debug logs

### Added
- **Sign-in trace** in the browser DevTools console only (`[sign-in +Nms]` steps) when running `npm run dev`

### Changed
- Removed on-page sign-in log panel; production builds do not emit sign-in console logs

## [2026-05-24] — Stale auth session and broken logo URL

### Fixed
- **Invalid Refresh Token**: expired Supabase sessions are cleared locally and the user is sent to login instead of retrying forever
- **Logo 404**: mangled upload filenames (`https___host_path.png`) are recovered to the original `https://` URL; missing `/uploads/` paths no longer return broken image URLs

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
