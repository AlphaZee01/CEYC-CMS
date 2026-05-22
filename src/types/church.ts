export type Role =
  | "Senior Pastor"
  | "Associate Pastor"
  | "Admin"
  | "Fellowship Leader"
  | "Cell Leader"
  | "Sub-cell Leader"
  | "Cell Member"
  | "Church Member";

export type PageId =
  | "dashboard"
  | "members"
  | "cells"
  | "departments"
  | "attendance"
  | "events"
  | "reports"
  | "settings"
  | "communications"
  | "finances"
  | "prayer"
  | "discipleship"
  | "announcements"
  | "tasks"
  | "media"
  | "report-submissions";

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  cellId: string | null;
  fellowshipId: string | null;
  departmentIds: string[];
  active: boolean;
  joinedAt: string;
  welfareNotes?: string;
}

export interface Fellowship {
  id: string;
  name: string;
  leaderId: string | null;
}

export interface Cell {
  id: string;
  name: string;
  fellowshipId: string;
  leaderId: string | null;
  subLeaderId: string | null;
}

export interface Department {
  id: string;
  name: string;
  headId: string | null;
  memberIds: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  accessLevel: string;
  member: Member;
}

export const PAGE_META: { id: PageId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "members", label: "Members" },
  { id: "cells", label: "Cells & Fellowships" },
  { id: "departments", label: "Ministry Departments" },
  { id: "attendance", label: "Attendance" },
  { id: "events", label: "Events" },
  { id: "reports", label: "Reports" },
  { id: "communications", label: "Communications" },
  { id: "finances", label: "Finances" },
  { id: "prayer", label: "Prayer Requests" },
  { id: "discipleship", label: "Discipleship" },
  { id: "announcements", label: "Announcements" },
  { id: "tasks", label: "Tasks" },
  { id: "media", label: "Media Library" },
  { id: "report-submissions", label: "Report Submissions" },
  { id: "settings", label: "Settings" },
];
