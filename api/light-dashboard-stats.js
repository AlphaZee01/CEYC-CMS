/**
 * Fast GET /api/dashboard/stats on Vercel — no full Express app import.
 */

import { getDb } from "../server/store.js";
import { resolveUserFromAuthHeader } from "../server/auth.js";
import { buildDashboardStats } from "../server/dashboard-stats.js";
import { ensureDatabase } from "./vercel-db.js";

export function matchLightDashboardStatsPath(req) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET") return false;
  const path = (req.url || "").split("?")[0];
  return path === "/api/dashboard/stats" || path === "/dashboard/stats";
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function handleLightDashboardStats(req, res) {
  try {
    await ensureDatabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    console.error("[light dashboard/stats] database init failed:", message);
    sendJson(res, 503, { error: message });
    return true;
  }

  const auth = await resolveUserFromAuthHeader(req.headers?.authorization);
  if (!auth.user) {
    sendJson(res, auth.status || 401, { error: auth.error || "Unauthorized" });
    return true;
  }

  try {
    const result = await buildDashboardStats(getDb(), auth.user);
    sendJson(res, result.status, result.body);
  } catch (err) {
    console.error("[light dashboard/stats] error:", err);
    sendJson(res, 500, { error: "Failed to load dashboard stats" });
  }
  return true;
}
