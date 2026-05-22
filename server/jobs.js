import { getDb, notifyMember, logActivity } from "./db.js";

export async function markOverdueReports() {
  const db = getDb();
  const overdue = await db
    .prepare(
      `SELECT id, submitter_id, period, type FROM cell_reports
       WHERE due_date IS NOT NULL AND due_date < date('now')
       AND status IN ('draft', 'submitted')`
    )
    .all();

  for (const r of overdue) {
    const current = await db.prepare("SELECT status FROM cell_reports WHERE id = ?").get(r.id);
    if (current?.status === "overdue") continue;
    await db.prepare(`UPDATE cell_reports SET status = 'overdue' WHERE id = ?`).run(r.id);
    await notifyMember(db, r.submitter_id, "Report overdue", `Your ${r.type} report (${r.period}) is overdue.`, "report");
    const pastors = await db
      .prepare(`SELECT id FROM members WHERE role IN ('Senior Pastor', 'Associate Pastor') AND active = 1`)
      .all();
    for (const p of pastors) {
      await notifyMember(db, p.id, "Overdue report", `${r.type} report ${r.period} is overdue.`, "report");
    }
    await logActivity(db, `Report marked overdue: ${r.period}`, r.submitter_id);
  }
  return overdue.length;
}

export function startJobs() {
  markOverdueReports().catch(console.error);
  const intervalMs = Number(process.env.JOBS_INTERVAL_MS) || 60 * 60 * 1000;
  setInterval(() => markOverdueReports().catch(console.error), intervalMs);
  console.log(`Background jobs started (overdue reports every ${intervalMs / 1000}s)`);
}
