/** Recent activity log lines for dashboard / feeds. */
export async function listRecentActivities(db, limit = 30) {
  const rows = await db.prepare("SELECT * FROM activities ORDER BY created_at DESC LIMIT ?").all(limit);
  return rows.map((a) => ({ id: a.id, text: a.text, time: a.created_at }));
}
