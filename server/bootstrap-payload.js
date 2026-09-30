import { memberToJson } from "./db.js";
import { resolvePagesForUser } from "./auth.js";
import { scopeMemberFilter } from "./rbac.js";
import { parseDepartmentAbilities } from "./department-abilities.js";
import { brandingFromSettings } from "./storage.js";

function mapsFromMemberDepartmentRows(rows) {
  const byMember = new Map();
  const byDepartment = new Map();
  for (const r of rows) {
    if (!byMember.has(r.member_id)) byMember.set(r.member_id, []);
    byMember.get(r.member_id).push(r.department_id);
    if (!byDepartment.has(r.department_id)) byDepartment.set(r.department_id, []);
    byDepartment.get(r.department_id).push(r.member_id);
  }
  return { byMember, byDepartment };
}

export function departmentToJson(d, memberIds) {
  return {
    id: d.id,
    name: d.name,
    headId: d.head_id,
    memberIds,
    abilities: parseDepartmentAbilities(d.abilities),
  };
}

/** Build JSON body for GET /api/bootstrap (Express + Vercel light handler). */
export async function buildBootstrapPayload(db, user, req) {
  const scope = scopeMemberFilter({
    id: user.member.id,
    role: user.member.role,
    fellowship_id: user.member.fellowshipId,
    cell_id: user.member.cellId,
  });

  const [memberRows, fellowshipRows, cellRows, deptRows, settings, memberDeptRows] = await Promise.all([
    db.prepare(`SELECT * FROM members WHERE active = 1 AND ${scope.sql} ORDER BY name`).all(...scope.params),
    db.prepare("SELECT * FROM fellowships ORDER BY name").all(),
    db.prepare("SELECT * FROM cells ORDER BY name").all(),
    db.prepare("SELECT * FROM departments ORDER BY name").all(),
    db.prepare("SELECT * FROM church_settings WHERE id = 1").get(),
    db.prepare("SELECT member_id, department_id FROM member_departments").all(),
  ]);

  const { byMember: deptMap, byDepartment: departmentMembersMap } = mapsFromMemberDepartmentRows(memberDeptRows);
  const members = memberRows.map((m) => memberToJson(m, deptMap.get(m.id) || []));
  const fellowships = fellowshipRows.map((f) => ({
    id: f.id,
    name: f.name,
    leaderId: f.leader_id,
  }));
  const cells = cellRows.map((c) => ({
    id: c.id,
    name: c.name,
    fellowshipId: c.fellowship_id,
    leaderId: c.leader_id,
    subLeaderId: c.sub_leader_id,
  }));
  const departments = deptRows.map((d) => departmentToJson(d, departmentMembersMap.get(d.id) || []));
  const branding = brandingFromSettings(settings, req);

  return {
    members,
    fellowships,
    cells,
    departments,
    settings: settings
      ? {
          name: branding.name,
          tagline: branding.tagline,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          logoUrl: branding.logoUrl,
        }
      : {},
    pages: resolvePagesForUser(user),
    departmentAbilities: user.departmentAbilities || [],
  };
}
