/** Shared DB helpers (church data lives in Supabase Postgres via store.js). */

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
