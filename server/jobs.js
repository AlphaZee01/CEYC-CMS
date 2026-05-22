import { getDb, notifyMember, logActivity } from "./db.js";

export function markOverdueReports() {
  const db = getDb();
  const overdue = db
    .prepare(
      `SELECT id, submitter_id, period, type FROM cell_reports
       WHERE due_date IS NOT NULL AND due_date < date('now')
       AND status IN ('draft', 'submitted')`
    )
    .all();

  const update = db.prepare(`UPDATE cell_reports SET status = 'overdue' WHERE id = ?`);
  const pastors = db
    .prepare(`SELECT id FROM members WHERE role IN ('Senior Pastor', 'Associate Pastor') AND active = 1`)
    .all();

  for (const r of overdue) {
    const current = db.prepare("SELECT status FROM cell_reports WHERE id = ?").get(r.id);
    if (current?.status === "overdue") continue;
    update.run(r.id);
    notifyMember(db, r.submitter_id, "Report overdue", `Your ${r.type} report (${r.period}) is overdue.`, "report");
    pastors.forEach((p) =>
      notifyMember(db, p.id, "Overdue report", `${r.type} report ${r.period} is overdue.`, "report")
    );
    logActivity(db, `Report marked overdue: ${r.period}`, r.submitter_id);
  }
  return overdue.length;
}

export function startJobs() {
  markOverdueReports();
  const intervalMs = Number(process.env.JOBS_INTERVAL_MS) || 60 * 60 * 1000;
  setInterval(markOverdueReports, intervalMs);
  console.log(`Background jobs started (overdue reports every ${intervalMs / 1000}s)`);
}
