import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb } from "./store.js";
import { memberToJson } from "./db.js";
import { sendPasswordResetEmail, isEmailConfigured } from "./email.js";
import { getAppUrl } from "./app-url.js";
import { canAccessPage, resolveEffectivePages } from "./rbac.js";
import { getMemberDepartmentAbilities } from "./department-abilities.js";
import { useSupabaseAuth, verifySupabaseAccessToken } from "./supabase.js";
import { updateSupabaseAuthPassword } from "./auth-sync.js";

const JWT_SECRET = process.env.JWT_SECRET || "celcm-production-secret-change-in-env";
const JWT_EXPIRES = "7d";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function loadUserContext(db, userRow) {
  const deptRows = await db
    .prepare("SELECT department_id FROM member_departments WHERE member_id = ?")
    .all(userRow.member_id);
  const departmentAbilities = await getMemberDepartmentAbilities(db, userRow.member_id);
  return {
    userId: userRow.id,
    email: userRow.email,
    accessLevel: userRow.access_level,
    authUserId: userRow.auth_user_id || null,
    departmentAbilities,
    member: memberToJson(
      {
        id: userRow.member_id,
        name: userRow.name,
        email: userRow.member_email || userRow.email,
        phone: userRow.phone,
        role: userRow.role,
        cell_id: userRow.cell_id,
        fellowship_id: userRow.fellowship_id,
        active: userRow.active,
        joined_at: userRow.joined_at,
      },
      deptRows.map((r) => r.department_id)
    ),
  };
}

async function resolveUserFromSupabaseToken(db, accessToken) {
  const { user: authUser, error } = await verifySupabaseAccessToken(accessToken);
  if (error || !authUser) return null;

  let row = await db
    .prepare(
      `SELECT u.*, m.id as mid, m.name, m.email as member_email, m.phone, m.role, m.cell_id, m.fellowship_id, m.active, m.joined_at
       FROM users u JOIN members m ON u.member_id = m.id
       WHERE u.auth_user_id = ? AND m.active = 1`
    )
    .get(authUser.id);

  if (!row && authUser.email) {
    row = await db
      .prepare(
        `SELECT u.*, m.id as mid, m.name, m.email as member_email, m.phone, m.role, m.cell_id, m.fellowship_id, m.active, m.joined_at
         FROM users u JOIN members m ON u.member_id = m.id
         WHERE LOWER(u.email) = LOWER(?) AND m.active = 1`
      )
      .get(authUser.email);
    if (row) {
      await db.prepare("UPDATE users SET auth_user_id = ? WHERE id = ?").run(authUser.id, row.id);
      row.auth_user_id = authUser.id;
    }
  }

  if (!row) return null;
  return loadUserContext(db, row);
}

async function resolveUserFromLegacyToken(db, decoded) {
  const user = await db
    .prepare(
      `SELECT u.*, m.id as mid, m.name, m.email as member_email, m.phone, m.role, m.cell_id, m.fellowship_id, m.active, m.joined_at
       FROM users u JOIN members m ON u.member_id = m.id WHERE u.id = ? AND m.active = 1`
    )
    .get(decoded.userId);
  if (!user) return null;
  return loadUserContext(db, user);
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice(7);
  const db = getDb();

  try {
    if (useSupabaseAuth()) {
      req.user = await resolveUserFromSupabaseToken(db, token);
      if (!req.user) return res.status(401).json({ error: "Invalid session" });
    } else {
      const decoded = verifyToken(token);
      req.user = await resolveUserFromLegacyToken(db, decoded);
      if (!req.user) return res.status(401).json({ error: "Invalid session" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function resolvePagesForUser(user) {
  return resolveEffectivePages(user.member.role, user.accessLevel, user.departmentAbilities || []);
}

export function requirePage(page) {
  return (req, res, next) => {
    if (!canAccessPage(req.user.member.role, page, req.user.accessLevel, req.user.departmentAbilities)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

/** Allow members page managers or a member editing their own profile. */
export function requireMembersPageOrSelf(req, res, next) {
  if (req.params.id && req.user?.member?.id === req.params.id) return next();
  if (!canAccessPage(req.user.member.role, "members", req.user.accessLevel, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

export async function changePassword(userId, currentPassword, newPassword, authUserId = null) {
  if (useSupabaseAuth() && authUserId) {
    const { getSupabaseAuthClient } = await import("./supabase.js");
    const client = getSupabaseAuthClient();
    const user = await getDb().prepare("SELECT email FROM users WHERE id = ?").get(userId);
    if (!user) return { error: "User not found" };
    const { error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) return { error: "Current password is incorrect" };
    await updateSupabaseAuthPassword(authUserId, newPassword);
    return { ok: true };
  }

  const db = getDb();
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return { error: "User not found" };
  const ok = await bcrypt.compare(currentPassword, user.password_hash || "");
  if (!ok) return { error: "Current password is incorrect" };
  const hash = await bcrypt.hash(newPassword, 10);
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
  return { ok: true };
}

export async function createPasswordReset(email) {
  if (useSupabaseAuth()) {
    return {
      ok: true,
      useSupabase: true,
      message: "Use Supabase password reset from the login page.",
    };
  }

  const db = getDb();
  const user = await db
    .prepare("SELECT u.id, u.email FROM users u JOIN members m ON m.id = u.member_id WHERE u.email = ? AND m.active = 1")
    .get(email.toLowerCase());
  if (!user) return { ok: true, message: "If that email exists, a reset link was generated." };
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 3600000).toISOString();
  await db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used = 0").run(user.id);
  await db.prepare(
    "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
  ).run(crypto.randomUUID(), user.id, token, expires);

  const emailResult = await sendPasswordResetEmail(user.email, token);
  const payload = {
    ok: true,
    message: emailResult.sent
      ? "Password reset email sent. Check your inbox."
      : "Reset link created. Configure SMTP in .env to send email automatically.",
  };
  if (!emailResult.sent) {
    payload.resetToken = token;
    payload.resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
    payload.note = emailResult.reason || "SMTP not configured";
  }
  return payload;
}

export async function resetPasswordWithToken(token, newPassword) {
  if (useSupabaseAuth()) {
    return { error: "Use Supabase password recovery flow" };
  }

  const db = getDb();
  const row = await db
    .prepare(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
    )
    .get(token);
  if (!row) return { error: "Invalid or expired reset token" };
  const hash = await bcrypt.hash(newPassword, 10);
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
  await db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(row.id);
  return { ok: true };
}

export async function loginUser(email, password) {
  if (useSupabaseAuth()) {
    return null;
  }

  const db = getDb();
  const row = await db
    .prepare(
      `SELECT u.*, m.name, m.role, m.cell_id, m.fellowship_id, m.active
       FROM users u JOIN members m ON u.member_id = m.id WHERE u.email = ?`
    )
    .get(email.toLowerCase());
  if (!row || !row.active) return null;
  const ok = await bcrypt.compare(password, row.password_hash || "");
  if (!ok) return null;
  const deptRows = await db
    .prepare("SELECT department_id FROM member_departments WHERE member_id = ?")
    .all(row.member_id);
  const member = memberToJson(
    await db.prepare("SELECT * FROM members WHERE id = ?").get(row.member_id),
    deptRows.map((d) => d.department_id)
  );
  const token = signToken({ userId: row.id, memberId: row.member_id });
  return { token, user: { id: row.id, email: row.email, accessLevel: row.access_level, member } };
}

export { JWT_SECRET };
