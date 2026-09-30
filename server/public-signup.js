import crypto from "crypto";
import { getDb } from "./store.js";
import { loginUser } from "./auth.js";
import { logActivity } from "./db.js";
import { createSupabaseAuthUser } from "./auth-sync.js";
import { useSupabaseAuth } from "./supabase.js";

function uid() {
  return crypto.randomUUID();
}

/**
 * Public self-registration (login page /signup).
 * @returns {{ status: number, body: Record<string, unknown> }}
 */
export async function registerPublicUser(input) {
  if (process.env.ALLOW_PUBLIC_SIGNUP === "false") {
    return {
      status: 403,
      body: { error: "Public signup is disabled. Contact your church office for access." },
    };
  }

  const fullName = String(input.name || "").trim();
  const emailNorm = String(input.email || "").trim().toLowerCase();
  const passwordText = String(input.password || "");
  const phone = String(input.phone || "").trim();

  if (!fullName || !emailNorm || !passwordText) {
    return { status: 400, body: { error: "Name, email, and password are required" } };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return { status: 400, body: { error: "Enter a valid email address" } };
  }
  if (passwordText.length < 8) {
    return { status: 400, body: { error: "Password must be at least 8 characters" } };
  }

  const db = getDb();
  const existingMember = await db
    .prepare("SELECT id FROM members WHERE LOWER(email) = ? AND active = 1")
    .get(emailNorm);
  const existingUser = await db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(emailNorm);
  if (existingMember || existingUser) {
    return {
      status: 409,
      body: { error: "An account with this email already exists. Try signing in." },
    };
  }

  const memberId = uid();
  const userId = uid();
  const role = "Church Member";

  await db.prepare(
    `INSERT INTO members (id, name, email, phone, role, cell_id, fellowship_id, active, joined_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, 1, date('now'))`
  ).run(memberId, fullName, emailNorm, phone, role);

  let authUserId = null;
  let passwordHash = null;

  if (useSupabaseAuth()) {
    try {
      const auth = await createSupabaseAuthUser({
        email: emailNorm,
        password: passwordText,
        memberId,
        name: fullName,
        role,
      });
      authUserId = auth.authUserId;
      if (!authUserId) {
        await db.prepare("DELETE FROM members WHERE id = ?").run(memberId);
        return {
          status: 503,
          body: { error: auth.warning || "Could not create login account. Try again later." },
        };
      }
    } catch (authErr) {
      await db.prepare("DELETE FROM members WHERE id = ?").run(memberId);
      const msg =
        authErr instanceof Error
          ? authErr.message
          : typeof authErr === "object" && authErr && "message" in authErr
            ? String(authErr.message)
            : "Signup failed";
      return { status: 400, body: { error: msg } };
    }
  } else {
    const bcrypt = await import("bcryptjs");
    passwordHash = await bcrypt.hash(passwordText, 10);
  }

  await db
    .prepare(
      "INSERT INTO users (id, email, password_hash, auth_user_id, member_id, access_level) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(userId, emailNorm, passwordHash, authUserId, memberId, "standard");

  try {
    await logActivity(db, `New member signed up: ${fullName}`, memberId);
  } catch {
    /* non-fatal */
  }

  if (!useSupabaseAuth()) {
    const login = await loginUser(emailNorm, passwordText);
    if (login) {
      return { status: 201, body: login };
    }
  }

  return { status: 201, body: { ok: true, email: emailNorm } };
}
