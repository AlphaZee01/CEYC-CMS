import bcrypt from "bcryptjs";
import path from "path";
import { getDb, memberToJson, logActivity, notifyMember } from "./db.js";
import { authMiddleware, changePassword, createPasswordReset, resetPasswordWithToken } from "./auth.js";
import {
  canAccessFinances,
  canManageSettings,
  isDepartmentHead,
  resolveUserPages,
} from "./rbac.js";
import { logAudit } from "./audit.js";

export function registerCompletionRoutes(app, { upload, uid, getMemberDepartments, loadMember, UPLOAD_DIR }) {
  const logoStorage = upload;
  const logoUpload = logoStorage.single("logo");

  app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const result = await changePassword(req.user.userId, currentPassword, newPassword);
    if (result.error) return res.status(400).json(result);
    logAudit(req.user.member.id, "password_changed");
    res.json({ ok: true });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const result = await createPasswordReset(email);
    const payload = { message: result.message || "If that email exists, reset instructions were sent." };
    if (result.devOnly && result.token) {
      payload.resetToken = result.token;
      payload.resetUrl = `/reset-password?token=${result.token}`;
      payload.note = "Dev mode: use token above (configure SMTP for production email)";
    }
    res.json(payload);
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Token and password (8+ chars) required" });
    }
    const result = await resetPasswordWithToken(token, newPassword);
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  });

  app.get("/api/finances/tithes", authMiddleware, (req, res) => {
    if (!canAccessFinances(req.user.member.role, req.user.accessLevel)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const db = getDb();
    const { memberId } = req.query;
    let sql = `SELECT f.*, m.name as member_name FROM finances f
               LEFT JOIN members m ON m.id = f.member_id
               WHERE f.type = 'income' AND f.category IN ('Tithe', 'Offering', 'Seed')`;
    const params = [];
    if (memberId) {
      sql += ` AND f.member_id = ?`;
      params.push(memberId);
    }
    sql += ` ORDER BY f.date DESC`;
    const rows = db.prepare(sql).all(...params);
    const byMember = {};
    for (const r of rows) {
      const key = r.member_id || "anonymous";
      if (!byMember[key]) {
        byMember[key] = {
          memberId: r.member_id,
          memberName: r.member_name || "Anonymous / General",
          total: 0,
          records: [],
        };
      }
      byMember[key].total += r.amount;
      byMember[key].records.push({
        id: r.id,
        date: r.date,
        category: r.category,
        amount: r.amount,
        description: r.description,
      });
    }
    res.json({ ledger: Object.values(byMember), records: rows });
  });

  app.post("/api/settings/logo", authMiddleware, logoUpload, (req, res) => {
    if (!canManageSettings(req.user.member.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!req.file) return res.status(400).json({ error: "Logo file required" });
    const url = `/uploads/${path.basename(req.file.path)}`;
    getDb().prepare("UPDATE church_settings SET logo_url = ? WHERE id = 1").run(url);
    logAudit(req.user.member.id, "logo_uploaded", "settings", "1");
    res.json({ logoUrl: url });
  });

  app.get("/api/audit", authMiddleware, (req, res) => {
    if (!canManageSettings(req.user.member.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const rows = getDb()
      .prepare(
        `SELECT a.*, m.name as member_name FROM audit_log a
         LEFT JOIN members m ON m.id = a.member_id ORDER BY a.created_at DESC LIMIT 100`
      )
      .all();
    res.json(rows);
  });

  app.delete("/api/events/:id", authMiddleware, (req, res) => {
    getDb().prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    logAudit(req.user.member.id, "delete", "event", req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/announcements/:id", authMiddleware, (req, res) => {
    getDb().prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/tasks/:id", authMiddleware, (req, res) => {
    getDb().prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/media/:id", authMiddleware, (req, res) => {
    getDb().prepare("DELETE FROM media_items WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  app.patch("/api/users/:id/password", authMiddleware, async (req, res) => {
    if (!canManageSettings(req.user.member.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: "Password 8+ chars required" });
    const hash = await bcrypt.hash(password, 10);
    getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
    res.json({ ok: true });
  });

  app.patch("/api/members/:id/welfare", authMiddleware, (req, res) => {
    if (!["Senior Pastor", "Admin"].includes(req.user.member.role)) {
      return res.status(403).json({ error: "Welfare notes: Admin/Pastor only" });
    }
    const { welfareNotes } = req.body;
    getDb().prepare("UPDATE members SET welfare_notes = ?, updated_at = datetime('now') WHERE id = ?").run(
      welfareNotes || null,
      req.params.id
    );
    res.json(loadMember(getDb(), req.params.id));
  });
}

export function patchAuthMeResponse(req, basePages) {
  return resolveUserPages(req.user.member.role, req.user.accessLevel);
}
