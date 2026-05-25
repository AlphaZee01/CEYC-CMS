export const PAGE_ACCESS = {
  "Senior Pastor": [
    "dashboard", "members", "cells", "departments", "attendance", "events", "reports",
    "settings", "communications", "finances", "prayer", "discipleship", "announcements",
    "tasks", "media", "report-submissions",
  ],
  "Associate Pastor": [
    "dashboard", "members", "cells", "departments", "attendance", "events", "reports",
    "communications", "prayer", "discipleship", "announcements", "tasks", "media", "report-submissions",
  ],
  Admin: [
    "dashboard", "members", "attendance", "finances", "settings", "announcements", "tasks", "communications",
  ],
  "Fellowship Leader": [
    "dashboard", "members", "cells", "attendance", "communications", "report-submissions", "announcements", "events",
  ],
  "Cell Leader": [
    "dashboard", "members", "attendance", "communications", "report-submissions", "announcements", "events", "prayer", "media",
  ],
  "Sub-cell Leader": [
    "dashboard", "members", "attendance", "communications", "announcements", "events", "report-submissions",
  ],
  "Cell Member": [
    "dashboard", "communications", "prayer", "media", "announcements", "events",
  ],
  "Church Member": [
    "dashboard", "communications", "prayer", "media", "announcements", "events",
  ],
};

/** Extended pages for Admin users with full/admin access level */
const ADMIN_EXTENDED_PAGES = [
  "departments", "cells", "reports", "events", "prayer", "discipleship", "media", "report-submissions",
];

export function resolveUserPages(role, accessLevel = "standard") {
  let pages = [...(PAGE_ACCESS[role] || [])];
  if (role === "Admin" && (accessLevel === "admin" || accessLevel === "full")) {
    pages = [...new Set([...pages, ...ADMIN_EXTENDED_PAGES])];
  }
  return [...new Set(pages)];
}

export function canAccessPage(role, page, accessLevel = "standard") {
  return resolveUserPages(role, accessLevel).includes(page);
}

export function canAccessFinances(role) {
  return role === "Senior Pastor" || role === "Admin";
}

export function canManageSettings(role) {
  return role === "Senior Pastor" || role === "Admin";
}

export function canApproveMedia(role) {
  return role === "Senior Pastor" || role === "Associate Pastor";
}

export async function isMediaTeamMember(db, memberId) {
  const inDept = await db
    .prepare(
      `SELECT 1 FROM member_departments md
       JOIN departments d ON d.id = md.department_id
       WHERE md.member_id = ? AND d.name LIKE '%Media%'`
    )
    .get(memberId);
  if (inDept) return true;
  const head = await db
    .prepare("SELECT 1 FROM departments WHERE head_id = ? AND name LIKE '%Media%'")
    .get(memberId);
  return !!head;
}

export async function canUploadMedia(db, member) {
  if (["Senior Pastor", "Associate Pastor", "Admin"].includes(member.role)) return true;
  return isMediaTeamMember(db, member.id);
}

export function canViewAllMedia(role) {
  return ["Senior Pastor", "Associate Pastor", "Admin"].includes(role) || canApproveMedia(role);
}

export function canManageEvents(role) {
  return ["Senior Pastor", "Associate Pastor", "Admin", "Fellowship Leader"].includes(role);
}

export async function isDepartmentHead(db, memberId) {
  return !!(await db.prepare("SELECT 1 FROM departments WHERE head_id = ?").get(memberId));
}

export function scopeMemberFilter(user) {
  const { role, fellowship_id, cell_id, id } = user;
  if (role === "Fellowship Leader" && fellowship_id) {
    return { sql: "(fellowship_id = ? OR id = ?)", params: [fellowship_id, id] };
  }
  if ((role === "Cell Leader" || role === "Sub-cell Leader") && cell_id) {
    return { sql: "(cell_id = ? OR id = ?)", params: [cell_id, id] };
  }
  if (role === "Cell Member" || role === "Church Member") {
    return { sql: "id = ?", params: [id] };
  }
  return { sql: "1=1", params: [] };
}

export async function canViewMember(db, actor, memberId) {
  if (actor.id === memberId) return true;
  const scope = scopeMemberFilter({
    id: actor.id,
    role: actor.role,
    fellowship_id: actor.fellowship_id ?? actor.fellowshipId,
    cell_id: actor.cell_id ?? actor.cellId,
  });
  const row = await db
    .prepare(`SELECT id FROM members WHERE id = ? AND (${scope.sql})`)
    .get(memberId, ...scope.params);
  return !!row;
}

export function canMessageTarget(sender, target) {
  if (sender.id === target.id) return false;
  switch (sender.role) {
    case "Senior Pastor":
      return true;
    case "Associate Pastor":
      return target.role !== "Senior Pastor";
    case "Admin":
      return true;
    case "Fellowship Leader":
      return target.fellowship_id === sender.fellowship_id;
    case "Cell Leader":
    case "Sub-cell Leader":
      if (target.cell_id === sender.cell_id) return true;
      if (["Senior Pastor", "Associate Pastor", "Admin"].includes(target.role)) return true;
      if (target.role === "Fellowship Leader" && target.fellowship_id === sender.fellowship_id) return true;
      return false;
    default:
      return ["Cell Leader", "Sub-cell Leader", "Senior Pastor", "Associate Pastor", "Fellowship Leader", "Admin"].includes(
        target.role
      );
  }
}

export const ROLE_RANK = {
  "Church Member": 0,
  "Cell Member": 0,
  "Sub-cell Leader": 1,
  "Cell Leader": 2,
  "Fellowship Leader": 3,
  Admin: 4,
  "Associate Pastor": 5,
  "Senior Pastor": 6,
};

const CELL_SCOPED_ROLES = new Set(["Cell Leader", "Sub-cell Leader"]);

export const ASSIGNABLE_ROLES = {
  "Senior Pastor": ["Senior Pastor", "Associate Pastor", "Admin", "Fellowship Leader", "Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  "Associate Pastor": ["Associate Pastor", "Admin", "Fellowship Leader", "Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  Admin: ["Admin", "Fellowship Leader", "Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  "Fellowship Leader": ["Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  "Cell Leader": ["Sub-cell Leader", "Cell Member", "Church Member"],
  "Sub-cell Leader": ["Cell Member", "Church Member"],
};

export function roleRank(role) {
  return ROLE_RANK[role] ?? -1;
}

export function isCellScopedRole(role) {
  return CELL_SCOPED_ROLES.has(role);
}

export function assignableRolesFor(actorRole) {
  return ASSIGNABLE_ROLES[actorRole] || [];
}

export function canAssignRole(actorRole, targetRole) {
  return assignableRolesFor(actorRole).includes(targetRole);
}

function sameCell(actor, target) {
  return actor.cell_id && actor.cell_id === target.cell_id;
}

function sameFellowship(actor, target) {
  return actor.fellowship_id && actor.fellowship_id === target.fellowship_id;
}

export function canManageMember(actor, target) {
  if (!target?.id) return false;
  if (actor.id === target.id) return false;

  const targetRank = roleRank(target.role);

  if (["Senior Pastor", "Associate Pastor"].includes(actor.role)) return true;
  if (actor.role === "Admin") return targetRank <= roleRank("Admin");

  if (actor.role === "Fellowship Leader") {
    return sameFellowship(actor, target) && targetRank < roleRank("Fellowship Leader");
  }

  if (isCellScopedRole(actor.role)) {
    return sameCell(actor, target) && targetRank < roleRank("Cell Leader");
  }

  return false;
}

export function canCreateMembers(actorRole) {
  return !["Cell Member", "Church Member"].includes(actorRole);
}

export function validateMemberCreate(actor, { role, cellId, fellowshipId }) {
  if (!canCreateMembers(actor.role)) {
    return { ok: false, error: "You cannot add members" };
  }
  if (!canAssignRole(actor.role, role)) {
    return { ok: false, error: `You cannot assign the role "${role}"` };
  }
  if (isCellScopedRole(actor.role)) {
    if (cellId && cellId !== actor.cell_id) {
      return { ok: false, error: "You can only add members to your own cell" };
    }
    if (fellowshipId && fellowshipId !== actor.fellowship_id) {
      return { ok: false, error: "You cannot assign members outside your fellowship" };
    }
    return { ok: true, cellId: actor.cell_id, fellowshipId: actor.fellowship_id };
  }
  if (actor.role === "Fellowship Leader") {
    if (fellowshipId && fellowshipId !== actor.fellowship_id) {
      return { ok: false, error: "You can only add members to your fellowship" };
    }
  }
  return { ok: true, cellId, fellowshipId };
}

export async function validateMemberUpdate(db, actor, memberId, updates) {
  const target = await db.prepare("SELECT * FROM members WHERE id = ?").get(memberId);
  if (!target) return { ok: false, error: "Member not found", status: 404 };
  if (!canManageMember(actor, target)) {
    return { ok: false, error: "You cannot edit this member", status: 403 };
  }
  if (updates.role && !canAssignRole(actor.role, updates.role)) {
    return { ok: false, error: `You cannot assign the role "${updates.role}"`, status: 403 };
  }
  if (isCellScopedRole(actor.role)) {
    if (updates.cellId !== undefined && updates.cellId !== actor.cell_id) {
      return { ok: false, error: "You cannot move members out of your cell", status: 403 };
    }
    if (updates.fellowshipId !== undefined && updates.fellowshipId !== actor.fellowship_id) {
      return { ok: false, error: "You cannot change fellowship assignment", status: 403 };
    }
  }
  if (actor.role === "Fellowship Leader") {
    if (updates.fellowshipId !== undefined && updates.fellowshipId !== actor.fellowship_id) {
      return { ok: false, error: "You cannot move members out of your fellowship", status: 403 };
    }
  }
  return { ok: true, target };
}

export function canRecordAttendance(actor, { type, cellId }) {
  if (["Senior Pastor", "Associate Pastor", "Admin"].includes(actor.role)) return true;
  if (actor.role === "Fellowship Leader") return type === "cell" || type === "service";
  if (isCellScopedRole(actor.role)) {
    if (type === "service") return false;
    return type === "cell" && cellId === actor.cell_id;
  }
  return false;
}

export function scopeAttendanceFilter(user) {
  if (isCellScopedRole(user.role) && user.cell_id) {
    return { sql: "ar.cell_id = ?", params: [user.cell_id] };
  }
  if (user.role === "Fellowship Leader" && user.fellowship_id) {
    return { sql: "ar.fellowship_id = ?", params: [user.fellowship_id] };
  }
  return { sql: "1=1", params: [] };
}

export function canEditCellAttendance(actor, record) {
  if (!record || record.type !== "cell") return false;
  const recordCellId = record.cell_id ?? record.cellId;
  const recordFellowshipId = record.fellowship_id ?? record.fellowshipId;
  const actorCellId = actor.cell_id ?? actor.cellId;
  const actorFellowshipId = actor.fellowship_id ?? actor.fellowshipId;
  if (["Senior Pastor", "Associate Pastor", "Admin"].includes(actor.role)) return true;
  if (actor.role === "Fellowship Leader") {
    return actorFellowshipId && actorFellowshipId === recordFellowshipId;
  }
  if (isCellScopedRole(actor.role)) {
    return actorCellId && actorCellId === recordCellId;
  }
  return false;
}
