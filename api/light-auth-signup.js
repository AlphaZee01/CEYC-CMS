/**
 * Fast POST /api/auth/signup on Vercel — no full Express app import.
 */

import { ensureDatabase } from "./vercel-db.js";
import { readJsonBody } from "./read-json-body.js";
import { registerPublicUser } from "../server/public-signup.js";

export function matchLightAuthSignupPath(req) {
  const method = (req.method || "POST").toUpperCase();
  if (method !== "POST") return false;
  const path = (req.url || "").split("?")[0];
  return path === "/api/auth/signup" || path === "/auth/signup";
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function handleLightAuthSignup(req, res) {
  try {
    await ensureDatabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    console.error("[light auth/signup] database init failed:", message);
    sendJson(res, 503, { error: message });
    return true;
  }

  try {
    const body = await readJsonBody(req);
    const started = Date.now();
    const result = await registerPublicUser(body);
    console.log("[light auth/signup]", result.status, `${Date.now() - started}ms`);
    sendJson(res, result.status, result.body);
  } catch (err) {
    console.error("[light auth/signup] error:", err);
    const message = err instanceof Error ? err.message : "Signup failed";
    sendJson(res, 500, { error: message });
  }
  return true;
}
