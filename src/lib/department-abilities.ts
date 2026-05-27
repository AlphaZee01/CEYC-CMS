import type { PageId } from "@/types/church";

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
] as const;

export type DepartmentAbility = (typeof DEPARTMENT_ABILITIES)[number];

export const ABILITY_LABELS: Record<DepartmentAbility, string> = {
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

const ABILITY_PAGE_MAP: Partial<Record<DepartmentAbility, PageId[]>> = {
  access_media: ["media"],
  access_tasks: ["tasks"],
  access_events: ["events"],
  access_report_submissions: ["report-submissions"],
  access_prayer: ["prayer"],
  access_discipleship: ["discipleship"],
  access_attendance: ["attendance"],
};

const PRESET_RULES: { match: (n: string) => boolean; abilities: DepartmentAbility[] }[] = [
  { match: (n) => /praise|worship/i.test(n), abilities: ["access_events", "manage_events", "access_tasks"] },
  { match: (n) => /usher/i.test(n), abilities: ["access_attendance", "record_service_attendance"] },
  { match: (n) => /children|kids|loveworld/i.test(n), abilities: ["access_events", "manage_events", "post_announcements"] },
  { match: (n) => /youth|ceyc/i.test(n), abilities: ["access_events", "access_discipleship", "access_report_submissions", "submit_department_report"] },
  { match: (n) => /prayer|intercession/i.test(n), abilities: ["access_prayer", "manage_prayer"] },
  { match: (n) => /media|technical/i.test(n), abilities: ["access_media", "upload_media"] },
  { match: (n) => /evangel/i.test(n), abilities: ["access_discipleship", "manage_discipleship", "submit_department_report"] },
  { match: (n) => /protocol|admin/i.test(n), abilities: ["access_tasks", "manage_tasks", "post_announcements"] },
];

export function getPresetAbilitiesForName(name: string): DepartmentAbility[] {
  const normalized = name.trim();
  for (const rule of PRESET_RULES) {
    if (rule.match(normalized)) return [...rule.abilities];
  }
  return [];
}

export function memberHasAbility(abilities: string[] | undefined, key: DepartmentAbility | string): boolean {
  return !!abilities?.includes(key);
}

export function pagesFromAbilities(abilities: string[]): PageId[] {
  const pages = new Set<PageId>();
  for (const ability of abilities) {
    for (const page of ABILITY_PAGE_MAP[ability as DepartmentAbility] || []) pages.add(page);
  }
  return [...pages];
}
