import { resolveUserPages } from "./rbac.js";

/** All supported department ability keys */
export const DEPARTMENT_ABILITIES = [
  "access_media",
  "upload_media",
  "access_tasks",
  "manage_tasks",
  "access_events",
  "manage_events",
  "access_report_submissions",
  "submit_department_report",
  "access_prayer",
  "manage_prayer",
  "access_discipleship",
  "manage_discipleship",
  "access_attendance",
  "record_service_attendance",
  "post_announcements",
];

export const ABILITY_LABELS = {
  access_media: "Access Media Library",
  upload_media: "Upload media (pending pastor approval)",
  access_tasks: "Access Tasks",
  manage_tasks: "Create and manage tasks",
  access_events: "Access Events",
  manage_events: "Create and manage events",
  access_report_submissions: "Access Report Submissions",
  submit_department_report: "Submit department reports",
  access_prayer: "Access Prayer Requests",
  manage_prayer: "Respond to prayer requests",
  access_discipleship: "Access Discipleship",
  manage_discipleship: "Manage new believers class",
  access_attendance: "Access Attendance",
  record_service_attendance: "Record service attendance",
  post_announcements: "Post announcements",
};

/** Nav pages granted by access_* abilities */
export const ABILITY_PAGE_MAP = {
  access_media: ["media"],
  access_tasks: ["tasks"],
  access_events: ["events"],
  access_report_submissions: ["report-submissions"],
  access_prayer: ["prayer"],
  access_discipleship: ["discipleship"],
  access_attendance: ["attendance"],
};

const PRESET_RULES = [
  { match: (n) => /praise|worship/i.test(n), abilities: ["access_events", "manage_events", "access_tasks"] },
  { match: (n) => /usher/i.test(n), abilities: ["access_attendance", "record_service_attendance"] },
  { match: (n) => /children|kids|loveworld/i.test(n), abilities: ["access_events", "manage_events", "post_announcements"] },
  { match: (n) => /youth|ceyc/i.test(n), abilities: ["access_events", "access_discipleship", "access_report_submissions", "submit_department_report"] },
  { match: (n) => /prayer|intercession/i.test(n), abilities: ["access_prayer", "manage_prayer"] },
  { match: (n) => /media|technical/i.test(n), abilities: ["access_media", "upload_media"] },
  { match: (n) => /evangel/i.test(n), abilities: ["access_discipleship", "manage_discipleship", "submit_department_report"] },
  { match: (n) => /protocol|admin/i.test(n), abilities: ["access_tasks", "manage_tasks", "post_announcements"] },
];

export function getPresetAbilitiesForName(name) {
  if (!name || typeof name !== "string") return [];
  const normalized = name.trim();
  for (const rule of PRESET_RULES) {
    if (rule.match(normalized)) return [...rule.abilities];
  }
  return [];
}

export function parseDepartmentAbilities(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((a) => DEPARTMENT_ABILITIES.includes(a));
  if (typeof raw === "object") return [];
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a) => DEPARTMENT_ABILITIES.includes(a));
  } catch {
    return [];
  }
}

export function serializeDepartmentAbilities(abilities) {
  const list = Array.isArray(abilities) ? abilities.filter((a) => DEPARTMENT_ABILITIES.includes(a)) : [];
  return JSON.stringify([...new Set(list)]);
}

export function memberHasAbility(abilities, key) {
  return Array.isArray(abilities) && abilities.includes(key);
}

export async function getMemberDepartmentAbilities(db, memberId) {
  const rows = await db
    .prepare(
      `SELECT d.abilities FROM departments d
       JOIN member_departments md ON md.department_id = d.id
       WHERE md.member_id = ?`
    )
    .all(memberId);
  const merged = new Set();
  for (const row of rows) {
    for (const a of parseDepartmentAbilities(row.abilities)) merged.add(a);
  }
  return [...merged];
}

export function pagesFromAbilities(abilities) {
  const pages = new Set();
  for (const ability of abilities || []) {
    for (const page of ABILITY_PAGE_MAP[ability] || []) pages.add(page);
  }
  return [...pages];
}

export function resolveEffectivePages(role, accessLevel, departmentAbilities = []) {
  const base = resolveUserPages(role, accessLevel);
  const extra = pagesFromAbilities(departmentAbilities);
  return [...new Set([...base, ...extra])];
}

export function canAccessPageWithAbilities(role, page, accessLevel = "standard", departmentAbilities = []) {
  return resolveEffectivePages(role, accessLevel, departmentAbilities).includes(page);
}

export function userHasAbility(user, key) {
  return memberHasAbility(user?.departmentAbilities, key);
}
