/** Idempotent column additions for databases created before the full CMS schema. */

const STATEMENTS = [
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS speaker TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS series TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS topic TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS date TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS file_path TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS file_url TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS share_target TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS share_target_id TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS uploaded_by TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS approved_by TEXT",
  "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS programme_status TEXT DEFAULT 'none'",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS programme_confirmed_at TIMESTAMPTZ",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS programme_confirmed_by TEXT",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS fellowship_id TEXT",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS cell_id TEXT",
  "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS event_id TEXT",
  "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_time TEXT",
  "ALTER TABLE departments ADD COLUMN IF NOT EXISTS abilities TEXT DEFAULT '[]'",
];

export async function alignPostgresSchema(pool) {
  for (const sql of STATEMENTS) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.warn("Schema align skipped:", err.message);
    }
  }
}
