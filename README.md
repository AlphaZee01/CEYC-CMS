# Christ Embassy — Local Church Management System

A demo-ready React + Tailwind CSS church management application. All state lives in memory (no backend). Built as a single-file app in `src/App.tsx`.

## Features

- **16 modules**: Dashboard, Members, Cells & Fellowships, Departments, Attendance, Events, Reports, Communications, Finances, Prayer Requests, Discipleship, Announcements, Tasks, Media Library, Report Submissions, Settings
- **Role-based access**: Senior Pastor, Associate Pastor, Admin, Fellowship Leader, Cell Leader, Sub-cell Leader, Cell Member, Church Member
- **Demo role switcher**: Settings → simulate any user role
- **Charts**: Recharts for analytics on the Reports page
- **Icons**: Lucide React

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Default login (demo)

The app loads as **Rev. David Okonkwo** (Senior Pastor). Use **Settings → Demo Role Switcher** to preview other roles and their page access.

## Tech stack

- React 18 + Vite
- Tailwind CSS
- Recharts
- lucide-react
