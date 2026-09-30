import { canPostAnnouncementsForUser, receivesLeadersAnnouncement } from "./rbac.js";

export function announcementToJson(a) {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    target: a.target,
    targetId: a.target_id,
    targetRole: a.target_role,
    pinned: !!a.pinned,
    expiresAt: a.expires_at,
    createdAt: a.created_at,
    createdBy: a.created_by,
  };
}

export async function filterAnnouncementsForMember(db, member, departmentAbilities, rows) {
  const canManage = canPostAnnouncementsForUser(member.role, departmentAbilities);
  const filtered = [];
  for (const a of rows) {
    if (canManage) {
      filtered.push(a);
      continue;
    }
    if (a.target === "all") {
      filtered.push(a);
      continue;
    }
    if (a.target === "fellowship" && a.target_id === member.fellowshipId) {
      filtered.push(a);
      continue;
    }
    if (a.target === "cell" && a.target_id === member.cellId) {
      filtered.push(a);
      continue;
    }
    if (a.target === "department") {
      const inDept = await db
        .prepare("SELECT 1 FROM member_departments WHERE member_id = ? AND department_id = ?")
        .get(member.id, a.target_id);
      if (inDept) filtered.push(a);
      continue;
    }
    if (a.target === "role" && a.target_role === member.role) filtered.push(a);
    if (a.target === "leaders" && (await receivesLeadersAnnouncement(db, member))) filtered.push(a);
  }
  return filtered;
}

export async function listAnnouncementsForUser(db, user) {
  const m = user.member;
  const abilities = user.departmentAbilities || [];
  const canManage = canPostAnnouncementsForUser(m.role, abilities);
  const all = await db
    .prepare(
      canManage
        ? "SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC"
        : "SELECT * FROM announcements WHERE expires_at >= date('now') ORDER BY pinned DESC, created_at DESC"
    )
    .all();
  const filtered = await filterAnnouncementsForMember(db, m, abilities, all);
  return filtered.map(announcementToJson);
}
