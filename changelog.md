# Changelog

## [2025-05-22] — Production system (database + API + auth)

### Added
- **Express + SQLite backend** (`server/`) with persistent storage in `data/church.db`
- **JWT authentication** — real login; session stored in `localStorage`
- **REST API** for all modules: members, cells, fellowships, departments, attendance, events, messages, finances, prayers, follow-ups, announcements, tasks, media (multipart upload), reports, settings, admin users, notifications, activities
- **Server-side RBAC** — routes enforce role permissions; scoped member queries for leaders
- **Refactored frontend** into `src/pages/church/ChurchPages.tsx`, `AppLayout`, `AuthContext`, `api` client
- **Full feature completion**: member filters (cell/fellowship/department), leader reassignment, department heads, announcement targeting, task assignment + notifications, follow-up notes, media file upload, admin user management
- Scripts: `npm run dev` (client + server), `npm start` (production), `npm run db:reset`
- `.env.example` for `JWT_SECRET`, `PORT`, `SEED_PASSWORD`

### Changed
- Replaced in-memory demo state with API-driven persistence
- Default password for seeded accounts: `ChangeMe123!` (configurable via env)

### Removed
- Demo-only role switcher (replaced by real accounts; use different logins to test roles)

## [2025-05-22] — Initial demo (superseded)

- Single-file in-memory prototype (replaced by production architecture above)
