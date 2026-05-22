import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb } from "./store.js";
import { memberToJson } from "./db.js";
import { sendPasswordResetEmail, isEmailConfigured } from "./email.js";
import { canAccessPage, resolveUserPages } from "./rbac.js";

const JWT_SECRET = process.env.JWT_SECRET || "celcm-production-secret-change-in-env";
const JWT_EXPIRES = "7d";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const decoded = verifyToken(header.slice(7));
    const db = getDb();
    const user = await db
      .prepare(
        `SELECT u.*, m.id as mid, m.name, m.email as member_email, m.phone, m.role, m.cell_id, m.fellowship_id, m.active, m.joined_at
         FROM users u JOIN members m ON u.member_id = m.id WHERE u.id = ? AND m.active = 1`
      )
      .get(decoded.userId);
    if (!user) return res.status(401).json({ error: "Invalid session" });
    const deptRows = await db
      .prepare("SELECT department_id FROM member_departments WHERE member_id = ?")
      .all(user.member_id);
    req.user = {
      userId: user.id,
      email: user.email,
      accessLevel: user.access_level,
      member: memberToJson(
        {
          id: user.member_id,
          name: user.name,
          email: user.member_email,
          phone: user.phone,
          role: user.role,
          cell_id: user.cell_id,
          fellowship_id: user.fellowship_id,
          active: user.active,
          joined_at: user.joined_at,
        },
        deptRows.map((r) => r.department_id)
      ),
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requirePage(page) {
  return (req, res, next) => {
    if (!canAccessPage(req.user.member.role, page, req.user.accessLevel)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const db = getDb();
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return { error: "User not found" };
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return { error: "Current password is incorrect" };
  const hash = await bcrypt.hash(newPassword, 10);
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
  return { ok: true };
}

export async function createPasswordReset(email) {
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
    payload.resetUrl = `${process.env.APP_URL || "http://localhost:8080"}/reset-password?token=${token}`;
    payload.note = emailResult.reason || "SMTP not configured";
  }
  return payload;
}

export async function resetPasswordWithToken(token, newPassword) {
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
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT u.*, m.name, m.role, m.cell_id, m.fellowship_id, m.active
       FROM users u JOIN members m ON u.member_id = m.id WHERE u.email = ?`
    )
    .get(email.toLowerCase());
  if (!row || !row.active) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
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
