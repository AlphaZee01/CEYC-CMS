# Changelog

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
