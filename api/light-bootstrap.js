/**
 * Fast GET /api/bootstrap on Vercel — no full Express app import.
 */

import { getDb } from "../server/store.js";
import { resolveUserFromAuthHeader } from "../server/auth.js";
import { buildBootstrapPayload } from "../server/bootstrap-payload.js";
import { ensureDatabase } from "./vercel-db.js";

export function matchLightBootstrapPath(req) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET") return false;
  const path = (req.url || "").split("?")[0];
  return path === "/api/bootstrap" || path === "/bootstrap";
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function handleLightBootstrap(req, res) {
  try {
    await ensureDatabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    console.error("light bootstrap — database init failed:", message);
    sendJson(res, 503, { error: message });
    return true;
  }

  const auth = await resolveUserFromAuthHeader(req.headers?.authorization);
  if (!auth.user) {
    sendJson(res, auth.status || 401, { error: auth.error || "Unauthorized" });
    return true;
  }

  try {
    const payload = await buildBootstrapPayload(getDb(), auth.user, req);
    sendJson(res, 200, payload);
  } catch (err) {
    console.error("light bootstrap error:", err);
    sendJson(res, 500, { error: "Failed to load app data" });
  }
  return true;
}
