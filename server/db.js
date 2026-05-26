import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getPresetAbilitiesForName, serializeDepartmentAbilities } from "./department-abilities.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "church.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function resetDbConnection() {
  if (db) {
    db.close();
    db = null;
  }
}

export function initSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS church_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      tagline TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT NOT NULL,
      cell_id TEXT,
      fellowship_id TEXT,
      active INTEGER DEFAULT 1,
      joined_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      auth_user_id TEXT UNIQUE,
      member_id TEXT NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
      access_level TEXT DEFAULT 'standard',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fellowships (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      leader_id TEXT REFERENCES members(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cells (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fellowship_id TEXT NOT NULL REFERENCES fellowships(id) ON DELETE CASCADE,
      leader_id TEXT REFERENCES members(id) ON DELETE SET NULL,
      sub_leader_id TEXT REFERENCES members(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      head_id TEXT REFERENCES members(id) ON DELETE SET NULL,
      abilities TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS member_departments (
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      PRIMARY KEY (member_id, department_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('cell', 'service')),
      cell_id TEXT REFERENCES cells(id) ON DELETE SET NULL,
      fellowship_id TEXT REFERENCES fellowships(id) ON DELETE SET NULL,
      recorded_by TEXT REFERENCES members(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance_members (
      record_id TEXT NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
      is_newcomer INTEGER DEFAULT 0,
      PRIMARY KEY (record_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_guests (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      location TEXT,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      description TEXT,
      created_by TEXT REFERENCES members(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_rsvps (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (event_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      broadcast INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_recipients (
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      read INTEGER DEFAULT 0,
      PRIMARY KEY (message_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS finances (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
      description TEXT,
      purpose_type TEXT CHECK (purpose_type IN ('service', 'event', 'cell', 'outreach', 'general', 'other')),
      purpose_id TEXT,
      purpose_label TEXT,
      recorded_by TEXT REFERENCES members(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prayer_requests (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_private INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'prayed', 'answered')),
      response TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      stage TEXT NOT NULL CHECK (stage IN ('Visitor', 'New Convert', 'Cell Member', 'Worker')),
      assigned_to_id TEXT REFERENCES members(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follow_up_notes (
      id TEXT PRIMARY KEY,
      follow_up_id TEXT NOT NULL REFERENCES follow_ups(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      outcome TEXT,
      created_by TEXT REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target TEXT NOT NULL CHECK (target IN ('all', 'fellowship', 'cell', 'department', 'role')),
      target_id TEXT,
      target_role TEXT,
      pinned INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_by TEXT REFERENCES members(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      due_date TEXT NOT NULL,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      created_by TEXT REFERENCES members(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_assignees (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      notified INTEGER DEFAULT 0,
      PRIMARY KEY (task_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('audio', 'video', 'notes', 'slides')),
      speaker TEXT,
      series TEXT,
      topic TEXT,
      date TEXT,
      file_path TEXT,
      file_url TEXT,
      share_target TEXT,
      share_target_id TEXT,
      uploaded_by TEXT REFERENCES members(id),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT REFERENCES members(id),
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cell_reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('cell', 'fellowship', 'department')),
      submitter_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      cell_id TEXT REFERENCES cells(id) ON DELETE SET NULL,
      fellowship_id TEXT REFERENCES fellowships(id) ON DELETE SET NULL,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      period TEXT NOT NULL,
      attendance_count INTEGER DEFAULT 0,
      new_visitors INTEGER DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'overdue')),
      pastor_comment TEXT,
      due_date TEXT,
      submitted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      member_id TEXT REFERENCES members(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      type TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_members_cell ON members(cell_id);
    CREATE INDEX IF NOT EXISTS idx_members_fellowship ON members(fellowship_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
    CREATE INDEX IF NOT EXISTS idx_finances_date ON finances(date);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      member_id TEXT REFERENCES members(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  migrateColumns(db);
}

function migrateColumns(db) {
  const cols = db.prepare("PRAGMA table_info(members)").all().map((c) => c.name);
  if (!cols.includes("welfare_notes")) {
    db.exec("ALTER TABLE members ADD COLUMN welfare_notes TEXT");
  }
  if (!cols.includes("date_of_birth")) {
    db.exec("ALTER TABLE members ADD COLUMN date_of_birth TEXT");
  }
  const amCols = db.prepare("PRAGMA table_info(attendance_members)").all().map((c) => c.name);
  if (!amCols.includes("is_newcomer")) {
    db.exec("ALTER TABLE attendance_members ADD COLUMN is_newcomer INTEGER DEFAULT 0");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_guests (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact TEXT
    );
  `);
  const finCols = db.prepare("PRAGMA table_info(finances)").all().map((c) => c.name);
  if (!finCols.includes("purpose_type")) {
    db.exec("ALTER TABLE finances ADD COLUMN purpose_type TEXT");
  }
  if (!finCols.includes("purpose_id")) {
    db.exec("ALTER TABLE finances ADD COLUMN purpose_id TEXT");
  }
  if (!finCols.includes("purpose_label")) {
    db.exec("ALTER TABLE finances ADD COLUMN purpose_label TEXT");
  }
  const userCols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!userCols.includes("auth_user_id")) {
    db.exec("ALTER TABLE users ADD COLUMN auth_user_id TEXT");
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL"
    );
  }
  const reportCols = db.prepare("PRAGMA table_info(cell_reports)").all().map((c) => c.name);
  if (!reportCols.includes("description")) {
    db.exec("ALTER TABLE cell_reports ADD COLUMN description TEXT");
    if (reportCols.includes("prayer_points") || reportCols.includes("challenges")) {
      db.exec(`
        UPDATE cell_reports SET description = TRIM(
          CASE
            WHEN COALESCE(prayer_points, '') != '' AND COALESCE(challenges, '') != ''
              THEN prayer_points || char(10) || char(10) || challenges
            WHEN COALESCE(prayer_points, '') != '' THEN prayer_points
            WHEN COALESCE(challenges, '') != '' THEN challenges
            ELSE ''
          END
        )
        WHERE description IS NULL OR description = ''
      `);
    }
  }
  const mediaCols = db.prepare("PRAGMA table_info(media_items)").all().map((c) => c.name);
  if (!mediaCols.includes("status")) {
    db.exec("ALTER TABLE media_items ADD COLUMN status TEXT DEFAULT 'approved'");
    db.exec("UPDATE media_items SET status = 'approved' WHERE status IS NULL");
  }
  if (!mediaCols.includes("approved_by")) {
    db.exec("ALTER TABLE media_items ADD COLUMN approved_by TEXT REFERENCES members(id)");
  }
  if (!mediaCols.includes("approved_at")) {
    db.exec("ALTER TABLE media_items ADD COLUMN approved_at TEXT");
  }
  const fuCols = db.prepare("PRAGMA table_info(follow_ups)").all().map((c) => c.name);
  if (!fuCols.includes("member_id")) {
    db.exec("ALTER TABLE follow_ups ADD COLUMN member_id TEXT REFERENCES members(id) ON DELETE SET NULL");
  }
  const taskCols = db.prepare("PRAGMA table_info(tasks)").all().map((c) => c.name);
  if (!taskCols.includes("event_id")) {
    db.exec("ALTER TABLE tasks ADD COLUMN event_id TEXT REFERENCES events(id) ON DELETE CASCADE");
  }
  if (!taskCols.includes("sort_order")) {
    db.exec("ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0");
  }
  if (!taskCols.includes("scheduled_time")) {
    db.exec("ALTER TABLE tasks ADD COLUMN scheduled_time TEXT");
  }
  const eventCols = db.prepare("PRAGMA table_info(events)").all().map((c) => c.name);
  if (!eventCols.includes("programme_status")) {
    db.exec("ALTER TABLE events ADD COLUMN programme_status TEXT DEFAULT 'none'");
  }
  if (!eventCols.includes("programme_confirmed_at")) {
    db.exec("ALTER TABLE events ADD COLUMN programme_confirmed_at TEXT");
  }
  if (!eventCols.includes("programme_confirmed_by")) {
    db.exec("ALTER TABLE events ADD COLUMN programme_confirmed_by TEXT REFERENCES members(id) ON DELETE SET NULL");
  }
  const deptCols = db.prepare("PRAGMA table_info(departments)").all().map((c) => c.name);
  if (!deptCols.includes("abilities")) {
    db.exec("ALTER TABLE departments ADD COLUMN abilities TEXT DEFAULT '[]'");
    const depts = db.prepare("SELECT id, name, abilities FROM departments").all();
    const upd = db.prepare("UPDATE departments SET abilities = ? WHERE id = ?");
    for (const d of depts) {
      const current = d.abilities && d.abilities !== "[]" ? d.abilities : null;
      if (current) continue;
      const preset = serializeDepartmentAbilities(getPresetAbilitiesForName(d.name));
      upd.run(preset, d.id);
    }
  }
}

export function memberToJson(row, departmentIds = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    role: row.role,
    cellId: row.cell_id,
    fellowshipId: row.fellowship_id,
    departmentIds,
    active: !!row.active,
    joinedAt: row.joined_at,
    dateOfBirth: row.date_of_birth || null,
    welfareNotes: row.welfare_notes || "",
  };
}

export async function logActivity(_db, text, memberId = null) {
  const { dbRun } = await import("./store.js");
  await dbRun("INSERT INTO activities (id, text, member_id) VALUES (?, ?, ?)", [
    crypto.randomUUID(),
    text,
    memberId,
  ]);
}

export async function notifyMember(db, memberId, title, body, type = "info") {
  const { dbRun } = await import("./store.js");
  await dbRun(
    "INSERT INTO notifications (id, member_id, title, body, type) VALUES (?, ?, ?, ?, ?)",
    [crypto.randomUUID(), memberId, title, body, type]
  );
  try {
    const row = await (await import("./store.js")).dbGet(
      "SELECT m.email FROM members m WHERE m.id = ?",
      [memberId]
    );
    if (row?.email) {
      const { sendNotificationEmail } = await import("./email.js");
      await sendNotificationEmail(row.email, title, body || "");
    }
  } catch {
    /* email optional */
  }
}
