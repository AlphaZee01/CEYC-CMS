import "dotenv/config";
import { initDatabase, getDb, closeDatabase } from "../server/store.js";

await initDatabase();
const db = getDb();

try {
  const growth = await db
    .prepare(
      `SELECT strftime('%Y-%m', joined_at) as month, COUNT(*) as members
       FROM members WHERE active = 1 GROUP BY month ORDER BY month`
    )
    .all();
  console.log("growth", growth);

  const dept = await db
    .prepare(
      `SELECT d.name, COUNT(md.member_id) + CASE WHEN d.head_id IS NOT NULL THEN 1 ELSE 0 END as value
       FROM departments d
       LEFT JOIN member_departments md ON md.department_id = d.id
       GROUP BY d.id, d.name, d.head_id`
    )
    .all();
  console.log("dept", dept);

  const trends = await db
    .prepare(
      `SELECT ar.date, COALESCE(c.name, 'Sunday Service') as cell_name,
       SUM(CASE WHEN am.status = 'present' THEN 1 ELSE 0 END) as present_count
       FROM attendance_records ar
       JOIN attendance_members am ON am.record_id = ar.id
       LEFT JOIN cells c ON c.id = ar.cell_id
       WHERE ar.date >= date('now', '-365 days')
       GROUP BY ar.date, ar.cell_id, c.name, ar.type
       ORDER BY ar.date`
    )
    .all();
  console.log("trends count", trends.length, trends.slice(0, 2));
} catch (e) {
  console.error("ERR", e.message);
}

await closeDatabase();
