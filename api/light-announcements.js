import { getDb } from "../server/store.js";
import { resolveUserFromAuthHeader } from "../server/auth.js";
import { canAccessPage } from "../server/rbac.js";
import { listAnnouncementsForUser } from "../server/announcements-feed.js";
import { ensureDatabase } from "./vercel-db.js";

export function matchLightAnnouncementsPath(req) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET") return false;
  const path = (req.url || "").split("?")[0];
  return path === "/api/announcements" || path === "/announcements";
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function handleLightAnnouncements(req, res) {
  try {
    await ensureDatabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    sendJson(res, 503, { error: message });
    return true;
  }

  const auth = await resolveUserFromAuthHeader(req.headers?.authorization);
  if (!auth.user) {
    sendJson(res, auth.status || 401, { error: auth.error || "Unauthorized" });
    return true;
  }

  if (!canAccessPage(auth.user.member.role, "announcements", auth.user.accessLevel, auth.user.departmentAbilities)) {
    sendJson(res, 403, { error: "Access denied" });
    return true;
  }

  try {
    const rows = await listAnnouncementsForUser(getDb(), auth.user);
    sendJson(res, 200, rows);
  } catch (err) {
    console.error("[light announcements]", err);
    sendJson(res, 500, { error: "Failed to load announcements" });
  }
  return true;
}
