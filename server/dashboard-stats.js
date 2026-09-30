import { canAccessPage, isCellScopedRole, scopeMemberFilter } from "./rbac.js";

/** Shared by Express and Vercel light handler. */
export async function buildDashboardStats(db, user) {
  if (!canAccessPage(user.member.role, "dashboard", user.accessLevel, user.departmentAbilities || [])) {
    return { status: 403, body: { error: "Access denied" } };
  }

  const actor = user.member;

  if (isCellScopedRole(actor.role)) {
    const scope = scopeMemberFilter({
      id: actor.id,
      role: actor.role,
      fellowship_id: actor.fellowshipId,
      cell_id: actor.cellId,
    });
    const m = await db
      .prepare(`SELECT COUNT(*) as c FROM members m WHERE m.active = 1 AND ${scope.sql}`)
      .get(...scope.params);
    const lastCell = await db
      .prepare(
        `SELECT ar.date FROM attendance_records ar
         WHERE ar.type = 'cell' AND ar.cell_id = ? ORDER BY ar.date DESC LIMIT 1`
      )
      .get(actor.cellId);
    return {
      status: 200,
      body: {
        members: Number(m?.c ?? 0),
        cells: 1,
        fellowships: 1,
        departments: 0,
        lastCellMeeting: lastCell?.date || null,
        scoped: "cell",
      },
    };
  }

  const [m, c, f, d] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM members WHERE active = 1").get(),
    db.prepare("SELECT COUNT(*) as c FROM cells").get(),
    db.prepare("SELECT COUNT(*) as c FROM fellowships").get(),
    db.prepare("SELECT COUNT(*) as c FROM departments").get(),
  ]);

  return {
    status: 200,
    body: {
      members: Number(m?.c ?? 0),
      cells: Number(c?.c ?? 0),
      fellowships: Number(f?.c ?? 0),
      departments: Number(d?.c ?? 0),
    },
  };
}
