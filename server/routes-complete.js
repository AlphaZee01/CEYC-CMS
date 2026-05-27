import bcrypt from "bcryptjs";
import path from "path";
import { getDb } from "./store.js";
import { authMiddleware, changePassword, createPasswordReset, resetPasswordWithToken } from "./auth.js";
import {
  canAccessFinances,
  canManageSettings,
  resolveEffectivePages,
  canManageEvents,
} from "./rbac.js";
import { logAudit } from "./audit.js";
import { updateSupabaseAuthPassword } from "./auth-sync.js";
import { persistUploadedFile, brandingFromSettings } from "./storage.js";

export function registerCompletionRoutes(app, { upload, uid, getMemberDepartments, loadMember, UPLOAD_DIR }) {
  const logoStorage = upload;
  const logoUpload = logoStorage.single("logo");

  app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const result = await changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
      req.user.authUserId
    );
    if (result.error) return res.status(400).json(result);
    await logAudit(req.user.member.id, "password_changed");
    res.json({ ok: true });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const result = await createPasswordReset(email);
    const payload = { message: result.message || "If that email exists, reset instructions were sent." };
    if (result.resetToken) {
      payload.resetToken = result.resetToken;
      payload.resetUrl = result.resetUrl || `/reset-password?token=${result.resetToken}`;
      if (result.note) payload.note = result.note;
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

  app.get("/api/finances/tithes", authMiddleware, async (req, res) => {
    if (!canAccessFinances(req.user.member.role)) {
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
    const rows = await db.prepare(sql).all(...params);
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

  app.post("/api/settings/logo", authMiddleware, logoUpload, async (req, res) => {
    if (!canManageSettings(req.user.member.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!req.file) return res.status(400).json({ error: "Logo file required" });
    try {
      const url = await persistUploadedFile(
        req.file.path,
        "logos",
        req.file.originalname,
        req.file.mimetype
      );
      await getDb().prepare("UPDATE church_settings SET logo_url = ? WHERE id = 1").run(url);
      await logAudit(req.user.member.id, "logo_uploaded", "settings", "1");
      const row = await getDb().prepare("SELECT * FROM church_settings WHERE id = 1").get();
      const branding = brandingFromSettings(row, req);
      res.json({ logoUrl: branding.logoUrl, branding });
    } catch (err) {
      console.error("Logo upload failed:", err.message);
      res.status(500).json({ error: "Logo upload failed" });
    }
  });

  app.get("/api/audit", authMiddleware, async (req, res) => {
    if (!canManageSettings(req.user.member.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const rows = await getDb()
      .prepare(
        `SELECT a.*, m.name as member_name FROM audit_log a
         LEFT JOIN members m ON m.id = a.member_id ORDER BY a.created_at DESC LIMIT 100`
      )
      .all();
    res.json(rows);
  });

  app.delete("/api/events/:id", authMiddleware, async (req, res) => {
    if (!canManageEvents(req.user.member.role)) {
      return res.status(403).json({ error: "You cannot delete church events" });
    }
    await getDb().prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    await logAudit(req.user.member.id, "delete", "event", req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
    await getDb().prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/media/:id", authMiddleware, async (req, res) => {
    await getDb().prepare("DELETE FROM media_items WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  app.patch("/api/users/:id/password", authMiddleware, async (req, res) => {
    if (!canManageSettings(req.user.member.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: "Password 8+ chars required" });
    const db = getDb();
    const user = await db.prepare("SELECT auth_user_id FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { useSupabaseAuth } = await import("./supabase.js");
    if (useSupabaseAuth() && user.auth_user_id) {
      await updateSupabaseAuthPassword(user.auth_user_id, password);
    } else {
      const hash = await bcrypt.hash(password, 10);
      await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
    }
    res.json({ ok: true });
  });

  app.patch("/api/members/:id/welfare", authMiddleware, async (req, res) => {
    if (!["Senior Pastor", "Admin"].includes(req.user.member.role)) {
      return res.status(403).json({ error: "Welfare notes: Admin/Pastor only" });
    }
    const { welfareNotes } = req.body;
    const db = getDb();
    await db.prepare("UPDATE members SET welfare_notes = ?, updated_at = datetime('now') WHERE id = ?").run(
      welfareNotes || null,
      req.params.id
    );
    res.json(await loadMember(db, req.params.id));
  });
}

export function patchAuthMeResponse(req, basePages) {
  return resolveEffectivePages(req.user.member.role, req.user.accessLevel, req.user.departmentAbilities || []);
}
