import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb, memberToJson } from "./db.js";
import { canAccessPage } from "./rbac.js";

const JWT_SECRET = process.env.JWT_SECRET || "celcm-production-secret-change-in-env";
const JWT_EXPIRES = "7d";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const decoded = verifyToken(header.slice(7));
    const db = getDb();
    const user = db
      .prepare(
        `SELECT u.*, m.id as mid, m.name, m.email as member_email, m.phone, m.role, m.cell_id, m.fellowship_id, m.active, m.joined_at
         FROM users u JOIN members m ON u.member_id = m.id WHERE u.id = ? AND m.active = 1`
      )
      .get(decoded.userId);
    if (!user) return res.status(401).json({ error: "Invalid session" });
    const deptRows = db
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
    if (!canAccessPage(req.user.member.role, page)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

export async function loginUser(email, password) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.*, m.name, m.role, m.cell_id, m.fellowship_id, m.active
       FROM users u JOIN members m ON u.member_id = m.id WHERE u.email = ?`
    )
    .get(email.toLowerCase());
  if (!row || !row.active) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  const deptRows = db
    .prepare("SELECT department_id FROM member_departments WHERE member_id = ?")
    .all(row.member_id);
  const member = memberToJson(
    db.prepare("SELECT * FROM members WHERE id = ?").get(row.member_id),
    deptRows.map((d) => d.department_id)
  );
  const token = signToken({ userId: row.id, memberId: row.member_id });
  return { token, user: { id: row.id, email: row.email, accessLevel: row.access_level, member } };
}

export { JWT_SECRET };
