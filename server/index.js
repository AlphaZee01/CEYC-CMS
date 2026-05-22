import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { getDb, initSchema, memberToJson, logActivity, notifyMember } from "./db.js";
import { authMiddleware, loginUser, requirePage } from "./auth.js";
import {
  canAccessFinances,
  canAccessPage,
  canManageSettings,
  canMessageTarget,
  canUploadMedia,
  scopeMemberFilter,
  PAGE_ACCESS,
} from "./rbac.js";
import { seedDatabase } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

initSchema();
await seedDatabase(false);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

function uid() {
  return crypto.randomUUID();
}

function getMemberDepartments(db, memberId) {
  return db
    .prepare("SELECT department_id FROM member_departments WHERE member_id = ?")
    .all(memberId)
    .map((r) => r.department_id);
}

function loadMember(db, id) {
  const row = db.prepare("SELECT * FROM members WHERE id = ?").get(id);
  return memberToJson(row, getMemberDepartments(db, id));
}

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const result = await loginUser(email, password);
  if (!result) return res.status(401).json({ error: "Invalid credentials" });
  res.json(result);
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      accessLevel: req.user.accessLevel,
      member: req.user.member,
    },
    pages: PAGE_ACCESS[req.user.member.role] || [],
  });
});

// ─── Bootstrap (full app state) ──────────────────────────────────────────────

app.get("/api/bootstrap", authMiddleware, (req, res) => {
  const db = getDb();
  const scope = scopeMemberFilter({
    id: req.user.member.id,
    role: req.user.member.role,
    fellowship_id: req.user.member.fellowshipId,
    cell_id: req.user.member.cellId,
  });

  const members = db
    .prepare(`SELECT * FROM members WHERE active = 1 AND ${scope.sql} ORDER BY name`)
    .all(...scope.params)
    .map((m) => memberToJson(m, getMemberDepartments(db, m.id)));

  const fellowships = db.prepare("SELECT * FROM fellowships ORDER BY name").all().map((f) => ({
    id: f.id,
    name: f.name,
    leaderId: f.leader_id,
  }));

  const cells = db.prepare("SELECT * FROM cells ORDER BY name").all().map((c) => ({
    id: c.id,
    name: c.name,
    fellowshipId: c.fellowship_id,
    leaderId: c.leader_id,
    subLeaderId: c.sub_leader_id,
  }));

  const departments = db.prepare("SELECT * FROM departments ORDER BY name").all().map((d) => {
    const memberIds = db
      .prepare("SELECT member_id FROM member_departments WHERE department_id = ?")
      .all(d.id)
      .map((r) => r.member_id);
    return { id: d.id, name: d.name, headId: d.head_id, memberIds };
  });

  const settings = db.prepare("SELECT * FROM church_settings WHERE id = 1").get();

  res.json({
    members,
    fellowships,
    cells,
    departments,
    settings: settings
      ? {
          name: settings.name,
          tagline: settings.tagline,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          logoUrl: settings.logo_url,
        }
      : {},
    pages: PAGE_ACCESS[req.user.member.role] || [],
  });
});

// ─── Members ───────────────────────────────────────────────────────────────────

app.get("/api/members", authMiddleware, requirePage("members"), (req, res) => {
  const db = getDb();
  const { search, role, cellId, fellowshipId, departmentId, active } = req.query;
  const scope = scopeMemberFilter({
    id: req.user.member.id,
    role: req.user.member.role,
    fellowship_id: req.user.member.fellowshipId,
    cell_id: req.user.member.cellId,
  });
  let sql = `SELECT DISTINCT m.* FROM members m`;
  const params = [];
  if (departmentId) {
    sql += ` JOIN member_departments md ON md.member_id = m.id AND md.department_id = ?`;
    params.push(departmentId);
  }
  sql += ` WHERE ${scope.sql}`;
  params.push(...scope.params);
  if (search) {
    sql += ` AND (m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)`;
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  if (role) {
    sql += ` AND m.role = ?`;
    params.push(role);
  }
  if (cellId) {
    sql += ` AND m.cell_id = ?`;
    params.push(cellId);
  }
  if (fellowshipId) {
    sql += ` AND m.fellowship_id = ?`;
    params.push(fellowshipId);
  }
  if (active !== undefined) {
    sql += ` AND m.active = ?`;
    params.push(active === "true" ? 1 : 0);
  } else {
    sql += ` AND m.active = 1`;
  }
  sql += ` ORDER BY m.name`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((m) => memberToJson(m, getMemberDepartments(db, m.id))));
});

app.post("/api/members", authMiddleware, requirePage("members"), async (req, res) => {
  const db = getDb();
  const { name, email, phone, role, cellId, fellowshipId, departmentIds = [], password } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: "Missing required fields" });
  const id = uid();
  const fel =
    fellowshipId ||
    (cellId ? db.prepare("SELECT fellowship_id FROM cells WHERE id = ?").get(cellId)?.fellowship_id : null);
  db.prepare(
    `INSERT INTO members (id, name, email, phone, role, cell_id, fellowship_id, active, joined_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, date('now'))`
  ).run(id, name, email, phone || "", role, cellId || null, fel || null);
  const insMD = db.prepare("INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)");
  departmentIds.forEach((d) => insMD.run(id, d));
  if (password) {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (id, email, password_hash, member_id) VALUES (?, ?, ?, ?)").run(
      uid(),
      email.toLowerCase(),
      hash,
      id
    );
  }
  logActivity(db, `${name} added to member directory`, req.user.member.id);
  res.status(201).json(loadMember(db, id));
});

app.put("/api/members/:id", authMiddleware, requirePage("members"), (req, res) => {
  const db = getDb();
  const { name, email, phone, role, cellId, fellowshipId, departmentIds, active } = req.body;
  const fel =
    fellowshipId ??
    (cellId ? db.prepare("SELECT fellowship_id FROM cells WHERE id = ?").get(cellId)?.fellowship_id : undefined);
  const sets = [];
  const params = [];
  if (name) {
    sets.push("name = ?");
    params.push(name);
  }
  if (email) {
    sets.push("email = ?");
    params.push(email);
  }
  if (phone !== undefined) {
    sets.push("phone = ?");
    params.push(phone);
  }
  if (role) {
    sets.push("role = ?");
    params.push(role);
  }
  if (cellId !== undefined) {
    sets.push("cell_id = ?");
    params.push(cellId);
  }
  if (fel !== undefined) {
    sets.push("fellowship_id = ?");
    params.push(fel);
  }
  if (active !== undefined) {
    sets.push("active = ?");
    params.push(active ? 1 : 0);
  }
  sets.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE members SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  if (departmentIds) {
    db.prepare("DELETE FROM member_departments WHERE member_id = ?").run(req.params.id);
    departmentIds.forEach((d) =>
      db.prepare("INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)").run(req.params.id, d)
    );
  }
  logActivity(db, `Member profile updated: ${req.params.id}`, req.user.member.id);
  res.json(loadMember(db, req.params.id));
});

// ─── Fellowships & Cells ───────────────────────────────────────────────────────

app.get("/api/fellowships", authMiddleware, requirePage("cells"), (req, res) => {
  const db = getDb();
  res.json(
    db.prepare("SELECT * FROM fellowships ORDER BY name").all().map((f) => ({
      id: f.id,
      name: f.name,
      leaderId: f.leader_id,
    }))
  );
});

app.post("/api/fellowships", authMiddleware, requirePage("cells"), (req, res) => {
  const db = getDb();
  const { name, leaderId } = req.body;
  const id = uid();
  db.prepare("INSERT INTO fellowships (id, name, leader_id) VALUES (?, ?, ?)").run(id, name, leaderId || null);
  logActivity(db, `Fellowship created: ${name}`, req.user.member.id);
  res.status(201).json({ id, name, leaderId: leaderId || null });
});

app.put("/api/fellowships/:id", authMiddleware, requirePage("cells"), (req, res) => {
  const db = getDb();
  const { name, leaderId } = req.body;
  if (name) db.prepare("UPDATE fellowships SET name = ? WHERE id = ?").run(name, req.params.id);
  if (leaderId !== undefined) {
    db.prepare("UPDATE fellowships SET leader_id = ? WHERE id = ?").run(leaderId || null, req.params.id);
    if (leaderId) {
      db.prepare("UPDATE members SET role = 'Fellowship Leader', fellowship_id = ? WHERE id = ?").run(
        req.params.id,
        leaderId
      );
    }
    logActivity(db, `Fellowship leader assigned`, req.user.member.id);
  }
  const f = db.prepare("SELECT * FROM fellowships WHERE id = ?").get(req.params.id);
  res.json({ id: f.id, name: f.name, leaderId: f.leader_id });
});

app.get("/api/cells", authMiddleware, requirePage("cells"), (req, res) => {
  const db = getDb();
  res.json(
    db.prepare("SELECT * FROM cells ORDER BY name").all().map((c) => ({
      id: c.id,
      name: c.name,
      fellowshipId: c.fellowship_id,
      leaderId: c.leader_id,
      subLeaderId: c.sub_leader_id,
    }))
  );
});

app.post("/api/cells", authMiddleware, requirePage("cells"), (req, res) => {
  const db = getDb();
  const { name, fellowshipId, leaderId, subLeaderId } = req.body;
  const id = uid();
  db.prepare("INSERT INTO cells (id, name, fellowship_id, leader_id, sub_leader_id) VALUES (?, ?, ?, ?, ?)").run(
    id,
    name,
    fellowshipId,
    leaderId || null,
    subLeaderId || null
  );
  logActivity(db, `Cell created: ${name}`, req.user.member.id);
  res.status(201).json({ id, name, fellowshipId, leaderId, subLeaderId });
});

app.put("/api/cells/:id", authMiddleware, requirePage("cells"), (req, res) => {
  const db = getDb();
  const { name, fellowshipId, leaderId, subLeaderId } = req.body;
  if (name) db.prepare("UPDATE cells SET name = ? WHERE id = ?").run(name, req.params.id);
  if (fellowshipId) db.prepare("UPDATE cells SET fellowship_id = ? WHERE id = ?").run(fellowshipId, req.params.id);
  if (leaderId !== undefined) {
    db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run(leaderId || null, req.params.id);
    if (leaderId)
      db.prepare(
        "UPDATE members SET role = 'Cell Leader', cell_id = ?, fellowship_id = (SELECT fellowship_id FROM cells WHERE id = ?) WHERE id = ?"
      ).run(req.params.id, req.params.id, leaderId);
  }
  if (subLeaderId !== undefined) {
    db.prepare("UPDATE cells SET sub_leader_id = ? WHERE id = ?").run(subLeaderId || null, req.params.id);
    if (subLeaderId) db.prepare("UPDATE members SET role = 'Sub-cell Leader', cell_id = ? WHERE id = ?").run(req.params.id, subLeaderId);
  }
  const c = db.prepare("SELECT * FROM cells WHERE id = ?").get(req.params.id);
  res.json({
    id: c.id,
    name: c.name,
    fellowshipId: c.fellowship_id,
    leaderId: c.leader_id,
    subLeaderId: c.sub_leader_id,
  });
});

// ─── Departments ───────────────────────────────────────────────────────────────

app.get("/api/departments", authMiddleware, requirePage("departments"), (req, res) => {
  const db = getDb();
  res.json(
    db.prepare("SELECT * FROM departments ORDER BY name").all().map((d) => ({
      id: d.id,
      name: d.name,
      headId: d.head_id,
      memberIds: db
        .prepare("SELECT member_id FROM member_departments WHERE department_id = ?")
        .all(d.id)
        .map((r) => r.member_id),
    }))
  );
});

app.post("/api/departments", authMiddleware, requirePage("departments"), (req, res) => {
  const db = getDb();
  const { name, headId, memberIds = [] } = req.body;
  const id = uid();
  db.prepare("INSERT INTO departments (id, name, head_id) VALUES (?, ?, ?)").run(id, name, headId || null);
  memberIds.forEach((mid) =>
    db.prepare("INSERT OR IGNORE INTO member_departments (member_id, department_id) VALUES (?, ?)").run(mid, id)
  );
  res.status(201).json({ id, name, headId, memberIds });
});

app.put("/api/departments/:id", authMiddleware, requirePage("departments"), (req, res) => {
  const db = getDb();
  const { name, headId, memberIds } = req.body;
  if (name) db.prepare("UPDATE departments SET name = ? WHERE id = ?").run(name, req.params.id);
  if (headId !== undefined) db.prepare("UPDATE departments SET head_id = ? WHERE id = ?").run(headId || null, req.params.id);
  if (memberIds) {
    db.prepare("DELETE FROM member_departments WHERE department_id = ?").run(req.params.id);
    memberIds.forEach((mid) =>
      db.prepare("INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)").run(mid, req.params.id)
    );
  }
  const d = db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
  res.json({
    id: d.id,
    name: d.name,
    headId: d.head_id,
    memberIds: db
      .prepare("SELECT member_id FROM member_departments WHERE department_id = ?")
      .all(d.id)
      .map((r) => r.member_id),
  });
});

// ─── Attendance ────────────────────────────────────────────────────────────────

app.get("/api/attendance", authMiddleware, requirePage("attendance"), (req, res) => {
  const db = getDb();
  const records = db.prepare("SELECT * FROM attendance_records ORDER BY date DESC").all();
  res.json(
    records.map((r) => {
      const members = db
        .prepare("SELECT member_id, status FROM attendance_members WHERE record_id = ?")
        .all(r.id);
      return {
        id: r.id,
        date: r.date,
        type: r.type,
        cellId: r.cell_id,
        fellowshipId: r.fellowship_id,
        presentIds: members.filter((m) => m.status === "present").map((m) => m.member_id),
        absentIds: members.filter((m) => m.status === "absent").map((m) => m.member_id),
      };
    })
  );
});

app.post("/api/attendance", authMiddleware, requirePage("attendance"), (req, res) => {
  const db = getDb();
  const { date, type, cellId, fellowshipId, presentIds = [], absentIds = [] } = req.body;
  const id = uid();
  const fel = fellowshipId || (cellId ? db.prepare("SELECT fellowship_id FROM cells WHERE id = ?").get(cellId)?.fellowship_id : null);
  db.prepare(
    "INSERT INTO attendance_records (id, date, type, cell_id, fellowship_id, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, date, type, cellId || null, fel, req.user.member.id);
  [...presentIds.map((mid) => [id, mid, "present"]), ...absentIds.map((mid) => [id, mid, "absent"])].forEach(
    ([rid, mid, st]) =>
      db.prepare("INSERT INTO attendance_members (record_id, member_id, status) VALUES (?, ?, ?)").run(rid, mid, st)
  );
  logActivity(db, `Attendance recorded for ${date}`, req.user.member.id);
  res.status(201).json({ id, date, type, cellId, fellowshipId: fel, presentIds, absentIds });
});

app.get("/api/attendance/trends", authMiddleware, requirePage("reports"), (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ar.date, c.name as cell_name, SUM(CASE WHEN am.status = 'present' THEN 1 ELSE 0 END) as present_count
       FROM attendance_records ar
       JOIN attendance_members am ON am.record_id = ar.id
       LEFT JOIN cells c ON c.id = ar.cell_id
       WHERE ar.type = 'cell' AND ar.date >= date('now', '-60 days')
       GROUP BY ar.date, ar.cell_id
       ORDER BY ar.date`
    )
    .all();
  res.json(rows);
});

// ─── Events ────────────────────────────────────────────────────────────────────

app.get("/api/events", authMiddleware, requirePage("events"), (req, res) => {
  const db = getDb();
  res.json(
    db
      .prepare("SELECT * FROM events ORDER BY date")
      .all()
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        departmentId: e.department_id,
        description: e.description,
        rsvpIds: db
          .prepare("SELECT member_id FROM event_rsvps WHERE event_id = ?")
          .all(e.id)
          .map((r) => r.member_id),
      }))
  );
});

app.post("/api/events", authMiddleware, requirePage("events"), (req, res) => {
  const db = getDb();
  const { title, date, time, location, departmentId, description } = req.body;
  const id = uid();
  db.prepare(
    `INSERT INTO events (id, title, date, time, location, department_id, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, date, time, location, departmentId || null, description, req.user.member.id);
  logActivity(db, `Event created: ${title}`, req.user.member.id);
  res.status(201).json({ id, title, date, time, location, departmentId, description, rsvpIds: [] });
});

app.post("/api/events/:id/rsvp", authMiddleware, requirePage("events"), (req, res) => {
  const db = getDb();
  const mid = req.user.member.id;
  const exists = db.prepare("SELECT 1 FROM event_rsvps WHERE event_id = ? AND member_id = ?").get(req.params.id, mid);
  if (exists) {
    db.prepare("DELETE FROM event_rsvps WHERE event_id = ? AND member_id = ?").run(req.params.id, mid);
    return res.json({ rsvped: false });
  }
  db.prepare("INSERT INTO event_rsvps (event_id, member_id) VALUES (?, ?)").run(req.params.id, mid);
  res.json({ rsvped: true });
});

// ─── Messages ──────────────────────────────────────────────────────────────────

app.get("/api/messages", authMiddleware, requirePage("communications"), (req, res) => {
  const db = getDb();
  const mid = req.user.member.id;
  const { box } = req.query;
  let messages;
  if (box === "sent") {
    messages = db.prepare("SELECT * FROM messages WHERE from_id = ? ORDER BY sent_at DESC").all(mid);
  } else {
    messages = db
      .prepare(
        `SELECT m.* FROM messages m
         JOIN message_recipients mr ON mr.message_id = m.id
         WHERE mr.member_id = ? ORDER BY m.sent_at DESC`
      )
      .all(mid);
  }
  res.json(
    messages.map((m) => ({
      id: m.id,
      fromId: m.from_id,
      subject: m.subject,
      body: m.body,
      sentAt: m.sent_at,
      broadcast: !!m.broadcast,
      toIds: db
        .prepare("SELECT member_id FROM message_recipients WHERE message_id = ?")
        .all(m.id)
        .map((r) => r.member_id),
      read: !!db
        .prepare("SELECT read FROM message_recipients WHERE message_id = ? AND member_id = ?")
        .get(m.id, mid)?.read,
    }))
  );
});

app.post("/api/messages", authMiddleware, requirePage("communications"), (req, res) => {
  const db = getDb();
  const { subject, body, toIds, broadcast } = req.body;
  const sender = db.prepare("SELECT * FROM members WHERE id = ?").get(req.user.member.id);
  let recipients = toIds || [];
  if (broadcast) {
    if (!["Senior Pastor", "Admin"].includes(sender.role))
      return res.status(403).json({ error: "Cannot broadcast" });
    recipients = db.prepare("SELECT id FROM members WHERE active = 1").all().map((m) => m.id);
  } else {
    for (const tid of recipients) {
      const target = db.prepare("SELECT * FROM members WHERE id = ?").get(tid);
      if (!canMessageTarget(sender, target)) return res.status(403).json({ error: `Cannot message ${target?.name}` });
    }
  }
  const id = uid();
  db.prepare("INSERT INTO messages (id, from_id, subject, body, broadcast) VALUES (?, ?, ?, ?, ?)").run(
    id,
    req.user.member.id,
    subject,
    body,
    broadcast ? 1 : 0
  );
  recipients.forEach((tid) => {
    if (tid !== req.user.member.id) {
      db.prepare("INSERT INTO message_recipients (message_id, member_id) VALUES (?, ?)").run(id, tid);
      notifyMember(db, tid, "New message", subject, "message");
    }
  });
  res.status(201).json({ id, subject, body, toIds: recipients, broadcast: !!broadcast });
});

app.patch("/api/messages/:id/read", authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare("UPDATE message_recipients SET read = 1 WHERE message_id = ? AND member_id = ?").run(
    req.params.id,
    req.user.member.id
  );
  res.json({ ok: true });
});

// ─── Finances ──────────────────────────────────────────────────────────────────

app.get("/api/finances", authMiddleware, (req, res) => {
  if (!canAccessFinances(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  res.json(
    db.prepare("SELECT * FROM finances ORDER BY date DESC").all().map((f) => ({
      id: f.id,
      date: f.date,
      type: f.type,
      category: f.category,
      amount: f.amount,
      memberId: f.member_id,
      description: f.description,
    }))
  );
});

app.post("/api/finances", authMiddleware, (req, res) => {
  if (!canAccessFinances(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { date, type, category, amount, memberId, description } = req.body;
  const id = uid();
  db.prepare(
    `INSERT INTO finances (id, date, type, category, amount, member_id, description, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, date, type, category, amount, memberId || null, description, req.user.member.id);
  logActivity(db, `${type} recorded: ₦${amount}`, req.user.member.id);
  res.status(201).json({ id, date, type, category, amount, memberId, description });
});

// ─── Prayer ────────────────────────────────────────────────────────────────────

app.get("/api/prayers", authMiddleware, requirePage("prayer"), (req, res) => {
  const db = getDb();
  const role = req.user.member.role;
  let rows;
  if (["Senior Pastor", "Associate Pastor", "Admin"].includes(role) || role.includes("Leader")) {
    rows = db.prepare("SELECT * FROM prayer_requests ORDER BY created_at DESC").all();
  } else {
    rows = db
      .prepare("SELECT * FROM prayer_requests WHERE member_id = ? OR is_private = 0 ORDER BY created_at DESC")
      .all(req.user.member.id);
  }
  res.json(
    rows.map((p) => ({
      id: p.id,
      memberId: p.member_id,
      title: p.title,
      content: p.content,
      isPrivate: !!p.is_private,
      status: p.status,
      response: p.response,
      createdAt: p.created_at,
    }))
  );
});

app.post("/api/prayers", authMiddleware, requirePage("prayer"), (req, res) => {
  const db = getDb();
  const { title, content, isPrivate } = req.body;
  const id = uid();
  db.prepare(
    `INSERT INTO prayer_requests (id, member_id, title, content, is_private) VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.user.member.id, title, content, isPrivate ? 1 : 0);
  res.status(201).json({ id, title, content, isPrivate, status: "pending" });
});

app.patch("/api/prayers/:id", authMiddleware, requirePage("prayer"), (req, res) => {
  const db = getDb();
  const { status, response } = req.body;
  db.prepare("UPDATE prayer_requests SET status = ?, response = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    response || null,
    req.params.id
  );
  res.json({ ok: true });
});

// ─── Follow-ups ────────────────────────────────────────────────────────────────

app.get("/api/follow-ups", authMiddleware, requirePage("discipleship"), (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM follow_ups ORDER BY created_at DESC").all();
  res.json(
    rows.map((fu) => ({
      id: fu.id,
      name: fu.name,
      contact: fu.contact,
      stage: fu.stage,
      assignedToId: fu.assigned_to_id,
      createdAt: fu.created_at,
      notes: db
        .prepare("SELECT date, text, outcome FROM follow_up_notes WHERE follow_up_id = ? ORDER BY date")
        .all(fu.id),
    }))
  );
});

app.post("/api/follow-ups", authMiddleware, requirePage("discipleship"), (req, res) => {
  const db = getDb();
  const { name, contact, stage, assignedToId } = req.body;
  const id = uid();
  db.prepare("INSERT INTO follow_ups (id, name, contact, stage, assigned_to_id) VALUES (?, ?, ?, ?, ?)").run(
    id,
    name,
    contact,
    stage,
    assignedToId || req.user.member.id
  );
  res.status(201).json({ id, name, contact, stage, assignedToId, notes: [] });
});

app.post("/api/follow-ups/:id/notes", authMiddleware, requirePage("discipleship"), (req, res) => {
  const db = getDb();
  const { date, text, outcome } = req.body;
  const id = uid();
  db.prepare(
    "INSERT INTO follow_up_notes (id, follow_up_id, date, text, outcome, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.id, date || new Date().toISOString().slice(0, 10), text, outcome, req.user.member.id);
  res.status(201).json({ id, date, text, outcome });
});

app.patch("/api/follow-ups/:id", authMiddleware, requirePage("discipleship"), (req, res) => {
  const db = getDb();
  const { stage, assignedToId } = req.body;
  if (stage) db.prepare("UPDATE follow_ups SET stage = ? WHERE id = ?").run(stage, req.params.id);
  if (assignedToId !== undefined)
    db.prepare("UPDATE follow_ups SET assigned_to_id = ? WHERE id = ?").run(assignedToId, req.params.id);
  res.json({ ok: true });
});

// ─── Announcements ─────────────────────────────────────────────────────────────

app.get("/api/announcements", authMiddleware, requirePage("announcements"), (req, res) => {
  const db = getDb();
  const m = req.user.member;
  const all = db
    .prepare("SELECT * FROM announcements WHERE expires_at >= date('now') ORDER BY pinned DESC, created_at DESC")
    .all();
  const filtered = all.filter((a) => {
    if (a.target === "all") return true;
    if (a.target === "fellowship") return a.target_id === m.fellowshipId;
    if (a.target === "cell") return a.target_id === m.cellId;
    if (a.target === "department")
      return db.prepare("SELECT 1 FROM member_departments WHERE member_id = ? AND department_id = ?").get(m.id, a.target_id);
    if (a.target === "role") return a.target_role === m.role;
    return false;
  });
  res.json(
    filtered.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      target: a.target,
      targetId: a.target_id,
      targetRole: a.target_role,
      pinned: !!a.pinned,
      expiresAt: a.expires_at,
      createdAt: a.created_at,
    }))
  );
});

app.post("/api/announcements", authMiddleware, requirePage("announcements"), (req, res) => {
  const db = getDb();
  const { title, content, target, targetId, targetRole, pinned, expiresAt } = req.body;
  const id = uid();
  db.prepare(
    `INSERT INTO announcements (id, title, content, target, target_id, target_role, pinned, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, content, target, targetId || null, targetRole || null, pinned ? 1 : 0, expiresAt, req.user.member.id);
  logActivity(db, `Announcement posted: ${title}`, req.user.member.id);
  res.status(201).json({ id, title, content, target, targetId, pinned, expiresAt });
});

// ─── Tasks ─────────────────────────────────────────────────────────────────────

app.get("/api/tasks", authMiddleware, requirePage("tasks"), (req, res) => {
  const db = getDb();
  const role = req.user.member.role;
  let tasks;
  if (["Senior Pastor", "Associate Pastor", "Admin"].includes(role)) {
    tasks = db.prepare("SELECT * FROM tasks ORDER BY due_date").all();
  } else {
    tasks = db
      .prepare(
        `SELECT t.* FROM tasks t
         JOIN task_assignees ta ON ta.task_id = t.id
         WHERE ta.member_id = ? ORDER BY t.due_date`
      )
      .all(req.user.member.id);
  }
  res.json(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      departmentId: t.department_id,
      dueDate: t.due_date,
      priority: t.priority,
      status: t.status,
      assigneeIds: db
        .prepare("SELECT member_id FROM task_assignees WHERE task_id = ?")
        .all(t.id)
        .map((r) => r.member_id),
    }))
  );
});

app.post("/api/tasks", authMiddleware, requirePage("tasks"), (req, res) => {
  const db = getDb();
  const { title, description, departmentId, dueDate, priority, assigneeIds = [] } = req.body;
  const id = uid();
  db.prepare(
    `INSERT INTO tasks (id, title, description, department_id, due_date, priority, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, title, description, departmentId || null, dueDate, priority || "medium", req.user.member.id);
  assigneeIds.forEach((mid) => {
    db.prepare("INSERT INTO task_assignees (task_id, member_id, notified) VALUES (?, ?, 1)").run(id, mid);
    notifyMember(db, mid, "New task assigned", title, "task");
  });
  res.status(201).json({ id, title, description, departmentId, dueDate, priority, assigneeIds, status: "pending" });
});

app.patch("/api/tasks/:id", authMiddleware, requirePage("tasks"), (req, res) => {
  const db = getDb();
  const { status, title, description, dueDate, priority } = req.body;
  const sets = [];
  const params = [];
  if (status) {
    sets.push("status = ?");
    params.push(status);
  }
  if (title) {
    sets.push("title = ?");
    params.push(title);
  }
  if (description) {
    sets.push("description = ?");
    params.push(description);
  }
  if (dueDate) {
    sets.push("due_date = ?");
    params.push(dueDate);
  }
  if (priority) {
    sets.push("priority = ?");
    params.push(priority);
  }
  if (sets.length) {
    params.push(req.params.id);
    db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }
  res.json({ ok: true });
});

// ─── Media ─────────────────────────────────────────────────────────────────────

app.get("/api/media", authMiddleware, requirePage("media"), (req, res) => {
  const db = getDb();
  const { search, type, series } = req.query;
  let sql = "SELECT * FROM media_items WHERE 1=1";
  const params = [];
  if (search) {
    sql += ` AND (title LIKE ? OR speaker LIKE ? OR topic LIKE ? OR series LIKE ?)`;
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (type) {
    sql += ` AND type = ?`;
    params.push(type);
  }
  if (series) {
    sql += ` AND series = ?`;
    params.push(series);
  }
  sql += " ORDER BY date DESC";
  res.json(
    db
      .prepare(sql)
      .all(...params)
      .map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        speaker: m.speaker,
        series: m.series,
        topic: m.topic,
        date: m.date,
        fileUrl: m.file_url || (m.file_path ? `/uploads/${path.basename(m.file_path)}` : null),
        shareTarget: m.share_target,
        shareTargetId: m.share_target_id,
      }))
  );
});

app.post("/api/media", authMiddleware, requirePage("media"), upload.single("file"), (req, res) => {
  if (!canUploadMedia(req.user.member.role)) return res.status(403).json({ error: "Upload not permitted" });
  const db = getDb();
  const { title, type, speaker, series, topic, date, shareTarget, shareTargetId } = req.body;
  const id = uid();
  const filePath = req.file?.path || null;
  const fileUrl = req.file ? `/uploads/${path.basename(req.file.path)}` : null;
  db.prepare(
    `INSERT INTO media_items (id, title, type, speaker, series, topic, date, file_path, file_url, share_target, share_target_id, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    type,
    speaker,
    series,
    topic,
    date,
    filePath,
    fileUrl,
    shareTarget || null,
    shareTargetId || null,
    req.user.member.id
  );
  res.status(201).json({ id, title, type, fileUrl });
});

// ─── Reports (analytics + cell reports) ────────────────────────────────────────

app.get("/api/reports/analytics", authMiddleware, requirePage("reports"), (req, res) => {
  const db = getDb();
  const growth = db
    .prepare(
      `SELECT strftime('%Y-%m', joined_at) as month, COUNT(*) as members
       FROM members WHERE active = 1 GROUP BY month ORDER BY month`
    )
    .all();
  const dept = db
    .prepare(
      `SELECT d.name, COUNT(md.member_id) + CASE WHEN d.head_id IS NOT NULL THEN 1 ELSE 0 END as value
       FROM departments d
       LEFT JOIN member_departments md ON md.department_id = d.id
       GROUP BY d.id`
    )
    .all();
  res.json({ memberGrowth: growth, departmentParticipation: dept });
});

app.get("/api/reports/submissions", authMiddleware, requirePage("report-submissions"), (req, res) => {
  const db = getDb();
  res.json(
    db.prepare("SELECT * FROM cell_reports ORDER BY created_at DESC").all().map((r) => ({
      id: r.id,
      type: r.type,
      submitterId: r.submitter_id,
      cellId: r.cell_id,
      fellowshipId: r.fellowship_id,
      departmentId: r.department_id,
      period: r.period,
      attendanceCount: r.attendance_count,
      newVisitors: r.new_visitors,
      prayerPoints: r.prayer_points,
      challenges: r.challenges,
      status: r.status,
      pastorComment: r.pastor_comment,
      dueDate: r.due_date,
      submittedAt: r.submitted_at,
    }))
  );
});

app.post("/api/reports/submissions", authMiddleware, requirePage("report-submissions"), (req, res) => {
  const db = getDb();
  const {
    type,
    cellId,
    fellowshipId,
    departmentId,
    period,
    attendanceCount,
    newVisitors,
    prayerPoints,
    challenges,
    dueDate,
  } = req.body;
  const id = uid();
  db.prepare(
    `INSERT INTO cell_reports (id, type, submitter_id, cell_id, fellowship_id, department_id, period, attendance_count, new_visitors, prayer_points, challenges, status, submitted_at, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', datetime('now'), ?)`
  ).run(
    id,
    type,
    req.user.member.id,
    cellId || null,
    fellowshipId || null,
    departmentId || null,
    period,
    attendanceCount,
    newVisitors,
    prayerPoints,
    challenges,
    dueDate || null
  );
  logActivity(db, `${type} report submitted`, req.user.member.id);
  res.status(201).json({ id, status: "submitted" });
});

app.patch("/api/reports/submissions/:id", authMiddleware, requirePage("report-submissions"), (req, res) => {
  const db = getDb();
  const { status, pastorComment } = req.body;
  if (status === "approved" && !["Senior Pastor", "Associate Pastor"].includes(req.user.member.role)) {
    return res.status(403).json({ error: "Only pastors can approve" });
  }
  db.prepare("UPDATE cell_reports SET status = ?, pastor_comment = ? WHERE id = ?").run(
    status,
    pastorComment || null,
    req.params.id
  );
  res.json({ ok: true });
});

// ─── Settings ──────────────────────────────────────────────────────────────────

app.get("/api/settings", authMiddleware, requirePage("settings"), (req, res) => {
  const s = getDb().prepare("SELECT * FROM church_settings WHERE id = 1").get();
  res.json({
    name: s.name,
    tagline: s.tagline,
    address: s.address,
    phone: s.phone,
    email: s.email,
    logoUrl: s.logo_url,
  });
});

app.put("/api/settings", authMiddleware, (req, res) => {
  if (!canManageSettings(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const { name, tagline, address, phone, email, logoUrl } = req.body;
  getDb()
    .prepare(
      `UPDATE church_settings SET name=?, tagline=?, address=?, phone=?, email=?, logo_url=? WHERE id=1`
    )
    .run(name, tagline, address, phone, email, logoUrl);
  res.json({ ok: true });
});

app.get("/api/users", authMiddleware, (req, res) => {
  if (!canManageSettings(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  res.json(
    db
      .prepare(
        `SELECT u.id, u.email, u.access_level, u.member_id, m.name, m.role FROM users u JOIN members m ON m.id = u.member_id`
      )
      .all()
      .map((u) => ({
        id: u.id,
        email: u.email,
        accessLevel: u.access_level,
        memberId: u.member_id,
        memberName: u.name,
        role: u.role,
      }))
  );
});

app.post("/api/users", authMiddleware, async (req, res) => {
  if (!canManageSettings(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const bcrypt = await import("bcryptjs");
  const db = getDb();
  const { email, password, memberId, accessLevel } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const id = uid();
  db.prepare("INSERT INTO users (id, email, password_hash, member_id, access_level) VALUES (?, ?, ?, ?, ?)").run(
    id,
    email.toLowerCase(),
    hash,
    memberId,
    accessLevel || "standard"
  );
  res.status(201).json({ id, email, memberId, accessLevel });
});

// ─── Activities & Notifications ────────────────────────────────────────────────

app.get("/api/activities", authMiddleware, (req, res) => {
  const db = getDb();
  res.json(
    db
      .prepare("SELECT * FROM activities ORDER BY created_at DESC LIMIT 30")
      .all()
      .map((a) => ({ id: a.id, text: a.text, time: a.created_at }))
  );
});

app.get("/api/notifications", authMiddleware, (req, res) => {
  const db = getDb();
  res.json(
    db
      .prepare("SELECT * FROM notifications WHERE member_id = ? ORDER BY created_at DESC LIMIT 50")
      .all(req.user.member.id)
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        read: !!n.read,
        createdAt: n.created_at,
      }))
  );
});

app.patch("/api/notifications/read-all", authMiddleware, (req, res) => {
  getDb()
    .prepare("UPDATE notifications SET read = 1 WHERE member_id = ?")
    .run(req.user.member.id);
  res.json({ ok: true });
});

app.get("/api/dashboard/stats", authMiddleware, requirePage("dashboard"), (req, res) => {
  const db = getDb();
  res.json({
    members: db.prepare("SELECT COUNT(*) as c FROM members WHERE active = 1").get().c,
    cells: db.prepare("SELECT COUNT(*) as c FROM cells").get().c,
    fellowships: db.prepare("SELECT COUNT(*) as c FROM fellowships").get().c,
    departments: db.prepare("SELECT COUNT(*) as c FROM departments").get().c,
  });
});

// ─── Production static ─────────────────────────────────────────────────────────

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Christ Embassy API running on http://localhost:${PORT}`);
});
