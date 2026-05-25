import type { Member, Role } from "@/types/church";

export const ROLE_RANK: Record<Role, number> = {
  "Church Member": 0,
  "Cell Member": 0,
  "Sub-cell Leader": 1,
  "Cell Leader": 2,
  "Fellowship Leader": 3,
  Admin: 4,
  "Associate Pastor": 5,
  "Senior Pastor": 6,
};

export const ASSIGNABLE_ROLES: Partial<Record<Role, Role[]>> = {
  "Senior Pastor": ["Senior Pastor", "Associate Pastor", "Admin", "Fellowship Leader", "Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  "Associate Pastor": ["Associate Pastor", "Admin", "Fellowship Leader", "Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  Admin: ["Admin", "Fellowship Leader", "Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  "Fellowship Leader": ["Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member"],
  "Cell Leader": ["Sub-cell Leader", "Cell Member", "Church Member"],
  "Sub-cell Leader": ["Cell Member", "Church Member"],
};

export function isCellScopedRole(role: Role) {
  return role === "Cell Leader" || role === "Sub-cell Leader";
}

export function assignableRolesFor(actorRole: Role): Role[] {
  return ASSIGNABLE_ROLES[actorRole] || [];
}

export function canCreateMembers(role: Role) {
  return !["Cell Member", "Church Member"].includes(role);
}

export function canManageMember(actor: Member, target: Member) {
  if (actor.id === target.id) return false;

  const targetRank = ROLE_RANK[target.role] ?? -1;

  if (["Senior Pastor", "Associate Pastor"].includes(actor.role)) return true;
  if (actor.role === "Admin") return targetRank <= ROLE_RANK.Admin;

  if (actor.role === "Fellowship Leader") {
    return actor.fellowshipId === target.fellowshipId && targetRank < ROLE_RANK["Fellowship Leader"];
  }

  if (isCellScopedRole(actor.role)) {
    return actor.cellId === target.cellId && targetRank < ROLE_RANK["Cell Leader"];
  }

  return false;
}

export function canRecordServiceAttendance(role: Role) {
  return !isCellScopedRole(role);
}

export function canManageEvents(role: Role) {
  return ["Senior Pastor", "Associate Pastor", "Admin", "Fellowship Leader"].includes(role);
}

export function canApproveMedia(role: Role) {
  return role === "Senior Pastor" || role === "Associate Pastor";
}

export function canEditCellAttendance(
  role: Role,
  record: { type: string; cellId?: string | null; fellowshipId?: string | null },
  actor: { cellId?: string | null; fellowshipId?: string | null }
) {
  if (record.type !== "cell") return false;
  if (["Senior Pastor", "Associate Pastor", "Admin"].includes(role)) return true;
  if (role === "Fellowship Leader") {
    return !!actor.fellowshipId && actor.fellowshipId === record.fellowshipId;
  }
  if (isCellScopedRole(role)) {
    return !!actor.cellId && actor.cellId === record.cellId;
  }
  return false;
}

export function canViewWelfareNotes(role: Role) {
  return role === "Senior Pastor" || role === "Admin";
}

export function memberProfilePath(memberId: string) {
  return `/app/members/${memberId}`;
}

export function membersPageSubtitle(role: Role, cellName?: string) {
  if (isCellScopedRole(role)) {
    return cellName ? `Manage members in ${cellName}` : "Manage members in your cell";
  }
  if (role === "Fellowship Leader") {
    return "Manage members in your fellowship";
  }
  return "Directory & role management";
}
