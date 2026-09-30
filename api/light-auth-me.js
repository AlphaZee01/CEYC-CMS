/**
 * Fast GET /api/auth/me on Vercel — Postgres + auth only, no full Express app import.
 */

import { initDatabase, getDb } from "../server/store.js";
import { resolveUserFromAuthHeader, resolvePagesForUser } from "../server/auth.js";
import { brandingFromSettings } from "../server/storage.js";

let dbReadyPromise = null;

function ensureDatabase() {
  if (!dbReadyPromise) {
    dbReadyPromise = initDatabase().catch((err) => {
      dbReadyPromise = null;
      throw err;
    });
  }
  return dbReadyPromise;
}

export function matchLightAuthMePath(req) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET") return false;
  const path = (req.url || "").split("?")[0];
  return path === "/api/auth/me" || path === "/auth/me";
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function handleLightAuthMe(req, res) {
  try {
    await ensureDatabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    console.error("light auth/me — database init failed:", message);
    sendJson(res, 503, { error: message });
    return true;
  }

  const auth = await resolveUserFromAuthHeader(req.headers?.authorization);
  if (!auth.user) {
    sendJson(res, auth.status || 401, { error: auth.error || "Unauthorized" });
    return true;
  }

  try {
    const settings = await getDb()
      .prepare("SELECT name, tagline, logo_url FROM church_settings WHERE id = 1")
      .get();
    sendJson(res, 200, {
      user: {
        id: auth.user.userId,
        email: auth.user.email,
        accessLevel: auth.user.accessLevel,
        member: auth.user.member,
      },
      pages: resolvePagesForUser(auth.user),
      departmentAbilities: auth.user.departmentAbilities || [],
      branding: brandingFromSettings(settings, req),
    });
  } catch (err) {
    console.error("light auth/me error:", err);
    sendJson(res, 500, { error: "Failed to load profile" });
  }
  return true;
}
