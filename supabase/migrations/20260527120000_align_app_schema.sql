-- Align Supabase schema with the church management app (idempotent)

ALTER TABLE events ADD COLUMN IF NOT EXISTS programme_status TEXT DEFAULT 'none';
ALTER TABLE events ADD COLUMN IF NOT EXISTS programme_confirmed_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS programme_confirmed_by TEXT REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS fellowship_id TEXT REFERENCES fellowships(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cell_id TEXT REFERENCES cells(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_time TEXT;

ALTER TABLE departments ADD COLUMN IF NOT EXISTS abilities TEXT DEFAULT '[]';

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS member_id TEXT REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS enrolled_by TEXT REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE cell_reports ADD COLUMN IF NOT EXISTS description TEXT;

-- Allow announcements target 'leaders'
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_target_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_target_check
  CHECK (target IN ('all', 'fellowship', 'cell', 'department', 'role', 'leaders'));

-- Discipleship stages used by the app
ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_stage_check;
ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_stage_check
  CHECK (stage IN ('Invitee', 'New Convert', 'In Training', 'Graduated', 'Visitor', 'Cell Member', 'Worker'));

UPDATE follow_ups SET stage = 'Invitee' WHERE stage = 'Visitor';
UPDATE follow_ups SET stage = 'In Training' WHERE stage = 'Cell Member';
UPDATE follow_ups SET stage = 'Graduated' WHERE stage = 'Worker';

UPDATE media_items SET status = 'approved' WHERE status IS NULL;
