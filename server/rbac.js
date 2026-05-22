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
    "dashboard", "members", "attendance", "communications", "report-submissions", "announcements", "events", "prayer",
  ],
  "Sub-cell Leader": [
    "dashboard", "members", "attendance", "communications", "announcements", "events",
  ],
  "Cell Member": [
    "dashboard", "communications", "prayer", "media", "announcements", "events",
  ],
  "Church Member": [
    "dashboard", "communications", "prayer", "media", "announcements", "events",
  ],
};

export function canAccessPage(role, page) {
  return PAGE_ACCESS[role]?.includes(page) ?? false;
}

export function canAccessFinances(role) {
  return role === "Senior Pastor" || role === "Admin";
}

export function canManageSettings(role) {
  return role === "Senior Pastor" || role === "Admin";
}

export function canUploadMedia(role) {
  return ["Senior Pastor", "Associate Pastor", "Admin"].includes(role);
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
      return target.cell_id === sender.cell_id;
    default:
      return ["Cell Leader", "Sub-cell Leader", "Senior Pastor", "Associate Pastor", "Fellowship Leader"].includes(
        target.role
      );
  }
}
