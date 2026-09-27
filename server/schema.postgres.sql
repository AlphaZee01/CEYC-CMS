-- CEYC CMS application schema (Postgres / Supabase)

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  welfare_notes TEXT,
  date_of_birth TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  auth_user_id TEXT UNIQUE,
  member_id TEXT NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

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

ALTER TABLE members
  ADD CONSTRAINT members_cell_id_fkey FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE SET NULL;
ALTER TABLE members
  ADD CONSTRAINT members_fellowship_id_fkey FOREIGN KEY (fellowship_id) REFERENCES fellowships(id) ON DELETE SET NULL;

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
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  fellowship_id TEXT REFERENCES fellowships(id) ON DELETE SET NULL,
  cell_id TEXT REFERENCES cells(id) ON DELETE SET NULL,
  programme_status TEXT DEFAULT 'none',
  programme_confirmed_at TIMESTAMPTZ,
  programme_confirmed_by TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, member_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  broadcast INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW()
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
  amount DOUBLE PRECISION NOT NULL,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  description TEXT,
  purpose_type TEXT CHECK (purpose_type IN ('service', 'event', 'cell', 'outreach', 'general', 'other')),
  purpose_id TEXT,
  purpose_label TEXT,
  recorded_by TEXT REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prayer_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'prayed', 'answered')),
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('Invitee', 'New Convert', 'In Training', 'Graduated')),
  assigned_to_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  enrolled_by TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  target TEXT NOT NULL CHECK (target IN ('all', 'fellowship', 'cell', 'department', 'role', 'leaders')),
  target_id TEXT,
  target_role TEXT,
  pinned INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_by TEXT REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  due_date TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order INTEGER DEFAULT 0,
  scheduled_time TEXT,
  created_by TEXT REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  member_id TEXT REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_cell ON members(cell_id);
CREATE INDEX IF NOT EXISTS idx_members_fellowship ON members(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_finances_date ON finances(date);
