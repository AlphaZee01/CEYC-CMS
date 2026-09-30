import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { getDb, initDatabase } from "./store.js";
import { memberToJson, logActivity, notifyMember } from "./db.js";
import { authMiddleware, loginUser, requirePage, requireMembersPageOrSelf } from "./auth.js";
import {
  parseDepartmentAbilities,
  serializeDepartmentAbilities,
  getPresetAbilitiesForName,
} from "./department-abilities.js";
import { resolvePagesForUser } from "./auth.js";
import { registerCompletionRoutes } from "./routes-complete.js";
import { startJobs } from "./jobs.js";
import { logAudit } from "./audit.js";
import { formatCurrency } from "./currency.js";
import { broadcastChatMessage, broadcastMessageRead } from "./realtime.js";
import {
  canAccessFinances,
  canManageSettings,
  canMessageTarget,
  canUploadMedia,
  canApproveMedia,
  canViewAllMedia,
  canEditMediaItem,
  canEditCellAttendance,
  canManageEventsForUser,
  canManageDepartments,
  canConfirmEventProgramme,
  canManageTasksForUser,
  canPostAnnouncementsForUser,
  receivesLeadersAnnouncement,
  canManagePrayerForUser,
  canViewPrivatePrayers,
  canManageDiscipleshipForUser,
  canAssignDiscipleshipMentor,
  canViewAllDiscipleshipClass,
  canRecordServiceAttendanceForUser,
  userHasAbility,
  scopeMemberFilter,
  validateMemberCreate,
  validateMemberUpdate,
  canRecordAttendance,
  scopeAttendanceFilter,
  isCellScopedRole,
} from "./rbac.js";
import { seedDatabase, ensureDashboardSamples, ensureNewcomerSampleData } from "./seed.js";
import { ensureBirthdayData } from "./birthday-seed.js";
import { canViewBirthdays, getBirthdaysForMonth } from "./birthdays.js";
import { syncAuthUsers, createSupabaseAuthUser, updateSupabaseAuthPassword } from "./auth-sync.js";
import { useSupabaseAuth } from "./supabase.js";
import { persistUploadedFile, brandingFromSettings, normalizeLogoUrlForStorage } from "./storage.js";
import { buildWebAppManifest } from "./web-app-manifest.js";
import { isGoogleDriveUrl, normalizeGoogleDriveUrl } from "./media-url.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.VERCEL
  ? path.join("/tmp", "celcm-uploads")
  : path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(cors());
app.use(express.json({ limit: "2mb" }));

let databaseReady = false;
let databaseError = null;

export async function bootstrapDatabase() {
  try {
    await initDatabase();
    if (!process.env.VERCEL) {
      await seedDatabase(false);
      await ensureDashboardSamples(getDb());
      try {
        await ensureNewcomerSampleData(getDb());
      } catch (err) {
        console.warn("Newcomer sample data skipped:", err.message);
      }
      try {
        await ensureBirthdayData(getDb());
      } catch (err) {
        console.warn("Birthday sample data skipped:", err.message);
      }
      if (useSupabaseAuth()) {
        try {
          await syncAuthUsers();
        } catch (err) {
          console.warn("Auth sync skipped:", err.message);
        }
        console.log("Supabase Auth enabled.");
      }
    } else {
      console.log("Vercel: skipped seed/auth-sync on cold start (run db:seed locally).");
    }
    databaseReady = true;
    if (!process.env.VERCEL) {
      startJobs();
    } else {
      console.log("Background jobs disabled on Vercel (use a cron or external worker for overdue reports).");
    }
    console.log("Database ready.");
  } catch (err) {
    databaseError = err instanceof Error ? err.message : String(err);
    console.error("Database startup failed:", databaseError);
    console.error(
      "Configure Supabase Postgres in .env (USE_SUPABASE_DB=true, SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_REF, SUPABASE_DB_REGION, or DATABASE_URL) and restart the API."
    );
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: databaseReady,
    database: databaseReady ? "supabase" : "unavailable",
    storage: process.env.USE_SUPABASE_STORAGE === "true" ? "supabase" : "local",
    ...(databaseError ? { error: databaseError } : {}),
  });
});

app.get("/api/public/config", (_req, res) => {
  try {
    res.json({ authMode: useSupabaseAuth() ? "supabase" : "jwt" });
  } catch (err) {
    console.error("public/config error:", err);
    res.json({ authMode: "jwt" });
  }
});

app.get("/api/public/branding", async (req, res) => {
  try {
    if (!databaseReady) {
      const fallback = process.env.CHURCH_NAME
        ? { name: process.env.CHURCH_NAME, tagline: null, logo_url: null }
        : null;
      return res.json(brandingFromSettings(fallback, req));
    }
    const s = await getDb().prepare("SELECT name, tagline, logo_url FROM church_settings WHERE id = 1").get();
    res.json(brandingFromSettings(s, req));
  } catch (err) {
    console.error("public/branding error:", err);
    res.json(brandingFromSettings(null, req));
  }
});

app.use((req, res, next) => {
  if (
    !databaseReady &&
    req.path.startsWith("/api/") &&
    req.path !== "/api/health" &&
    !req.path.startsWith("/api/public/")
  ) {
    return res.status(503).json({
      error: databaseError || "Database unavailable. Check API server logs and .env database settings.",
    });
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

function uid() {
  return crypto.randomUUID();
}

async function getMemberDepartments(db, memberId) {
  const rows = await db
    .prepare("SELECT department_id FROM member_departments WHERE member_id = ?")
    .all(memberId);
  return rows.map((r) => r.department_id);
}

async function getMemberDepartmentsMap(db, memberIds) {
  const map = new Map();
  if (!memberIds.length) return map;
  const placeholders = memberIds.map(() => "?").join(", ");
  const rows = await db
    .prepare(`SELECT member_id, department_id FROM member_departments WHERE member_id IN (${placeholders})`)
    .all(...memberIds);
  for (const r of rows) {
    if (!map.has(r.member_id)) map.set(r.member_id, []);
    map.get(r.member_id).push(r.department_id);
  }
  return map;
}

/** One query for bootstrap: member → departments and department → members. */
function mapsFromMemberDepartmentRows(rows) {
  const byMember = new Map();
  const byDepartment = new Map();
  for (const r of rows) {
    if (!byMember.has(r.member_id)) byMember.set(r.member_id, []);
    byMember.get(r.member_id).push(r.department_id);
    if (!byDepartment.has(r.department_id)) byDepartment.set(r.department_id, []);
    byDepartment.get(r.department_id).push(r.member_id);
  }
  return { byMember, byDepartment };
}

async function loadMember(db, id) {
  const row = await db.prepare("SELECT * FROM members WHERE id = ?").get(id);
  return memberToJson(row, await getMemberDepartments(db, id));
}

// ─── Public (no auth) ────────────────────────────────────────────────────────

app.get("/manifest.webmanifest", async (req, res) => {
  try {
    const fallback = process.env.CHURCH_NAME
      ? { name: process.env.CHURCH_NAME, tagline: null, logo_url: null }
      : null;
    if (!databaseReady) {
      res.type("application/manifest+json");
      return res.json(buildWebAppManifest(fallback, req));
    }
    const s = await getDb().prepare("SELECT name, tagline, logo_url FROM church_settings WHERE id = 1").get();
    res.type("application/manifest+json");
    res.json(buildWebAppManifest(s, req));
  } catch (err) {
    console.error("manifest.webmanifest error:", err);
    res.type("application/manifest+json");
    res.json(buildWebAppManifest(null, req));
  }
});

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  try {
    if (useSupabaseAuth()) {
      return res.status(400).json({
        error: "Use Supabase Auth sign-in from the app. Legacy /api/auth/login is disabled when USE_SUPABASE_AUTH=true.",
      });
    }
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const result = await loginUser(email, password);
    if (!result) return res.status(401).json({ error: "Invalid credentials" });
    res.json(result);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const settings = await getDb().prepare("SELECT name, tagline, logo_url FROM church_settings WHERE id = 1").get();
  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      accessLevel: req.user.accessLevel,
      member: req.user.member,
    },
    pages: resolvePagesForUser(req.user),
    departmentAbilities: req.user.departmentAbilities || [],
    branding: brandingFromSettings(settings, req),
  });
});

// ─── Bootstrap (full app state) ──────────────────────────────────────────────

app.get("/api/bootstrap", authMiddleware, async (req, res) => {
  const db = getDb();
  const scope = scopeMemberFilter({
    id: req.user.member.id,
    role: req.user.member.role,
    fellowship_id: req.user.member.fellowshipId,
    cell_id: req.user.member.cellId,
  });

  const [memberRows, fellowshipRows, cellRows, deptRows, settings, memberDeptRows] = await Promise.all([
    db.prepare(`SELECT * FROM members WHERE active = 1 AND ${scope.sql} ORDER BY name`).all(...scope.params),
    db.prepare("SELECT * FROM fellowships ORDER BY name").all(),
    db.prepare("SELECT * FROM cells ORDER BY name").all(),
    db.prepare("SELECT * FROM departments ORDER BY name").all(),
    db.prepare("SELECT * FROM church_settings WHERE id = 1").get(),
    db.prepare("SELECT member_id, department_id FROM member_departments").all(),
  ]);

  const { byMember: deptMap, byDepartment: departmentMembersMap } = mapsFromMemberDepartmentRows(memberDeptRows);
  const members = memberRows.map((m) => memberToJson(m, deptMap.get(m.id) || []));
  const fellowships = fellowshipRows.map((f) => ({
    id: f.id,
    name: f.name,
    leaderId: f.leader_id,
  }));
  const cells = cellRows.map((c) => ({
    id: c.id,
    name: c.name,
    fellowshipId: c.fellowship_id,
    leaderId: c.leader_id,
    subLeaderId: c.sub_leader_id,
  }));
  const departments = deptRows.map((d) => departmentToJson(d, departmentMembersMap.get(d.id) || []));
  const branding = brandingFromSettings(settings, req);

  res.json({
    members,
    fellowships,
    cells,
    departments,
    settings: settings
      ? {
          name: branding.name,
          tagline: branding.tagline,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          logoUrl: branding.logoUrl,
        }
      : {},
    pages: resolvePagesForUser(req.user),
    departmentAbilities: req.user.departmentAbilities || [],
  });
});

function departmentToJson(d, memberIds) {
  return {
    id: d.id,
    name: d.name,
    headId: d.head_id,
    memberIds,
    abilities: parseDepartmentAbilities(d.abilities),
  };
}

// ─── Members ───────────────────────────────────────────────────────────────────

app.get("/api/members", authMiddleware, requirePage("members"), async (req, res) => {
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
  const rows = await db.prepare(sql).all(...params);
  res.json(
    await Promise.all(rows.map(async (m) => memberToJson(m, await getMemberDepartments(db, m.id))))
  );
});

app.get("/api/members/:id", authMiddleware, async (req, res) => {
  const db = getDb();
  const actor = {
    id: req.user.member.id,
    role: req.user.member.role,
    cell_id: req.user.member.cellId,
    fellowship_id: req.user.member.fellowshipId,
  };
  const { canViewMember } = await import("./rbac.js");
  if (!(await canViewMember(db, actor, req.params.id))) {
    return res.status(403).json({ error: "Access denied" });
  }
  const member = await loadMember(db, req.params.id);
  if (!member) return res.status(404).json({ error: "Member not found" });
  const canSeeWelfare =
    ["Senior Pastor", "Admin"].includes(actor.role) && actor.id !== req.params.id;
  if (!canSeeWelfare) delete member.welfareNotes;
  res.json(member);
});

app.post("/api/members", authMiddleware, requirePage("members"), async (req, res) => {
  const db = getDb();
  const { name, email, phone, role, cellId, fellowshipId, departmentIds = [], password, dateOfBirth } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: "Missing required fields" });

  const actor = {
    id: req.user.member.id,
    role: req.user.member.role,
    cell_id: req.user.member.cellId,
    fellowship_id: req.user.member.fellowshipId,
  };
  const validation = validateMemberCreate(actor, { role, cellId, fellowshipId });
  if (!validation.ok) return res.status(403).json({ error: validation.error });

  const id = uid();
  const resolvedCellId = validation.cellId ?? cellId ?? null;
  const cellFel = resolvedCellId
    ? (await db.prepare("SELECT fellowship_id FROM cells WHERE id = ?").get(resolvedCellId))?.fellowship_id
    : null;
  const fel = validation.fellowshipId ?? fellowshipId ?? cellFel ?? null;
  await db.prepare(
    `INSERT INTO members (id, name, email, phone, role, cell_id, fellowship_id, active, joined_at, date_of_birth)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, date('now'), ?)`
  ).run(id, name, email, phone || "", role, resolvedCellId, fel || null, dateOfBirth || null);
  const insMD = db.prepare("INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)");
  for (const d of departmentIds) await insMD.run(id, d);
  if (password) {
    const userId = uid();
    let authUserId = null;
    let passwordHash = null;
    if (useSupabaseAuth()) {
      const auth = await createSupabaseAuthUser({
        email: email.toLowerCase(),
        password,
        memberId: id,
        name,
        role,
      });
      authUserId = auth.authUserId;
    } else {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.hash(password, 10);
    }
    await db
      .prepare(
        "INSERT INTO users (id, email, password_hash, auth_user_id, member_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run(userId, email.toLowerCase(), passwordHash, authUserId, id);
  }
  await logActivity(db, `${name} added to member directory`, req.user.member.id);
  res.status(201).json(await loadMember(db, id));
});

app.put("/api/members/:id", authMiddleware, requireMembersPageOrSelf, async (req, res) => {
  const db = getDb();
  const { name, email, phone, role, cellId, fellowshipId, departmentIds, active, dateOfBirth } = req.body;

  const actor = {
    id: req.user.member.id,
    role: req.user.member.role,
    cell_id: req.user.member.cellId,
    fellowship_id: req.user.member.fellowshipId,
  };
  const validation = await validateMemberUpdate(db, actor, req.params.id, {
    role,
    cellId,
    fellowshipId,
    active,
    departmentIds,
  });
  if (!validation.ok) return res.status(validation.status || 403).json({ error: validation.error });

  const sets = [];
  const params = [];

  if (validation.selfOnly) {
    if (!name && !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    if (name) {
      sets.push("name = ?");
      params.push(name);
    }
    if (email) {
      sets.push("email = ?");
      params.push(email.toLowerCase());
    }
    if (phone !== undefined) {
      sets.push("phone = ?");
      params.push(phone);
    }
    if (dateOfBirth !== undefined) {
      sets.push("date_of_birth = ?");
      params.push(dateOfBirth || null);
    }
  } else {
    const fel =
      fellowshipId ??
      (cellId !== undefined
        ? cellId
          ? (await db.prepare("SELECT fellowship_id FROM cells WHERE id = ?").get(cellId))?.fellowship_id
          : null
        : undefined);
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
    if (dateOfBirth !== undefined) {
      sets.push("date_of_birth = ?");
      params.push(dateOfBirth || null);
    }
    if (departmentIds) {
      await db.prepare("DELETE FROM member_departments WHERE member_id = ?").run(req.params.id);
      for (const d of departmentIds) {
        await db.prepare("INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)").run(
          req.params.id,
          d
        );
      }
    }
  }

  if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });

  sets.push("updated_at = datetime('now')");
  params.push(req.params.id);
  await db.prepare(`UPDATE members SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const loginEmail = validation.selfOnly && email ? email.toLowerCase() : email;
  if (loginEmail) {
    await db.prepare("UPDATE users SET email = ? WHERE member_id = ?").run(loginEmail, req.params.id);
  }

  await logActivity(db, `Member profile updated: ${req.params.id}`, req.user.member.id);
  res.json(await loadMember(db, req.params.id));
});

// ─── Fellowships & Cells ───────────────────────────────────────────────────────

app.get("/api/fellowships", authMiddleware, requirePage("cells"), async (req, res) => {
  const db = getDb();
  res.json(
    (await db.prepare("SELECT * FROM fellowships ORDER BY name").all()).map((f) => ({
      id: f.id,
      name: f.name,
      leaderId: f.leader_id,
    }))
  );
});

app.post("/api/fellowships", authMiddleware, requirePage("cells"), async (req, res) => {
  const db = getDb();
  const { name, leaderId } = req.body;
  const id = uid();
  await db.prepare("INSERT INTO fellowships (id, name, leader_id) VALUES (?, ?, ?)").run(id, name, leaderId || null);
  await logActivity(db, `Fellowship created: ${name}`, req.user.member.id);
  res.status(201).json({ id, name, leaderId: leaderId || null });
});

app.put("/api/fellowships/:id", authMiddleware, requirePage("cells"), async (req, res) => {
  const db = getDb();
  const { name, leaderId } = req.body;
  if (name) await db.prepare("UPDATE fellowships SET name = ? WHERE id = ?").run(name, req.params.id);
  if (leaderId !== undefined) {
    await db.prepare("UPDATE fellowships SET leader_id = ? WHERE id = ?").run(leaderId || null, req.params.id);
    if (leaderId) {
      await db.prepare("UPDATE members SET role = 'Fellowship Leader', fellowship_id = ? WHERE id = ?").run(
        req.params.id,
        leaderId
      );
    }
    await logActivity(db, `Fellowship leader assigned`, req.user.member.id);
  }
  const f = await db.prepare("SELECT * FROM fellowships WHERE id = ?").get(req.params.id);
  res.json({ id: f.id, name: f.name, leaderId: f.leader_id });
});

app.get("/api/cells", authMiddleware, requirePage("cells"), async (req, res) => {
  const db = getDb();
  res.json(
    (await db.prepare("SELECT * FROM cells ORDER BY name").all()).map((c) => ({
      id: c.id,
      name: c.name,
      fellowshipId: c.fellowship_id,
      leaderId: c.leader_id,
      subLeaderId: c.sub_leader_id,
    }))
  );
});

app.post("/api/cells", authMiddleware, requirePage("cells"), async (req, res) => {
  const db = getDb();
  const { name, fellowshipId, leaderId, subLeaderId } = req.body;
  const id = uid();
  await db.prepare("INSERT INTO cells (id, name, fellowship_id, leader_id, sub_leader_id) VALUES (?, ?, ?, ?, ?)").run(
    id,
    name,
    fellowshipId,
    leaderId || null,
    subLeaderId || null
  );
  await logActivity(db, `Cell created: ${name}`, req.user.member.id);
  res.status(201).json({ id, name, fellowshipId, leaderId, subLeaderId });
});

app.put("/api/cells/:id", authMiddleware, requirePage("cells"), async (req, res) => {
  const db = getDb();
  const { name, fellowshipId, leaderId, subLeaderId } = req.body;
  if (name) await db.prepare("UPDATE cells SET name = ? WHERE id = ?").run(name, req.params.id);
  if (fellowshipId) await db.prepare("UPDATE cells SET fellowship_id = ? WHERE id = ?").run(fellowshipId, req.params.id);
  if (leaderId !== undefined) {
    await db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run(leaderId || null, req.params.id);
    if (leaderId)
      await db.prepare(
        "UPDATE members SET role = 'Cell Leader', cell_id = ?, fellowship_id = (SELECT fellowship_id FROM cells WHERE id = ?) WHERE id = ?"
      ).run(req.params.id, req.params.id, leaderId);
  }
  if (subLeaderId !== undefined) {
    await db.prepare("UPDATE cells SET sub_leader_id = ? WHERE id = ?").run(subLeaderId || null, req.params.id);
    if (subLeaderId) await db.prepare("UPDATE members SET role = 'Sub-cell Leader', cell_id = ? WHERE id = ?").run(req.params.id, subLeaderId);
  }
  const c = await db.prepare("SELECT * FROM cells WHERE id = ?").get(req.params.id);
  res.json({
    id: c.id,
    name: c.name,
    fellowshipId: c.fellowship_id,
    leaderId: c.leader_id,
    subLeaderId: c.sub_leader_id,
  });
});

app.put("/api/cells/:id/members", authMiddleware, requirePage("cells"), async (req, res) => {
  const db = getDb();
  const { memberIds } = req.body;
  if (!Array.isArray(memberIds)) return res.status(400).json({ error: "memberIds array required" });

  const cell = await db.prepare("SELECT id, name, fellowship_id FROM cells WHERE id = ?").get(req.params.id);
  if (!cell) return res.status(404).json({ error: "Cell not found" });

  const { role, fellowshipId: userFelId } = req.user.member;
  if (role === "Fellowship Leader" && userFelId && cell.fellowship_id !== userFelId) {
    return res.status(403).json({ error: "Cannot manage cells outside your fellowship" });
  }

  const currentRows = await db.prepare("SELECT id FROM members WHERE cell_id = ?").all(req.params.id);
  const currentIds = new Set(currentRows.map((r) => r.id));
  const nextIds = new Set(memberIds.filter(Boolean));

  for (const id of currentIds) {
    if (!nextIds.has(id)) {
      await db.prepare("UPDATE members SET cell_id = NULL, updated_at = datetime('now') WHERE id = ?").run(id);
    }
  }
  for (const mid of nextIds) {
    await db.prepare(
      "UPDATE members SET cell_id = ?, fellowship_id = ?, updated_at = datetime('now') WHERE id = ? AND active = 1"
    ).run(req.params.id, cell.fellowship_id, mid);
  }

  await logActivity(db, `Cell members updated: ${cell.name}`, req.user.member.id);
  const updated = await db.prepare("SELECT id FROM members WHERE cell_id = ? AND active = 1").all(req.params.id);
  res.json({ memberIds: updated.map((r) => r.id) });
});

// ─── Departments ───────────────────────────────────────────────────────────────

app.get("/api/departments", authMiddleware, requirePage("departments"), async (req, res) => {
  const db = getDb();
  const deptRows = await db.prepare("SELECT * FROM departments ORDER BY name").all();
  res.json(
    await Promise.all(
      deptRows.map(async (d) => {
        const memberIds = (await db
          .prepare("SELECT member_id FROM member_departments WHERE department_id = ?")
          .all(d.id)).map((r) => r.member_id);
        return departmentToJson(d, memberIds);
      })
    )
  );
});

app.post("/api/departments", authMiddleware, requirePage("departments"), async (req, res) => {
  if (!canManageDepartments(req.user.member.role)) {
    return res.status(403).json({ error: "You cannot manage departments" });
  }
  const db = getDb();
  const { name, headId, memberIds = [], abilities } = req.body;
  const id = uid();
  const storedAbilities = serializeDepartmentAbilities(
    Array.isArray(abilities) && abilities.length ? abilities : getPresetAbilitiesForName(name)
  );
  await db
    .prepare("INSERT INTO departments (id, name, head_id, abilities) VALUES (?, ?, ?, ?)")
    .run(id, name, headId || null, storedAbilities);
  for (const mid of memberIds) {
    await db.prepare("INSERT OR IGNORE INTO member_departments (member_id, department_id) VALUES (?, ?)").run(mid, id);
  }
  res.status(201).json({ id, name, headId, memberIds, abilities: parseDepartmentAbilities(storedAbilities) });
});

app.put("/api/departments/:id", authMiddleware, requirePage("departments"), async (req, res) => {
  if (!canManageDepartments(req.user.member.role)) {
    return res.status(403).json({ error: "You cannot manage departments" });
  }
  const db = getDb();
  const { name, headId, memberIds, abilities } = req.body;
  if (name) await db.prepare("UPDATE departments SET name = ? WHERE id = ?").run(name, req.params.id);
  if (headId !== undefined) await db.prepare("UPDATE departments SET head_id = ? WHERE id = ?").run(headId || null, req.params.id);
  if (abilities !== undefined) {
    await db
      .prepare("UPDATE departments SET abilities = ? WHERE id = ?")
      .run(serializeDepartmentAbilities(abilities), req.params.id);
  }
  if (memberIds) {
    await db.prepare("DELETE FROM member_departments WHERE department_id = ?").run(req.params.id);
    for (const mid of memberIds) {
      await db.prepare("INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)").run(mid, req.params.id);
    }
  }
  const d = await db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
  const mids = await db.prepare("SELECT member_id FROM member_departments WHERE department_id = ?").all(d.id);
  res.json(departmentToJson(d, mids.map((r) => r.member_id)));
});

app.delete("/api/departments/:id", authMiddleware, requirePage("departments"), async (req, res) => {
  if (!canManageDepartments(req.user.member.role)) {
    return res.status(403).json({ error: "You cannot delete departments" });
  }
  const db = getDb();
  const existing = await db.prepare("SELECT id, name FROM departments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Department not found" });

  await db.prepare("UPDATE announcements SET target_id = NULL WHERE target = 'department' AND target_id = ?").run(req.params.id);
  await db.prepare("DELETE FROM departments WHERE id = ?").run(req.params.id);
  await logAudit(req.user.member.id, "delete", "department", req.params.id, { name: existing.name });
  res.json({ ok: true });
});

// ─── Attendance ────────────────────────────────────────────────────────────────

app.get("/api/attendance", authMiddleware, requirePage("attendance"), async (req, res) => {
  const db = getDb();
  const attScope = scopeAttendanceFilter({
    role: req.user.member.role,
    cell_id: req.user.member.cellId,
    fellowship_id: req.user.member.fellowshipId,
  });
  const records = await db
    .prepare(`SELECT ar.* FROM attendance_records ar WHERE ${attScope.sql} ORDER BY ar.date DESC`)
    .all(...attScope.params);
  res.json(
    await Promise.all(
      records.map(async (r) => {
        const members = await db
          .prepare("SELECT member_id, status, is_newcomer FROM attendance_members WHERE record_id = ?")
          .all(r.id);
        const guests = await db
          .prepare("SELECT id, name, contact FROM attendance_guests WHERE record_id = ?")
          .all(r.id);
        return {
          id: r.id,
          date: r.date,
          type: r.type,
          cellId: r.cell_id,
          fellowshipId: r.fellowship_id,
          presentIds: members.filter((m) => m.status === "present").map((m) => m.member_id),
          absentIds: members.filter((m) => m.status === "absent").map((m) => m.member_id),
          newcomerIds: members.filter((m) => m.status === "present" && m.is_newcomer).map((m) => m.member_id),
          guests: guests.map((g) => ({ id: g.id, name: g.name, contact: g.contact })),
        };
      })
    )
  );
});

app.post("/api/attendance", authMiddleware, requirePage("attendance"), async (req, res) => {
  const db = getDb();
  const { date, type, cellId, fellowshipId, presentIds = [], absentIds = [], newcomerIds = [], guests = [] } = req.body;

  const actor = {
    role: req.user.member.role,
    cell_id: req.user.member.cellId,
    fellowship_id: req.user.member.fellowshipId,
  };
  const deptAbilities = req.user.departmentAbilities || [];
  const mayRecord =
    canRecordAttendance(actor, { type, cellId }) ||
    (type === "service" && canRecordServiceAttendanceForUser(actor, deptAbilities));
  if (!mayRecord) {
    return res.status(403).json({ error: "You cannot record this attendance" });
  }

  if (isCellScopedRole(actor.role)) {
    const resolvedCellId = cellId || actor.cell_id;
    const memberIds = [...presentIds, ...absentIds];
    for (const mid of memberIds) {
      const row = await db.prepare("SELECT cell_id FROM members WHERE id = ?").get(mid);
      if (row?.cell_id !== resolvedCellId) {
        return res.status(403).json({ error: "You can only mark attendance for members in your cell" });
      }
    }
  }

  const newcomerSet = new Set(newcomerIds);
  const id = uid();
  const fel = fellowshipId || (cellId ? await db.prepare("SELECT fellowship_id FROM cells WHERE id = ?").get(cellId)?.fellowship_id : null);
  await db.prepare(
    "INSERT INTO attendance_records (id, date, type, cell_id, fellowship_id, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, date, type, cellId || null, fel, req.user.member.id);
  for (const mid of presentIds) {
    await db.prepare(
      "INSERT INTO attendance_members (record_id, member_id, status, is_newcomer) VALUES (?, ?, 'present', ?)"
    ).run(id, mid, newcomerSet.has(mid) ? 1 : 0);
  }
  for (const mid of absentIds) {
    await db.prepare(
      "INSERT INTO attendance_members (record_id, member_id, status, is_newcomer) VALUES (?, ?, 'absent', 0)"
    ).run(id, mid);
  }
  for (const guest of guests) {
    const name = typeof guest === "string" ? guest.trim() : guest?.name?.trim();
    if (!name) continue;
    const contact = typeof guest === "object" ? guest.contact?.trim() || null : null;
    await db.prepare("INSERT INTO attendance_guests (id, record_id, name, contact) VALUES (?, ?, ?, ?)").run(
      uid(),
      id,
      name,
      contact
    );
  }
  await logActivity(db, `Attendance recorded for ${date}`, req.user.member.id);
  res.status(201).json({ id, date, type, cellId, fellowshipId: fel, presentIds, absentIds, newcomerIds, guests });
});

app.put("/api/attendance/:id", authMiddleware, requirePage("attendance"), async (req, res) => {
  const db = getDb();
  const record = await db.prepare("SELECT * FROM attendance_records WHERE id = ?").get(req.params.id);
  if (!record) return res.status(404).json({ error: "Attendance record not found" });

  const actor = {
    id: req.user.member.id,
    role: req.user.member.role,
    cell_id: req.user.member.cellId,
    fellowship_id: req.user.member.fellowshipId,
  };
  if (!canEditCellAttendance(actor, record)) {
    return res.status(403).json({ error: "You cannot edit this attendance record" });
  }

  const { presentIds = [], absentIds = [], newcomerIds = [], guests = [] } = req.body;

  if (isCellScopedRole(actor.role)) {
    const memberIds = [...presentIds, ...absentIds];
    for (const mid of memberIds) {
      const row = await db.prepare("SELECT cell_id FROM members WHERE id = ?").get(mid);
      if (row?.cell_id !== record.cell_id) {
        return res.status(403).json({ error: "You can only edit attendance for members in your cell" });
      }
    }
  }

  const newcomerSet = new Set(newcomerIds);
  await db.prepare("DELETE FROM attendance_members WHERE record_id = ?").run(record.id);
  await db.prepare("DELETE FROM attendance_guests WHERE record_id = ?").run(record.id);

  for (const mid of presentIds) {
    await db.prepare(
      "INSERT INTO attendance_members (record_id, member_id, status, is_newcomer) VALUES (?, ?, 'present', ?)"
    ).run(record.id, mid, newcomerSet.has(mid) ? 1 : 0);
  }
  for (const mid of absentIds) {
    await db.prepare(
      "INSERT INTO attendance_members (record_id, member_id, status, is_newcomer) VALUES (?, ?, 'absent', 0)"
    ).run(record.id, mid);
  }
  for (const guest of guests) {
    const name = typeof guest === "string" ? guest.trim() : guest?.name?.trim();
    if (!name) continue;
    const contact = typeof guest === "object" ? guest.contact?.trim() || null : null;
    await db.prepare("INSERT INTO attendance_guests (id, record_id, name, contact) VALUES (?, ?, ?, ?)").run(
      uid(),
      record.id,
      name,
      contact
    );
  }

  await logActivity(db, `Attendance updated for ${record.date}`, req.user.member.id);
  res.json({ ok: true, id: record.id });
});

app.get("/api/attendance/trends", authMiddleware, requirePage("attendance"), async (req, res) => {
  const db = getDb();
  const attScope = scopeAttendanceFilter({
    role: req.user.member.role,
    cell_id: req.user.member.cellId,
    fellowship_id: req.user.member.fellowshipId,
  });
  const rows = await db
    .prepare(
      `SELECT ar.date, c.name as cell_name, SUM(CASE WHEN am.status = 'present' THEN 1 ELSE 0 END) as present_count
       FROM attendance_records ar
       JOIN attendance_members am ON am.record_id = ar.id
       LEFT JOIN cells c ON c.id = ar.cell_id
       WHERE ar.type = 'cell' AND ar.date >= date('now', '-60 days') AND ${attScope.sql}
       GROUP BY ar.date, ar.cell_id, c.name
       ORDER BY ar.date`
    )
    .all(...attScope.params);
  res.json(rows);
});

// ─── Events ────────────────────────────────────────────────────────────────────

async function loadEventProgramme(db, eventId) {
  const rows = await db
    .prepare(
      `SELECT * FROM tasks WHERE event_id = ? ORDER BY sort_order ASC, scheduled_time ASC, title ASC`
    )
    .all(eventId);
  return Promise.all(
    rows.map(async (t) => {
      const assignees = await db
        .prepare("SELECT member_id FROM task_assignees WHERE task_id = ?")
        .all(t.id);
      return {
        id: t.id,
        title: t.title,
        description: t.description || "",
        scheduledTime: t.scheduled_time || null,
        sortOrder: t.sort_order ?? 0,
        status: t.status,
        priority: t.priority,
        assigneeIds: assignees.map((r) => r.member_id),
      };
    })
  );
}

app.get("/api/events", authMiddleware, requirePage("events"), async (req, res) => {
  try {
  const db = getDb();
  const events = await db.prepare("SELECT * FROM events ORDER BY date").all();
  res.json(
    await Promise.all(
      events.map(async (e) => {
        const rsvps = await db
          .prepare("SELECT member_id FROM event_rsvps WHERE event_id = ?")
          .all(e.id);
        const programme = await loadEventProgramme(db, e.id);
        let programmeStatus = e.programme_status || "none";
        if (
          programmeStatus === "none" &&
          programme.length > 0 &&
          programme.some((item) => item.assigneeIds.length > 0)
        ) {
          programmeStatus = "draft";
        }
        const cellId = e.cell_id || null;
        const fellowshipId = e.fellowship_id || null;
        const hostScope = cellId ? "cell" : fellowshipId ? "fellowship" : "church";
        return {
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.time,
          location: e.location,
          departmentId: e.department_id,
          description: e.description,
          hostScope,
          fellowshipId,
          cellId,
          rsvpIds: rsvps.map((r) => r.member_id),
          programme,
          programmeStatus,
          programmeConfirmedAt: e.programme_confirmed_at || null,
          programmeConfirmedBy: e.programme_confirmed_by || null,
        };
      })
    )
  );
  } catch (err) {
    console.error("GET /api/events error:", err);
    res.status(500).json({ error: err.message || "Failed to load events" });
  }
});

app.post("/api/events", authMiddleware, requirePage("events"), async (req, res) => {
  if (!canManageEventsForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot create church events" });
  }
  const db = getDb();
  const { title, date, time, location, departmentId, description, hostScope, fellowshipId, cellId } = req.body;
  let resolvedFellowshipId = null;
  let resolvedCellId = null;
  if (hostScope === "fellowship") {
    if (!fellowshipId) {
      return res.status(400).json({ error: "Select a fellowship for this event" });
    }
    resolvedFellowshipId = fellowshipId;
  } else if (hostScope === "cell") {
    if (!cellId) {
      return res.status(400).json({ error: "Select a cell for this event" });
    }
    const cell = await db.prepare("SELECT fellowship_id FROM cells WHERE id = ?").get(cellId);
    if (!cell) {
      return res.status(400).json({ error: "Invalid cell" });
    }
    resolvedCellId = cellId;
    resolvedFellowshipId = cell.fellowship_id || fellowshipId || null;
  }
  const id = uid();
  await db.prepare(
    `INSERT INTO events (id, title, date, time, location, department_id, description, fellowship_id, cell_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    date,
    time,
    location,
    departmentId || null,
    description,
    resolvedFellowshipId,
    resolvedCellId,
    req.user.member.id
  );
  await logActivity(db, `Event created: ${title}`, req.user.member.id);
  const responseHostScope = resolvedCellId ? "cell" : resolvedFellowshipId ? "fellowship" : "church";
  res.status(201).json({
    id,
    title,
    date,
    time,
    location,
    departmentId,
    description,
    hostScope: responseHostScope,
    fellowshipId: resolvedFellowshipId,
    cellId: resolvedCellId,
    rsvpIds: [],
    programme: [],
  });
});

app.put("/api/events/:id/programme", authMiddleware, requirePage("events"), async (req, res) => {
  if (!canManageEventsForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot edit event programmes" });
  }
  const db = getDb();
  const event = await db.prepare("SELECT id, date, title FROM events WHERE id = ?").get(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const items = Array.isArray(req.body.items) ? req.body.items : [];
  await db.prepare("DELETE FROM tasks WHERE event_id = ?").run(req.params.id);

  let hasAssignees = false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item?.title?.trim()) continue;
    const taskId = uid();
    await db
      .prepare(
        `INSERT INTO tasks (id, title, description, department_id, due_date, priority, status, created_by, event_id, sort_order, scheduled_time)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
      )
      .run(
        taskId,
        item.title.trim(),
        item.description?.trim() || "",
        null,
        event.date,
        item.priority || "medium",
        req.user.member.id,
        req.params.id,
        item.sortOrder ?? i,
        item.scheduledTime?.trim() || null
      );
    const assigneeIds = Array.isArray(item.assigneeIds) ? item.assigneeIds : [];
    if (assigneeIds.length) hasAssignees = true;
    for (const mid of assigneeIds) {
      await db.prepare("INSERT INTO task_assignees (task_id, member_id, notified) VALUES (?, ?, 0)").run(taskId, mid);
    }
  }

  const programmeStatus = items.some((item) => item?.title?.trim())
    ? hasAssignees
      ? "draft"
      : "none"
    : "none";
  await db
    .prepare(
      `UPDATE events SET programme_status = ?, programme_confirmed_at = NULL, programme_confirmed_by = NULL WHERE id = ?`
    )
    .run(programmeStatus, req.params.id);

  if (programmeStatus === "draft") {
    const pastors = await db
      .prepare("SELECT id FROM members WHERE active = 1 AND role IN ('Senior Pastor', 'Associate Pastor')")
      .all();
    for (const p of pastors) {
      await notifyMember(
        db,
        p.id,
        "Programme awaiting approval",
        `${event.title} — confirm the programme to notify assignees`,
        "event"
      );
    }
  }

  const programme = await loadEventProgramme(db, req.params.id);
  const updated = await db.prepare("SELECT programme_status FROM events WHERE id = ?").get(req.params.id);
  res.json({ programme, programmeStatus: updated?.programme_status || programmeStatus });
});

app.post("/api/events/:id/programme/confirm", authMiddleware, requirePage("events"), async (req, res) => {
  if (!canConfirmEventProgramme(req.user.member.role)) {
    return res.status(403).json({ error: "Only a Pastor can confirm event programmes" });
  }
  const db = getDb();
  const event = await db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  if (event.programme_status === "confirmed") {
    return res.status(400).json({ error: "Programme is already confirmed" });
  }

  const tasks = await db.prepare("SELECT id, title FROM tasks WHERE event_id = ?").all(req.params.id);
  let notifiedCount = 0;
  for (const task of tasks) {
    const assignees = await db
      .prepare("SELECT member_id FROM task_assignees WHERE task_id = ? AND notified = 0")
      .all(task.id);
    for (const row of assignees) {
      await notifyMember(
        db,
        row.member_id,
        "Event programme assignment",
        `${event.title}: ${task.title}`,
        "task"
      );
      await db
        .prepare("UPDATE task_assignees SET notified = 1 WHERE task_id = ? AND member_id = ?")
        .run(task.id, row.member_id);
      notifiedCount++;
    }
  }

  await db
    .prepare(
      `UPDATE events SET programme_status = 'confirmed', programme_confirmed_at = datetime('now'), programme_confirmed_by = ? WHERE id = ?`
    )
    .run(req.user.member.id, req.params.id);

  await logActivity(db, `Event programme confirmed: ${event.title}`, req.user.member.id);

  const programme = await loadEventProgramme(db, req.params.id);
  res.json({
    programme,
    programmeStatus: "confirmed",
    programmeConfirmedAt: new Date().toISOString(),
    programmeConfirmedBy: req.user.member.id,
    notifiedCount,
  });
});

app.post("/api/events/:id/rsvp", authMiddleware, requirePage("events"), async (req, res) => {
  const db = getDb();
  const mid = req.user.member.id;
  const exists = await db.prepare("SELECT 1 FROM event_rsvps WHERE event_id = ? AND member_id = ?").get(req.params.id, mid);
  if (exists) {
    await db.prepare("DELETE FROM event_rsvps WHERE event_id = ? AND member_id = ?").run(req.params.id, mid);
    return res.json({ rsvped: false });
  }
  await db.prepare("INSERT INTO event_rsvps (event_id, member_id) VALUES (?, ?)").run(req.params.id, mid);
  res.json({ rsvped: true });
});

// ─── Messages (chat) ───────────────────────────────────────────────────────────

app.get("/api/messages/conversations", authMiddleware, requirePage("communications"), async (req, res) => {
  const db = getDb();
  const mid = req.user.member.id;

  const inbox = await db
    .prepare(
      `SELECT m.*, mr.read FROM messages m
       JOIN message_recipients mr ON mr.message_id = m.id
       WHERE mr.member_id = ?`
    )
    .all(mid);
  const sent = await db.prepare("SELECT * FROM messages WHERE from_id = ?").all(mid);

  const convos = new Map();

  const upsert = (key, data) => {
    const existing = convos.get(key);
    if (!existing) {
      convos.set(key, { ...data, unreadCount: data.unreadCount || 0 });
      return;
    }
    const newer = new Date(data.lastAt) > new Date(existing.lastAt);
    convos.set(key, {
      id: data.id ?? existing.id,
      type: data.type ?? existing.type,
      partnerId: data.partnerId ?? existing.partnerId,
      partnerName: data.partnerName ?? existing.partnerName,
      lastMessage: newer ? data.lastMessage : existing.lastMessage,
      lastAt: newer ? data.lastAt : existing.lastAt,
      unreadCount: (existing.unreadCount || 0) + (data.unreadCount || 0),
    });
  };

  for (const m of inbox) {
    const preview = m.body?.slice(0, 80) || m.subject || "";
    if (m.broadcast) {
      upsert(`broadcast:${m.from_id}`, {
        id: `broadcast:${m.from_id}`,
        type: "broadcast",
        partnerId: m.from_id,
        partnerName: "Church Announcement",
        lastMessage: preview,
        lastAt: m.sent_at,
        unreadCount: m.read ? 0 : 1,
      });
    } else {
      upsert(m.from_id, {
        id: m.from_id,
        type: "direct",
        partnerId: m.from_id,
        partnerName: null,
        lastMessage: preview,
        lastAt: m.sent_at,
        unreadCount: m.read ? 0 : 1,
      });
    }
  }

  for (const m of sent) {
    if (m.broadcast) continue;
    const recips = await db.prepare("SELECT member_id FROM message_recipients WHERE message_id = ?").all(m.id);
    const preview = m.body?.slice(0, 80) || m.subject || "";
    for (const r of recips) {
      if (r.member_id === mid) continue;
      upsert(r.member_id, {
        id: r.member_id,
        type: "direct",
        partnerId: r.member_id,
        partnerName: null,
        lastMessage: preview,
        lastAt: m.sent_at,
        unreadCount: 0,
      });
    }
  }

  const memberRows = await db.prepare("SELECT id, name, role FROM members").all();
  const memberMap = Object.fromEntries(memberRows.map((m) => [m.id, m]));

  const list = [...convos.values()]
    .map((c) => ({
      ...c,
      partnerName:
        c.type === "broadcast"
          ? memberMap[c.partnerId]?.name
            ? `Broadcast · ${memberMap[c.partnerId].name}`
            : "Church Announcement"
          : memberMap[c.partnerId]?.name || "Unknown",
      partnerRole: memberMap[c.partnerId]?.role,
    }))
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  res.json(list);
});

app.get("/api/messages/thread/:partnerId", authMiddleware, requirePage("communications"), async (req, res) => {
  const db = getDb();
  const mid = req.user.member.id;
  const { partnerId } = req.params;

  try {
  let rows;
  if (partnerId === "__broadcast__") {
    rows = await db
      .prepare(
        `SELECT m.* FROM messages m
         WHERE m.broadcast = 1 AND (m.from_id = ? OR EXISTS (
           SELECT 1 FROM message_recipients mr WHERE mr.message_id = m.id AND mr.member_id = ?
         ))
         ORDER BY m.sent_at ASC`
      )
      .all(mid, mid);
  } else if (partnerId.startsWith("broadcast:")) {
    const fromId = partnerId.slice("broadcast:".length);
    rows = await db
      .prepare(
        `SELECT m.* FROM messages m
         JOIN message_recipients mr ON mr.message_id = m.id
         WHERE m.broadcast = 1 AND m.from_id = ? AND mr.member_id = ?
         ORDER BY m.sent_at ASC`
      )
      .all(fromId, mid);
  } else {
    rows = await db
      .prepare(
        `SELECT DISTINCT m.* FROM messages m
         LEFT JOIN message_recipients mr ON mr.message_id = m.id
         WHERE m.broadcast = 0 AND (
           (m.from_id = ? AND mr.member_id = ?) OR (m.from_id = ? AND mr.member_id = ?)
         )
         ORDER BY m.sent_at ASC`
      )
      .all(mid, partnerId, partnerId, mid);
  }

  const directPartner =
    partnerId && !partnerId.startsWith("broadcast") && partnerId !== "__broadcast__" ? partnerId : null;

  const result = await Promise.all(
    rows.map(async (m) => {
      const recips = await db.prepare("SELECT member_id FROM message_recipients WHERE message_id = ?").all(m.id);
      const readRow = await db
        .prepare("SELECT read FROM message_recipients WHERE message_id = ? AND member_id = ?")
        .get(m.id, mid);
      const isMine = m.from_id === mid;
      let recipientRead;
      if (isMine && directPartner && !m.broadcast) {
        const recipRow = await db
          .prepare("SELECT read FROM message_recipients WHERE message_id = ? AND member_id = ?")
          .get(m.id, directPartner);
        recipientRead = !!recipRow?.read;
      }
      return {
        id: m.id,
        fromId: m.from_id,
        subject: m.subject,
        body: m.body,
        sentAt: m.sent_at,
        broadcast: !!m.broadcast,
        toIds: recips.map((r) => r.member_id),
        read: isMine ? true : !!readRow?.read,
        recipientRead,
      };
    })
  );

  res.json(result);
  } catch (err) {
    console.error("messages/thread:", err.message);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

app.get("/api/messages", authMiddleware, requirePage("communications"), async (req, res) => {
  const db = getDb();
  const mid = req.user.member.id;
  const { box } = req.query;
  let messages;
  if (box === "sent") {
    messages = await db.prepare("SELECT * FROM messages WHERE from_id = ? ORDER BY sent_at DESC").all(mid);
  } else {
    messages = await db
      .prepare(
        `SELECT m.* FROM messages m
         JOIN message_recipients mr ON mr.message_id = m.id
         WHERE mr.member_id = ? ORDER BY m.sent_at DESC`
      )
      .all(mid);
  }
  res.json(
    await Promise.all(
      messages.map(async (m) => {
        const recips = await db
          .prepare("SELECT member_id FROM message_recipients WHERE message_id = ?")
          .all(m.id);
        const readRow = await db
          .prepare("SELECT read FROM message_recipients WHERE message_id = ? AND member_id = ?")
          .get(m.id, mid);
        return {
          id: m.id,
          fromId: m.from_id,
          subject: m.subject,
          body: m.body,
          sentAt: m.sent_at,
          broadcast: !!m.broadcast,
          toIds: recips.map((r) => r.member_id),
          read: !!readRow?.read,
        };
      })
    )
  );
});

app.post("/api/messages", authMiddleware, requirePage("communications"), async (req, res) => {
  const db = getDb();
  const { subject = "", body, toIds, broadcast } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: "Message body required" });
  const sender = await db.prepare("SELECT * FROM members WHERE id = ?").get(req.user.member.id);
  let recipients = toIds || [];
  if (broadcast) {
    if (!["Senior Pastor", "Admin"].includes(sender.role))
      return res.status(403).json({ error: "Cannot broadcast" });
    recipients = (await db.prepare("SELECT id FROM members WHERE active = 1").all()).map((m) => m.id);
  } else {
    recipients = [...new Set((recipients || []).filter((id) => typeof id === "string" && id.trim()))];
    if (!recipients.length) return res.status(400).json({ error: "Choose who to message" });
    for (const tid of recipients) {
      const target = await db.prepare("SELECT * FROM members WHERE id = ?").get(tid);
      if (!target) return res.status(400).json({ error: "Invalid recipient" });
      if (!canMessageTarget(sender, target)) return res.status(403).json({ error: `Cannot message ${target?.name}` });
    }
  }
  const id = uid();
  await db.prepare("INSERT INTO messages (id, from_id, subject, body, broadcast) VALUES (?, ?, ?, ?, ?)").run(
    id,
    req.user.member.id,
    subject || "",
    body.trim(),
    broadcast ? 1 : 0
  );
  for (const tid of recipients) {
    if (tid !== req.user.member.id) {
      await db.prepare("INSERT INTO message_recipients (message_id, member_id) VALUES (?, ?)").run(id, tid);
      await notifyMember(db, tid, "New message", body.trim().slice(0, 60), "message");
    }
  }

  const payload = {
    id,
    fromId: req.user.member.id,
    subject: subject || "",
    body: body.trim(),
    sentAt: new Date().toISOString(),
    broadcast: !!broadcast,
    toIds: recipients,
    read: false,
  };
  broadcastChatMessage(payload, recipients).catch(() => {});

  res.status(201).json({ id, subject: subject || "", body: body.trim(), toIds: recipients, broadcast: !!broadcast });
});

app.patch("/api/messages/:id/read", authMiddleware, async (req, res) => {
  const db = getDb();
  const readerId = req.user.member.id;
  const result = await db
    .prepare("UPDATE message_recipients SET read = 1 WHERE message_id = ? AND member_id = ? AND read = 0")
    .run(req.params.id, readerId);
  if (result.changes > 0) {
    const msg = await db.prepare("SELECT from_id, broadcast FROM messages WHERE id = ?").get(req.params.id);
    if (msg?.from_id && msg.from_id !== readerId && !msg.broadcast) {
      broadcastMessageRead(msg.from_id, { messageId: req.params.id, readBy: readerId }).catch(() => {});
    }
  }
  res.json({ ok: true });
});

// ─── Finances ──────────────────────────────────────────────────────────────────

function financeToJson(f, eventTitle = null, cellName = null) {
  let purposeDisplay = f.purpose_label || null;
  if (f.purpose_type === "event" && eventTitle) purposeDisplay = eventTitle;
  if (f.purpose_type === "cell" && cellName) purposeDisplay = cellName;
  if (f.purpose_type === "service" && f.purpose_label) purposeDisplay = f.purpose_label;
  if (f.purpose_type === "service" && !purposeDisplay && f.purpose_id) {
    purposeDisplay = `Service · ${f.purpose_id}`;
  }
  return {
    id: f.id,
    date: f.date,
    type: f.type,
    category: f.category,
    amount: f.amount,
    memberId: f.member_id,
    description: f.description,
    purposeType: f.purpose_type || null,
    purposeId: f.purpose_id || null,
    purposeLabel: f.purpose_label || null,
    purposeDisplay: purposeDisplay || (f.purpose_type ? f.purpose_type : null),
  };
}

app.get("/api/finances/expense-contexts", authMiddleware, async (req, res) => {
  if (!canAccessFinances(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const [services, events, cells] = await Promise.all([
    db
      .prepare(
        `SELECT id, date FROM attendance_records WHERE type = 'service' ORDER BY date DESC LIMIT 24`
      )
      .all(),
    db.prepare("SELECT id, title, date FROM events ORDER BY date DESC LIMIT 24").all(),
    db.prepare("SELECT id, name FROM cells ORDER BY name").all(),
  ]);
  res.json({
    services: services.map((s) => ({
      id: s.id,
      date: s.date,
      label: `Sunday Service · ${s.date}`,
    })),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      label: `${e.title} · ${e.date}`,
    })),
    cells: cells.map((c) => ({ id: c.id, name: c.name, label: c.name })),
  });
});

app.get("/api/finances", authMiddleware, async (req, res) => {
  if (!canAccessFinances(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const rows = await db.prepare("SELECT * FROM finances ORDER BY date DESC").all();
  const eventIds = [...new Set(rows.filter((r) => r.purpose_type === "event" && r.purpose_id).map((r) => r.purpose_id))];
  const cellIds = [...new Set(rows.filter((r) => r.purpose_type === "cell" && r.purpose_id).map((r) => r.purpose_id))];
  const eventMap = {};
  const cellMap = {};
  if (eventIds.length) {
    for (const e of await db.prepare(`SELECT id, title FROM events WHERE id IN (${eventIds.map(() => "?").join(",")})`).all(...eventIds)) {
      eventMap[e.id] = e.title;
    }
  }
  if (cellIds.length) {
    for (const c of await db.prepare(`SELECT id, name FROM cells WHERE id IN (${cellIds.map(() => "?").join(",")})`).all(...cellIds)) {
      cellMap[c.id] = c.name;
    }
  }
  res.json(
    rows.map((f) =>
      financeToJson(
        f,
        f.purpose_type === "event" ? eventMap[f.purpose_id] : null,
        f.purpose_type === "cell" ? cellMap[f.purpose_id] : null
      )
    )
  );
});

app.post("/api/finances", authMiddleware, async (req, res) => {
  if (!canAccessFinances(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { date, type, category, amount, memberId, description, purposeType, purposeId, purposeLabel } = req.body;
  const id = uid();
  await db.prepare(
    `INSERT INTO finances (id, date, type, category, amount, member_id, description, purpose_type, purpose_id, purpose_label, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    date,
    type,
    category,
    amount,
    memberId || null,
    description || null,
    purposeType || null,
    purposeId || null,
    purposeLabel || null,
    req.user.member.id
  );
  await logActivity(
    db,
    `${type} recorded: ${formatCurrency(amount)}${purposeLabel ? ` (${purposeLabel})` : ""}`,
    req.user.member.id
  );
  res.status(201).json({
    id,
    date,
    type,
    category,
    amount,
    memberId,
    description,
    purposeType: purposeType || null,
    purposeId: purposeId || null,
    purposeLabel: purposeLabel || null,
  });
});

// ─── Prayer ────────────────────────────────────────────────────────────────────

app.get("/api/prayers", authMiddleware, requirePage("prayer"), async (req, res) => {
  const db = getDb();
  const actorId = req.user.member.id;
  const viewPrivate = canViewPrivatePrayers(req.user.member.role, req.user.departmentAbilities);
  const rows = viewPrivate
    ? await db.prepare("SELECT * FROM prayer_requests ORDER BY created_at DESC").all()
    : await db
        .prepare(
          `SELECT * FROM prayer_requests
           WHERE member_id = ? OR is_private = 0
           ORDER BY created_at DESC`
        )
        .all(actorId);
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
      isMine: p.member_id === actorId,
    }))
  );
});

app.post("/api/prayers", authMiddleware, requirePage("prayer"), async (req, res) => {
  const db = getDb();
  const { title, content, isPrivate } = req.body;
  const trimmedTitle = title?.trim();
  const trimmedContent = content?.trim();
  if (!trimmedTitle || !trimmedContent) {
    return res.status(400).json({ error: "Title and prayer request are required" });
  }
  const id = uid();
  const privateFlag = isPrivate ? 1 : 0;
  await db.prepare(
    `INSERT INTO prayer_requests (id, member_id, title, content, is_private) VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.user.member.id, trimmedTitle, trimmedContent, privateFlag);
  await logActivity(
    db,
    privateFlag
      ? `Private prayer request submitted: ${trimmedTitle}`
      : `Prayer request shared with church: ${trimmedTitle}`,
    req.user.member.id
  );
  res.status(201).json({
    id,
    memberId: req.user.member.id,
    title: trimmedTitle,
    content: trimmedContent,
    isPrivate: !!privateFlag,
    status: "pending",
    isMine: true,
  });
});

app.patch("/api/prayers/:id", authMiddleware, requirePage("prayer"), async (req, res) => {
  if (!canManagePrayerForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot respond to prayer requests" });
  }
  const db = getDb();
  const { status, response } = req.body;
  await db.prepare("UPDATE prayer_requests SET status = ?, response = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    response || null,
    req.params.id
  );
  res.json({ ok: true });
});

// ─── Discipleship class (follow-ups) ───────────────────────────────────────────

const DISCIPLESHIP_STAGES = new Set(["Invitee", "New Convert", "In Training", "Graduated"]);

async function getFollowUpOr404(db, id, res) {
  const row = await db.prepare("SELECT * FROM follow_ups WHERE id = ?").get(id);
  if (!row) {
    res.status(404).json({ error: "Student not found in class" });
    return null;
  }
  return row;
}

async function canActOnFollowUp(db, user, followUp) {
  if (canManageDiscipleshipForUser(user.member.role, user.departmentAbilities)) return true;
  return followUp.assigned_to_id === user.member.id;
}

app.get("/api/follow-ups", authMiddleware, requirePage("discipleship"), async (req, res) => {
  try {
  const db = getDb();
  const actor = req.user.member;
  const viewAll = canViewAllDiscipleshipClass(actor.role, req.user.departmentAbilities);
  const rows = viewAll
    ? await db.prepare("SELECT * FROM follow_ups ORDER BY created_at DESC").all()
    : await db
        .prepare("SELECT * FROM follow_ups WHERE assigned_to_id = ? ORDER BY created_at DESC")
        .all(actor.id);

  res.json(
    await Promise.all(
      rows.map(async (fu) => ({
        id: fu.id,
        name: fu.name,
        contact: fu.contact,
        memberId: fu.member_id || null,
        stage: fu.stage,
        assignedToId: fu.assigned_to_id,
        enrolledById: fu.enrolled_by || null,
        createdAt: fu.created_at,
        notes: await db
          .prepare(
            "SELECT id, date, text, outcome, created_by FROM follow_up_notes WHERE follow_up_id = ? ORDER BY date DESC, id DESC"
          )
          .all(fu.id)
          .then((notes) =>
            notes.map((n) => ({
              id: n.id,
              date: n.date,
              text: n.text,
              outcome: n.outcome,
              createdById: n.created_by,
            }))
          ),
      }))
    )
  );
  } catch (err) {
    console.error("GET /api/follow-ups error:", err);
    res.status(500).json({ error: err.message || "Failed to load class records" });
  }
});

app.post("/api/follow-ups", authMiddleware, requirePage("discipleship"), async (req, res) => {
  if (!canManageDiscipleshipForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot enroll students in the class" });
  }
  const db = getDb();
  const { memberId, name, contact, stage, assignedToId } = req.body;
  if (!stage || !DISCIPLESHIP_STAGES.has(stage)) {
    return res.status(400).json({ error: "Valid class stage is required" });
  }

  let studentName = name?.trim();
  let studentContact = contact?.trim() || "";
  let memberRef = null;

  if (memberId) {
    const member = await db.prepare("SELECT id, name, phone, email FROM members WHERE id = ? AND active = 1").get(memberId);
    if (!member) return res.status(404).json({ error: "Member not found" });
    const existing = await db.prepare("SELECT id FROM follow_ups WHERE member_id = ?").get(memberId);
    if (existing) return res.status(409).json({ error: "This person is already enrolled in the class" });
    studentName = member.name;
    studentContact = member.phone || member.email || "";
    memberRef = memberId;
  } else {
    if (!studentName) return res.status(400).json({ error: "Name is required for guest invitees" });
  }

  let assignee = assignedToId || req.user.member.id;
  if (canAssignDiscipleshipMentor(req.user.member.role)) {
    if (!assignedToId) return res.status(400).json({ error: "Select a mentor for this student" });
    assignee = assignedToId;
  }
  const mentor = await db.prepare("SELECT id FROM members WHERE id = ? AND active = 1").get(assignee);
  if (!mentor) return res.status(400).json({ error: "Selected mentor not found" });
  if (memberRef && assignee === memberRef) {
    return res.status(400).json({ error: "A student cannot be their own mentor" });
  }

  const id = uid();
  await db
    .prepare(
      `INSERT INTO follow_ups (id, name, contact, stage, assigned_to_id, member_id, enrolled_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, studentName, studentContact, stage, assignee, memberRef, req.user.member.id);

  await logActivity(db, `Enrolled in discipleship class: ${studentName}`, req.user.member.id);
  res.status(201).json({
    id,
    name: studentName,
    contact: studentContact,
    memberId: memberRef,
    stage,
    assignedToId: assignee,
    enrolledById: req.user.member.id,
    notes: [],
  });
});

app.post("/api/follow-ups/:id/notes", authMiddleware, requirePage("discipleship"), async (req, res) => {
  const db = getDb();
  const fu = await getFollowUpOr404(db, req.params.id, res);
  if (!fu) return;
  if (!(await canActOnFollowUp(db, req.user, fu))) {
    return res.status(403).json({ error: "You can only log sessions for your assigned students" });
  }
  const { date, text, outcome } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Session notes are required" });
  const id = uid();
  const sessionDate = date || new Date().toISOString().slice(0, 10);
  await db.prepare(
    "INSERT INTO follow_up_notes (id, follow_up_id, date, text, outcome, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.id, sessionDate, text.trim(), outcome?.trim() || "", req.user.member.id);
  res.status(201).json({ id, date: sessionDate, text: text.trim(), outcome: outcome?.trim() || "" });
});

async function getFollowUpNoteOr404(db, followUpId, noteId, res) {
  const row = await db
    .prepare("SELECT * FROM follow_up_notes WHERE id = ? AND follow_up_id = ?")
    .get(noteId, followUpId);
  if (!row) {
    res.status(404).json({ error: "Session not found" });
    return null;
  }
  return row;
}

app.patch("/api/follow-ups/:id/notes/:noteId", authMiddleware, requirePage("discipleship"), async (req, res) => {
  const db = getDb();
  const fu = await getFollowUpOr404(db, req.params.id, res);
  if (!fu) return;
  if (!(await canActOnFollowUp(db, req.user, fu))) {
    return res.status(403).json({ error: "You can only edit sessions for your assigned students" });
  }
  const existing = await getFollowUpNoteOr404(db, req.params.id, req.params.noteId, res);
  if (!existing) return;

  const { date, text, outcome } = req.body;
  if (text !== undefined && !text?.trim()) {
    return res.status(400).json({ error: "Session notes are required" });
  }
  const nextDate = date ?? existing.date;
  const nextText = text !== undefined ? text.trim() : existing.text;
  const nextOutcome = outcome !== undefined ? (outcome?.trim() || "") : existing.outcome;

  await db
    .prepare("UPDATE follow_up_notes SET date = ?, text = ?, outcome = ? WHERE id = ?")
    .run(nextDate, nextText, nextOutcome, req.params.noteId);

  res.json({
    id: req.params.noteId,
    date: nextDate,
    text: nextText,
    outcome: nextOutcome,
    createdById: existing.created_by,
  });
});

app.delete("/api/follow-ups/:id/notes/:noteId", authMiddleware, requirePage("discipleship"), async (req, res) => {
  const db = getDb();
  const fu = await getFollowUpOr404(db, req.params.id, res);
  if (!fu) return;
  if (!(await canActOnFollowUp(db, req.user, fu))) {
    return res.status(403).json({ error: "You can only delete sessions for your assigned students" });
  }
  const existing = await getFollowUpNoteOr404(db, req.params.id, req.params.noteId, res);
  if (!existing) return;

  await db.prepare("DELETE FROM follow_up_notes WHERE id = ?").run(req.params.noteId);
  res.json({ ok: true });
});

app.patch("/api/follow-ups/:id", authMiddleware, requirePage("discipleship"), async (req, res) => {
  const db = getDb();
  const fu = await getFollowUpOr404(db, req.params.id, res);
  if (!fu) return;

  const { stage, assignedToId } = req.body;
  const canManage = canManageDiscipleshipForUser(req.user.member.role, req.user.departmentAbilities);
  const isMentor = fu.assigned_to_id === req.user.member.id;

  if (stage !== undefined) {
    if (!DISCIPLESHIP_STAGES.has(stage)) return res.status(400).json({ error: "Invalid stage" });
    if (!canManage && !isMentor) {
      return res.status(403).json({ error: "You cannot update this student's progress" });
    }
    await db.prepare("UPDATE follow_ups SET stage = ? WHERE id = ?").run(stage, req.params.id);
  }

  if (assignedToId !== undefined) {
    if (!canAssignDiscipleshipMentor(req.user.member.role)) {
      return res.status(403).json({ error: "Only pastors and admins can assign mentors" });
    }
    if (!assignedToId) {
      return res.status(400).json({ error: "Mentor is required" });
    }
    const mentor = await db.prepare("SELECT id FROM members WHERE id = ? AND active = 1").get(assignedToId);
    if (!mentor) return res.status(400).json({ error: "Selected mentor not found" });
    if (fu.member_id && assignedToId === fu.member_id) {
      return res.status(400).json({ error: "A student cannot be their own mentor" });
    }
    await db.prepare("UPDATE follow_ups SET assigned_to_id = ? WHERE id = ?").run(assignedToId, req.params.id);
  }

  res.json({ ok: true });
});

app.delete("/api/follow-ups/:id", authMiddleware, requirePage("discipleship"), async (req, res) => {
  if (!canViewAllDiscipleshipClass(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot remove students from the class" });
  }
  const db = getDb();
  const fu = await getFollowUpOr404(db, req.params.id, res);
  if (!fu) return;
  await db.prepare("DELETE FROM follow_ups WHERE id = ?").run(req.params.id);
  await logActivity(db, `Removed from discipleship class: ${fu.name}`, req.user.member.id);
  res.json({ ok: true });
});

// ─── Announcements ─────────────────────────────────────────────────────────────

const ANNOUNCEMENT_TARGETS = new Set(["all", "fellowship", "cell", "department", "role", "leaders"]);

function normalizeAnnouncementTarget(target, targetId, targetRole) {
  if (target === "all" || target === "leaders") return { targetId: null, targetRole: null };
  if (target === "role") return { targetId: null, targetRole: targetRole || null };
  return { targetId: targetId || null, targetRole: null };
}

function announcementToJson(a) {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    target: a.target,
    targetId: a.target_id,
    targetRole: a.target_role,
    pinned: !!a.pinned,
    expiresAt: a.expires_at,
    createdAt: a.created_at,
    createdBy: a.created_by,
  };
}

async function filterAnnouncementsForMember(db, member, departmentAbilities, rows) {
  const canManage = canPostAnnouncementsForUser(member.role, departmentAbilities);
  const filtered = [];
  for (const a of rows) {
    if (canManage) {
      filtered.push(a);
      continue;
    }
    if (a.target === "all") {
      filtered.push(a);
      continue;
    }
    if (a.target === "fellowship" && a.target_id === member.fellowshipId) {
      filtered.push(a);
      continue;
    }
    if (a.target === "cell" && a.target_id === member.cellId) {
      filtered.push(a);
      continue;
    }
    if (a.target === "department") {
      const inDept = await db
        .prepare("SELECT 1 FROM member_departments WHERE member_id = ? AND department_id = ?")
        .get(member.id, a.target_id);
      if (inDept) filtered.push(a);
      continue;
    }
    if (a.target === "role" && a.target_role === member.role) filtered.push(a);
    if (a.target === "leaders" && (await receivesLeadersAnnouncement(db, member))) filtered.push(a);
  }
  return filtered;
}

app.get("/api/announcements", authMiddleware, requirePage("announcements"), async (req, res) => {
  const db = getDb();
  const m = req.user.member;
  const canManage = canPostAnnouncementsForUser(m.role, req.user.departmentAbilities);
  const all = await db
    .prepare(
      canManage
        ? "SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC"
        : "SELECT * FROM announcements WHERE expires_at >= date('now') ORDER BY pinned DESC, created_at DESC"
    )
    .all();
  const filtered = await filterAnnouncementsForMember(db, m, req.user.departmentAbilities || [], all);
  res.json(filtered.map(announcementToJson));
});

app.post("/api/announcements", authMiddleware, requirePage("announcements"), async (req, res) => {
  if (!canPostAnnouncementsForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot post announcements" });
  }
  const db = getDb();
  const { title, content, target, targetId, targetRole, pinned, expiresAt } = req.body;
  if (!ANNOUNCEMENT_TARGETS.has(target)) {
    return res.status(400).json({ error: "Invalid announcement target" });
  }
  const normalized = normalizeAnnouncementTarget(target, targetId, targetRole);
  const id = uid();
  await db.prepare(
    `INSERT INTO announcements (id, title, content, target, target_id, target_role, pinned, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    content,
    target,
    normalized.targetId,
    normalized.targetRole,
    pinned ? 1 : 0,
    expiresAt,
    req.user.member.id
  );
  await logActivity(db, `Announcement posted: ${title}`, req.user.member.id);
  res.status(201).json({ id, title, content, target, targetId, pinned, expiresAt });
});

app.patch("/api/announcements/:id", authMiddleware, requirePage("announcements"), async (req, res) => {
  if (!canPostAnnouncementsForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot edit announcements" });
  }
  const db = getDb();
  const existing = await db.prepare("SELECT * FROM announcements WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Announcement not found" });

  const { title, content, target, targetId, targetRole, pinned, expiresAt } = req.body;
  const nextTitle = title ?? existing.title;
  const nextContent = content ?? existing.content;
  const nextTarget = target ?? existing.target;
  if (target !== undefined && !ANNOUNCEMENT_TARGETS.has(nextTarget)) {
    return res.status(400).json({ error: "Invalid announcement target" });
  }
  const normalized =
    target !== undefined
      ? normalizeAnnouncementTarget(nextTarget, targetId, targetRole)
      : { targetId: existing.target_id, targetRole: existing.target_role };
  const nextTargetId = target !== undefined ? normalized.targetId : existing.target_id;
  const nextTargetRole = target !== undefined ? normalized.targetRole : existing.target_role;
  const nextPinned = pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned;
  const nextExpiresAt = expiresAt ?? existing.expires_at;

  await db
    .prepare(
      `UPDATE announcements SET title = ?, content = ?, target = ?, target_id = ?, target_role = ?, pinned = ?, expires_at = ?
       WHERE id = ?`
    )
    .run(nextTitle, nextContent, nextTarget, nextTargetId, nextTargetRole, nextPinned, nextExpiresAt, req.params.id);

  await logActivity(db, `Announcement updated: ${nextTitle}`, req.user.member.id);
  res.json({
    id: req.params.id,
    title: nextTitle,
    content: nextContent,
    target: nextTarget,
    targetId: nextTargetId,
    targetRole: nextTargetRole,
    pinned: !!nextPinned,
    expiresAt: nextExpiresAt,
    createdAt: existing.created_at,
    createdBy: existing.created_by,
  });
});

app.delete("/api/announcements/:id", authMiddleware, requirePage("announcements"), async (req, res) => {
  if (!canPostAnnouncementsForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot delete announcements" });
  }
  const db = getDb();
  const existing = await db.prepare("SELECT * FROM announcements WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Announcement not found" });

  await db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
  await logActivity(db, `Announcement deleted: ${existing.title}`, req.user.member.id);
  res.json({ ok: true });
});

// ─── Tasks ─────────────────────────────────────────────────────────────────────

app.get("/api/tasks", authMiddleware, requirePage("tasks"), async (req, res) => {
  const db = getDb();
  const role = req.user.member.role;
  let tasks;
  if (["Senior Pastor", "Associate Pastor", "Admin"].includes(role)) {
    tasks = await db.prepare("SELECT * FROM tasks ORDER BY due_date").all();
  } else {
    tasks = await db
      .prepare(
        `SELECT t.* FROM tasks t
         JOIN task_assignees ta ON ta.task_id = t.id
         WHERE ta.member_id = ? ORDER BY t.due_date`
      )
      .all(req.user.member.id);
  }
  res.json(
    await Promise.all(
      tasks.map(async (t) => {
        const assignees = await db
          .prepare("SELECT member_id FROM task_assignees WHERE task_id = ?")
          .all(t.id);
        const eventRow = t.event_id
          ? await db.prepare("SELECT id, title, date FROM events WHERE id = ?").get(t.event_id)
          : null;
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          departmentId: t.department_id,
          eventId: t.event_id || null,
          eventTitle: eventRow?.title || null,
          eventDate: eventRow?.date || null,
          scheduledTime: t.scheduled_time || null,
          sortOrder: t.sort_order ?? 0,
          dueDate: t.due_date,
          priority: t.priority,
          status: t.status,
          assigneeIds: assignees.map((r) => r.member_id),
        };
      })
    )
  );
});

app.post("/api/tasks", authMiddleware, requirePage("tasks"), async (req, res) => {
  if (!canManageTasksForUser(req.user.member.role, req.user.departmentAbilities)) {
    return res.status(403).json({ error: "You cannot create tasks" });
  }
  const db = getDb();
  const { title, description, departmentId, dueDate, priority, assigneeIds = [], eventId } = req.body;
  const id = uid();
  await db.prepare(
    `INSERT INTO tasks (id, title, description, department_id, due_date, priority, created_by, event_id, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    title,
    description,
    departmentId || null,
    dueDate,
    priority || "medium",
    req.user.member.id,
    eventId || null
  );
  for (const mid of assigneeIds) {
    await db.prepare("INSERT INTO task_assignees (task_id, member_id, notified) VALUES (?, ?, 1)").run(id, mid);
    await notifyMember(db, mid, "New task assigned", title, "task");
  }
  res.status(201).json({ id, title, description, departmentId, dueDate, priority, assigneeIds, status: "pending" });
});

app.patch("/api/tasks/:id", authMiddleware, requirePage("tasks"), async (req, res) => {
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
    await db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }
  res.json({ ok: true });
});

// ─── Media ─────────────────────────────────────────────────────────────────────

app.get("/api/media/capabilities", authMiddleware, requirePage("media"), async (req, res) => {
  try {
    const member = req.user.member;
    const deptAbilities = req.user.departmentAbilities || [];
    res.json({
      canUpload: await canUploadMedia(getDb(), member, deptAbilities),
      canApprove: canApproveMedia(member.role),
      canViewPending: canViewAllMedia(member.role) || (await canUploadMedia(getDb(), member, deptAbilities)),
    });
  } catch (err) {
    console.error("GET /api/media/capabilities error:", err);
    res.status(500).json({ error: err.message || "Failed to load media permissions" });
  }
});

function queryParam(value) {
  if (value == null || value === "") return "";
  return Array.isArray(value) ? String(value[0] ?? "") : String(value);
}

function mediaFileUrl(row) {
  if (row.file_url) return row.file_url;
  const localPath = row.file_path;
  if (typeof localPath !== "string" || !localPath.trim()) return null;
  return `/uploads/${path.basename(localPath)}`;
}

app.get("/api/media", authMiddleware, requirePage("media"), async (req, res) => {
  try {
    const db = getDb();
    const search = queryParam(req.query.search);
    const type = queryParam(req.query.type);
    const series = queryParam(req.query.series);
    const member = req.user.member;
    let sql = "SELECT * FROM media_items WHERE 1=1";
    const params = [];
    const deptAbilities = req.user.departmentAbilities || [];
    if (!canViewAllMedia(member.role) && !(await canUploadMedia(db, member, deptAbilities))) {
      sql += " AND status = 'approved'";
    }
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
    sql += ` ORDER BY date DESC`;
    const rows = await db.prepare(sql).all(...params);
    res.json(
      rows.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        speaker: m.speaker,
        series: m.series,
        topic: m.topic,
        date: m.date,
        fileUrl: mediaFileUrl(m),
        shareTarget: m.share_target,
        shareTargetId: m.share_target_id,
        status: m.status || "approved",
        uploadedBy: m.uploaded_by,
      }))
    );
  } catch (err) {
    console.error("GET /api/media error:", err);
    res.status(500).json({ error: err.message || "Failed to load media library" });
  }
});

app.post("/api/media", authMiddleware, requirePage("media"), upload.single("file"), async (req, res) => {
  try {
    if (!(await canUploadMedia(getDb(), req.user.member, req.user.departmentAbilities))) {
      return res.status(403).json({ error: "Upload not permitted" });
    }
    const db = getDb();
    const { title, type, speaker, series, topic, date, shareTarget, shareTargetId, fileUrl: bodyFileUrl, videoUrl } =
      req.body || {};
    const titleText = String(title || "").trim();
    const mediaType = String(type || "").trim();
    if (!titleText) return res.status(400).json({ error: "Title is required" });
    if (!["audio", "video", "notes", "slides"].includes(mediaType)) {
      return res.status(400).json({ error: "Invalid media type" });
    }

    const id = uid();
    const filePath = req.file?.path || null;
    let fileUrl = null;
    if (req.file) {
      fileUrl = await persistUploadedFile(
        req.file.path,
        "media",
        req.file.originalname,
        req.file.mimetype
      );
    } else {
      const external = String(bodyFileUrl || videoUrl || "").trim();
      if (external) {
        if (!isGoogleDriveUrl(external)) {
          return res.status(400).json({ error: "Video link must be a Google Drive share URL" });
        }
        const normalized = normalizeGoogleDriveUrl(external);
        if (!normalized) {
          return res.status(400).json({ error: "Could not parse Google Drive link" });
        }
        fileUrl = normalized;
      }
    }
    if (mediaType === "video" && !fileUrl) {
      return res.status(400).json({ error: "Upload a video file or provide a Google Drive link" });
    }
    if (mediaType !== "video" && !fileUrl) {
      return res.status(400).json({ error: "Choose a file to upload" });
    }

    const autoApprove = canApproveMedia(req.user.member.role);
    const status = autoApprove ? "approved" : "pending";
    const approvedBy = autoApprove ? req.user.member.id : null;
    const approvedAt = autoApprove ? new Date().toISOString() : null;
    const emptyToNull = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());

    await db.prepare(
      `INSERT INTO media_items (id, title, type, speaker, series, topic, date, file_path, file_url, share_target, share_target_id, uploaded_by, status, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      titleText,
      mediaType,
      emptyToNull(speaker),
      emptyToNull(series),
      emptyToNull(topic),
      emptyToNull(date) || new Date().toISOString().slice(0, 10),
      filePath,
      fileUrl,
      emptyToNull(shareTarget),
      emptyToNull(shareTargetId),
      req.user.member.id,
      status,
      approvedBy,
      approvedAt
    );
    try {
      await logActivity(db, `Media uploaded: ${titleText}`, req.user.member.id);
    } catch (logErr) {
      console.warn("Media upload activity log skipped:", logErr.message);
    }
    res.status(201).json({ id, title: titleText, status });
  } catch (err) {
    console.error("POST /api/media error:", err);
    res.status(500).json({ error: err.message || "Media upload failed" });
  }
});

app.patch("/api/media/:id", authMiddleware, requirePage("media"), upload.single("file"), async (req, res) => {
  try {
    const db = getDb();
    const row = await db.prepare("SELECT * FROM media_items WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Media not found" });

    const member = req.user.member;
    const body = req.body || {};
    const { status } = body;
    const emptyToNull = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());

    if (status !== undefined) {
      if (!canApproveMedia(member.role)) {
        return res.status(403).json({ error: "Only pastors can approve media" });
      }
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status must be approved or rejected" });
      }
      await db.prepare(
        "UPDATE media_items SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?"
      ).run(status, member.id, req.params.id);
      await logActivity(db, `Media ${status}: ${req.params.id}`, member.id);
      const onlyStatus =
        Object.keys(body).length === 1 &&
        !req.file;
      if (onlyStatus) {
        return res.json({ ok: true, status });
      }
    }

    const metaTouched =
      ["title", "type", "speaker", "series", "topic", "date", "shareTarget", "shareTargetId", "fileUrl", "videoUrl"].some(
        (k) => body[k] !== undefined
      ) || !!req.file;

    if (!metaTouched) {
      if (status === undefined) {
        return res.status(400).json({ error: "No changes provided" });
      }
      return res.json({ ok: true, status });
    }

    if (!canEditMediaItem(member, row)) {
      return res.status(403).json({ error: "You cannot edit this media item" });
    }

    const titleText = body.title !== undefined ? emptyToNull(body.title) : row.title;
    if (!titleText) return res.status(400).json({ error: "Title is required" });

    const mediaType = body.type !== undefined ? emptyToNull(body.type) : row.type;
    if (!["audio", "video", "notes", "slides"].includes(mediaType)) {
      return res.status(400).json({ error: "Invalid media type" });
    }

    let fileUrl = row.file_url;
    let filePath = row.file_path;
    if (req.file) {
      fileUrl = await persistUploadedFile(
        req.file.path,
        "media",
        req.file.originalname,
        req.file.mimetype
      );
      filePath = req.file.path;
    } else if (body.fileUrl !== undefined || body.videoUrl !== undefined) {
      const external = String(body.fileUrl ?? body.videoUrl ?? "").trim();
      if (external) {
        if (!isGoogleDriveUrl(external)) {
          return res.status(400).json({ error: "Video link must be a Google Drive share URL" });
        }
        const normalized = normalizeGoogleDriveUrl(external);
        if (!normalized) {
          return res.status(400).json({ error: "Could not parse Google Drive link" });
        }
        fileUrl = normalized;
        filePath = null;
      } else if (mediaType === "video") {
        return res.status(400).json({ error: "Video requires a file or Google Drive link" });
      }
    }

    const speaker = body.speaker !== undefined ? emptyToNull(body.speaker) : row.speaker;
    const series = body.series !== undefined ? emptyToNull(body.series) : row.series;
    const topic = body.topic !== undefined ? emptyToNull(body.topic) : row.topic;
    const date =
      body.date !== undefined ? emptyToNull(body.date) || row.date : row.date;
    const shareTarget =
      body.shareTarget !== undefined ? emptyToNull(body.shareTarget) : row.share_target;
    const shareTargetId =
      body.shareTargetId !== undefined ? emptyToNull(body.shareTargetId) : row.share_target_id;

    if (mediaType === "video" && !fileUrl) {
      return res.status(400).json({ error: "Video requires a file or Google Drive link" });
    }
    if (mediaType !== "video" && !fileUrl && !req.file) {
      return res.status(400).json({ error: "Media file is missing" });
    }

    await db.prepare(
      `UPDATE media_items SET title = ?, type = ?, speaker = ?, series = ?, topic = ?, date = ?,
       file_path = ?, file_url = ?, share_target = ?, share_target_id = ? WHERE id = ?`
    ).run(
      titleText,
      mediaType,
      speaker,
      series,
      topic,
      date,
      filePath,
      fileUrl,
      shareTarget,
      shareTargetId,
      req.params.id
    );
    await logActivity(db, `Media updated: ${titleText}`, member.id);
    res.json({
      ok: true,
      id: req.params.id,
      title: titleText,
      type: mediaType,
      speaker,
      series,
      topic,
      date,
      fileUrl: mediaFileUrl({ file_url: fileUrl, file_path: filePath }),
      shareTarget,
      shareTargetId,
      status: row.status,
    });
  } catch (err) {
    console.error("PATCH /api/media/:id error:", err);
    res.status(500).json({ error: err.message || "Failed to update media" });
  }
});

// ─── Reports (analytics + cell reports) ────────────────────────────────────────

app.get("/api/reports/analytics", authMiddleware, requirePage("reports"), async (req, res) => {
  const db = getDb();
  try {
    const growth = await db
      .prepare(
        `SELECT strftime('%Y-%m', joined_at) as month, COUNT(*) as members
         FROM members WHERE active = 1 GROUP BY month ORDER BY month`
      )
      .all();
    const dept = await db
      .prepare(
        `SELECT d.name, COUNT(md.member_id) + CASE WHEN d.head_id IS NOT NULL THEN 1 ELSE 0 END as value
         FROM departments d
         LEFT JOIN member_departments md ON md.department_id = d.id
         GROUP BY d.id, d.name, d.head_id`
      )
      .all();
    const trends = await db
      .prepare(
        `SELECT ar.date, COALESCE(c.name, 'Sunday Service') as cell_name,
         SUM(CASE WHEN am.status = 'present' THEN 1 ELSE 0 END) as present_count
         FROM attendance_records ar
         JOIN attendance_members am ON am.record_id = ar.id
         LEFT JOIN cells c ON c.id = ar.cell_id
         WHERE ar.date >= date('now', '-365 days')
         GROUP BY ar.date, ar.cell_id, c.name, ar.type
         ORDER BY ar.date`
      )
      .all();
    res.json({
      memberGrowth: growth.map((g) => ({ month: g.month, members: Number(g.members) })),
      departmentParticipation: dept.map((d) => ({ name: d.name, value: Number(d.value) })),
      attendanceTrends: trends.map((t) => ({
        date: t.date,
        cell_name: t.cell_name,
        present_count: Number(t.present_count),
      })),
    });
  } catch (err) {
    console.error("Reports analytics error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/submissions", authMiddleware, requirePage("report-submissions"), async (req, res) => {
  const db = getDb();
  const actor = req.user.member;
  let rows;
  if (isCellScopedRole(actor.role) && actor.cellId) {
    rows = await db.prepare("SELECT * FROM cell_reports WHERE cell_id = ? ORDER BY created_at DESC").all(actor.cellId);
  } else if (actor.role === "Fellowship Leader" && actor.fellowshipId) {
    rows = await db
      .prepare(
        `SELECT * FROM cell_reports
         WHERE fellowship_id = ? OR cell_id IN (SELECT id FROM cells WHERE fellowship_id = ?)
         ORDER BY created_at DESC`
      )
      .all(actor.fellowshipId, actor.fellowshipId);
  } else {
    rows = await db.prepare("SELECT * FROM cell_reports ORDER BY created_at DESC").all();
  }
  res.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      submitterId: r.submitter_id,
      cellId: r.cell_id,
      fellowshipId: r.fellowship_id,
      departmentId: r.department_id,
      period: r.period,
      attendanceCount: r.attendance_count,
      newVisitors: r.new_visitors,
      description:
        r.description ||
        [r.prayer_points, r.challenges].filter((p) => p?.trim()).join("\n\n") ||
        "",
      status: r.status,
      pastorComment: r.pastor_comment,
      dueDate: r.due_date,
      submittedAt: r.submitted_at,
    }))
  );
});

app.post("/api/reports/submissions", authMiddleware, requirePage("report-submissions"), async (req, res) => {
  const db = getDb();
  const {
    type,
    cellId,
    fellowshipId,
    departmentId,
    period,
    attendanceCount,
    newVisitors,
    description,
    dueDate,
  } = req.body;
  const role = req.user.member.role;
  if (type === "department") {
    if (!departmentId) {
      return res.status(400).json({ error: "Department is required for department reports" });
    }
    if (!userHasAbility(req.user, "submit_department_report")) {
      return res.status(403).json({ error: "Your departments do not allow submitting department reports" });
    }
    const inDept = await db
      .prepare("SELECT 1 FROM member_departments WHERE member_id = ? AND department_id = ?")
      .get(req.user.member.id, departmentId);
    if (!inDept) {
      return res.status(403).json({ error: "You can only submit reports for a department you belong to" });
    }
  } else if (type === "fellowship" && role !== "Fellowship Leader") {
    return res.status(403).json({ error: "Fellowship report requires Fellowship Leader role" });
  } else if (type === "cell" && !["Cell Leader", "Sub-cell Leader"].includes(role)) {
    return res.status(403).json({ error: "Cell report requires Cell Leader or Sub-cell Leader" });
  }
  let resolvedCellId = cellId || null;
  if (type === "cell" && isCellScopedRole(role)) {
    if (cellId && cellId !== req.user.member.cellId) {
      return res.status(403).json({ error: "You can only submit reports for your own cell" });
    }
    resolvedCellId = req.user.member.cellId;
  }
  const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const id = uid();
  await db.prepare(
    `INSERT INTO cell_reports (id, type, submitter_id, cell_id, fellowship_id, department_id, period, attendance_count, new_visitors, description, status, submitted_at, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', datetime('now'), ?)`
  ).run(
    id,
    type,
    req.user.member.id,
    resolvedCellId,
    fellowshipId || null,
    departmentId || null,
    period,
    attendanceCount,
    newVisitors,
    description || "",
    dueDate || defaultDue
  );
  await logActivity(db, `${type} report submitted`, req.user.member.id);
  await logAudit(req.user.member.id, "report_submit", "cell_report", id, { type, period });
  res.status(201).json({ id, status: "submitted", dueDate: dueDate || defaultDue });
});

app.patch("/api/reports/submissions/:id", authMiddleware, requirePage("report-submissions"), async (req, res) => {
  const db = getDb();
  const { status, pastorComment } = req.body;
  if (status === "approved" && !["Senior Pastor", "Associate Pastor"].includes(req.user.member.role)) {
    return res.status(403).json({ error: "Only pastors can approve" });
  }
  await db.prepare("UPDATE cell_reports SET status = ?, pastor_comment = ? WHERE id = ?").run(
    status,
    pastorComment || null,
    req.params.id
  );
  res.json({ ok: true });
});

// ─── Settings ──────────────────────────────────────────────────────────────────

app.get("/api/settings", authMiddleware, requirePage("settings"), async (req, res) => {
  const { isEmailConfigured } = await import("./email.js");
  const s = await getDb().prepare("SELECT * FROM church_settings WHERE id = 1").get();
  const branding = brandingFromSettings(s, req);
  res.json({
    name: branding.name,
    tagline: branding.tagline,
    address: s.address,
    phone: s.phone,
    email: s.email,
    logoUrl: branding.logoUrl,
    emailConfigured: isEmailConfigured(),
    database: "supabase",
  });
});

app.put("/api/settings", authMiddleware, async (req, res) => {
  if (!canManageSettings(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const { name, tagline, address, phone, email, logoUrl } = req.body;
  const storedLogoUrl = normalizeLogoUrlForStorage(logoUrl);
  await getDb()
    .prepare(
      `UPDATE church_settings SET name=?, tagline=?, address=?, phone=?, email=?, logo_url=? WHERE id=1`
    )
    .run(name, tagline, address, phone, email, storedLogoUrl);
  const row = await getDb().prepare("SELECT * FROM church_settings WHERE id = 1").get();
  res.json({ ok: true, branding: brandingFromSettings(row, req) });
});

app.get("/api/users", authMiddleware, async (req, res) => {
  if (!canManageSettings(req.user.member.role)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const users = await db
    .prepare(
      `SELECT u.id, u.email, u.access_level, u.member_id, m.name, m.role FROM users u JOIN members m ON m.id = u.member_id`
    )
    .all();
  res.json(
    users.map((u) => ({
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
  const db = getDb();
  const { email, password, memberId, accessLevel } = req.body;
  if (!email || !password || !memberId) return res.status(400).json({ error: "Email, password, and member required" });

  const member = await db.prepare("SELECT name, role FROM members WHERE id = ?").get(memberId);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const id = uid();
  let authUserId = null;
  let passwordHash = null;
  if (useSupabaseAuth()) {
    const auth = await createSupabaseAuthUser({
      email: email.toLowerCase(),
      password,
      memberId,
      name: member.name,
      role: member.role,
    });
    authUserId = auth.authUserId;
  } else {
    const bcrypt = await import("bcryptjs");
    passwordHash = await bcrypt.hash(password, 10);
  }

  await db
    .prepare(
      "INSERT INTO users (id, email, password_hash, auth_user_id, member_id, access_level) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, email.toLowerCase(), passwordHash, authUserId, memberId, accessLevel || "standard");
  res.status(201).json({ id, email, memberId, accessLevel: accessLevel || "standard" });
});

// ─── Activities & Notifications ────────────────────────────────────────────────

app.get("/api/activities", authMiddleware, async (req, res) => {
  const db = getDb();
  const rows = await db.prepare("SELECT * FROM activities ORDER BY created_at DESC LIMIT 30").all();
  res.json(rows.map((a) => ({ id: a.id, text: a.text, time: a.created_at })));
});

app.get("/api/notifications", authMiddleware, async (req, res) => {
  const db = getDb();
  const rows = await db
    .prepare("SELECT * FROM notifications WHERE member_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(req.user.member.id);
  res.json(
    rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        read: !!n.read,
        createdAt: n.created_at,
      }))
  );
});

app.patch("/api/notifications/read-all", authMiddleware, async (req, res) => {
  await getDb()
    .prepare("UPDATE notifications SET read = 1 WHERE member_id = ?")
    .run(req.user.member.id);
  res.json({ ok: true });
});

app.get("/api/dashboard/overview", authMiddleware, requirePage("dashboard"), async (req, res) => {
  try {
  const db = getDb();
  const role = req.user.member.role;
  const pastoral = ["Senior Pastor", "Associate Pastor"].includes(role);
  const showBirthdays = canViewBirthdays(role);
  const showFinances = canAccessFinances(role) || role === "Associate Pastor";

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  async function serviceAttendance(limit = 8) {
    const rows = await db
      .prepare(
        `SELECT ar.id, ar.date,
          SUM(CASE WHEN am.status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN am.status = 'absent' THEN 1 ELSE 0 END) as absent
         FROM attendance_records ar
         JOIN attendance_members am ON am.record_id = ar.id
         WHERE ar.type = 'service'
         GROUP BY ar.id, ar.date
         ORDER BY ar.date DESC
         LIMIT ?`
      )
      .all(limit);
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      present: Number(r.present ?? 0),
      absent: Number(r.absent ?? 0),
      total: Number(r.present ?? 0) + Number(r.absent ?? 0),
      rate: Number(r.present ?? 0) + Number(r.absent ?? 0)
        ? Math.round((Number(r.present ?? 0) / (Number(r.present ?? 0) + Number(r.absent ?? 0))) * 100)
        : 0,
    }));
  }

  async function getServiceNewcomers(recordId) {
    if (!recordId) return { members: [], guests: [], total: 0 };
    const [memberRows, guestRows] = await Promise.all([
      db
        .prepare(
          `SELECT m.id, m.name, m.role, m.phone, m.joined_at
           FROM attendance_members am
           JOIN members m ON m.id = am.member_id
           WHERE am.record_id = ? AND am.status = 'present' AND am.is_newcomer = 1`
        )
        .all(recordId),
      db.prepare("SELECT id, name, contact FROM attendance_guests WHERE record_id = ? ORDER BY name").all(recordId),
    ]);
    const members = memberRows.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      phone: m.phone,
      joinedAt: m.joined_at,
    }));
    const guests = guestRows.map((g) => ({ id: g.id, name: g.name, contact: g.contact }));
    return { members, guests, total: members.length + guests.length };
  }

  const [
    m,
    c,
    f,
    d,
    newMembers,
    pendingPrayers,
    prayedPrayers,
    answeredPrayers,
    pendingTasks,
    overdueTasks,
    pendingReports,
    activeFollowUps,
    serviceHistory,
    cellRows,
    followUpStages,
    tasksDue,
    reportsPending,
    announcements,
    nextEventRow,
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM members WHERE active = 1").get(),
    db.prepare("SELECT COUNT(*) as c FROM cells").get(),
    db.prepare("SELECT COUNT(*) as c FROM fellowships").get(),
    db.prepare("SELECT COUNT(*) as c FROM departments").get(),
    db.prepare("SELECT COUNT(*) as c FROM members WHERE active = 1 AND joined_at LIKE ?").get(`${monthPrefix}%`),
    db.prepare("SELECT COUNT(*) as c FROM prayer_requests WHERE status = 'pending'").get(),
    db.prepare("SELECT COUNT(*) as c FROM prayer_requests WHERE status = 'prayed'").get(),
    db.prepare("SELECT COUNT(*) as c FROM prayer_requests WHERE status = 'answered'").get(),
    db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status != 'completed'").get(),
    db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status != 'completed' AND due_date < date('now')").get(),
    db.prepare("SELECT COUNT(*) as c FROM cell_reports WHERE status = 'submitted'").get(),
    db.prepare("SELECT COUNT(*) as c FROM follow_ups").get(),
    serviceAttendance(8),
    db
      .prepare(
        `SELECT ar.date, c.name as cell_name, fel.name as fellowship_name,
          SUM(CASE WHEN am.status = 'present' THEN 1 ELSE 0 END) as present
         FROM attendance_records ar
         JOIN attendance_members am ON am.record_id = ar.id
         LEFT JOIN cells c ON c.id = ar.cell_id
         LEFT JOIN fellowships fel ON fel.id = ar.fellowship_id
         WHERE ar.type = 'cell' AND ar.date >= date('now', '-30 days')
         GROUP BY ar.id, ar.date, c.name, fel.name
         ORDER BY ar.date DESC`
      )
      .all(),
    db.prepare("SELECT stage, COUNT(*) as c FROM follow_ups GROUP BY stage").all(),
    pastoral
      ? db.prepare("SELECT id, title, due_date, priority, status FROM tasks WHERE status != 'completed' ORDER BY due_date LIMIT 5").all()
      : Promise.resolve([]),
    pastoral
      ? db
          .prepare(
            `SELECT cr.id, cr.type, cr.period, cr.status, cr.attendance_count, cr.new_visitors, m.name as submitter_name
             FROM cell_reports cr
             JOIN members m ON m.id = cr.submitter_id
             WHERE cr.status = 'submitted'
             ORDER BY cr.submitted_at DESC
             LIMIT 5`
          )
          .all()
      : Promise.resolve([]),
    db
      .prepare("SELECT * FROM announcements WHERE expires_at >= date('now') ORDER BY pinned DESC, created_at DESC")
      .all(),
    db.prepare("SELECT * FROM events WHERE date >= date('now') ORDER BY date LIMIT 1").get(),
  ]);

  const lastService = serviceHistory[0] || null;
  const previousService = serviceHistory[1] || null;
  const lastServiceNewcomers = await getServiceNewcomers(lastService?.id);
  const attendanceDelta =
    lastService && previousService ? lastService.present - previousService.present : null;

  let lastOffering = null;
  let monthFinances = null;
  if (showFinances && lastService) {
    const offeringRows = await db
      .prepare(
        `SELECT category, SUM(amount) as total FROM finances
         WHERE date = ? AND type = 'income' AND category IN ('Offering', 'Tithe', 'Seed')
         GROUP BY category`
      )
      .all(lastService.date);
    const byCat = Object.fromEntries(offeringRows.map((r) => [r.category, Number(r.total ?? 0)]));
    const tithe = byCat.Tithe || 0;
    const offering = byCat.Offering || 0;
    const seed = byCat.Seed || 0;
    lastOffering = { date: lastService.date, tithe, offering, seed, total: tithe + offering + seed };

    const monthRows = await db
      .prepare(`SELECT type, category, SUM(amount) as total FROM finances WHERE date LIKE ? GROUP BY type, category`)
      .all(`${monthPrefix}%`);
    let income = 0;
    let expense = 0;
    let offeringTotal = 0;
    let titheTotal = 0;
    for (const r of monthRows) {
      const amt = Number(r.total ?? 0);
      if (r.type === "income") {
        income += amt;
        if (r.category === "Offering") offeringTotal += amt;
        if (r.category === "Tithe") titheTotal += amt;
      } else expense += amt;
    }
    monthFinances = { income, expense, net: income - expense, offeringTotal, titheTotal };
  }

  const cellPresent = cellRows.map((r) => Number(r.present ?? 0));
  const avgCellAttendance = cellPresent.length
    ? Math.round(cellPresent.reduce((a, b) => a + b, 0) / cellPresent.length)
    : 0;
  const topCellRow = cellRows.reduce(
    (best, r) => (Number(r.present ?? 0) > Number(best?.present ?? 0) ? r : best),
    cellRows[0] || null
  );

  let nextEvent = null;
  if (nextEventRow) {
    const rsvps = await db.prepare("SELECT COUNT(*) as c FROM event_rsvps WHERE event_id = ?").get(nextEventRow.id);
    nextEvent = {
      id: nextEventRow.id,
      title: nextEventRow.title,
      date: nextEventRow.date,
      time: nextEventRow.time,
      location: nextEventRow.location,
      rsvpCount: Number(rsvps?.c ?? 0),
    };
  }

  const fellowshipTotals = {};
  for (const r of cellRows) {
    const name = r.fellowship_name || "Unknown";
    fellowshipTotals[name] = (fellowshipTotals[name] || 0) + Number(r.present ?? 0);
  }
  const fellowshipCellAttendance = Object.entries(fellowshipTotals)
    .map(([name, present]) => ({ name, present }))
    .sort((a, b) => b.present - a.present);

  let birthdaysThisMonth = null;
  if (showBirthdays) {
    try {
      birthdaysThisMonth = await getBirthdaysForMonth(db, now.getFullYear(), now.getMonth() + 1);
    } catch (err) {
      console.error("[dashboard/overview] birthdays:", err);
    }
  }

  const member = req.user.member;
  const deptAbilities = req.user.departmentAbilities || [];
  const visibleAnnouncements = (
    await filterAnnouncementsForMember(db, member, deptAbilities, announcements)
  )
    .slice(0, 5)
    .map(announcementToJson);

  res.json({
    pastoral,
    showFinances,
    counts: {
      members: Number(m?.c ?? 0),
      cells: Number(c?.c ?? 0),
      fellowships: Number(f?.c ?? 0),
      departments: Number(d?.c ?? 0),
      newMembersThisMonth: Number(newMembers?.c ?? 0),
      pendingPrayers: Number(pendingPrayers?.c ?? 0),
      pendingTasks: Number(pendingTasks?.c ?? 0),
      overdueTasks: Number(overdueTasks?.c ?? 0),
      pendingReports: Number(pendingReports?.c ?? 0),
      activeFollowUps: Number(activeFollowUps?.c ?? 0),
    },
    lastService,
    previousService,
    lastServiceNewcomers,
    attendanceDelta,
    lastOffering,
    monthFinances,
    cellHealth: {
      avgAttendance: avgCellAttendance,
      meetingsThisMonth: cellRows.length,
      topCell: topCellRow
        ? { name: topCellRow.cell_name, present: Number(topCellRow.present ?? 0), date: topCellRow.date }
        : null,
    },
    serviceTrend: [...serviceHistory].reverse(),
    fellowshipCellAttendance,
    prayersSummary: {
      pending: Number(pendingPrayers?.c ?? 0),
      prayed: Number(prayedPrayers?.c ?? 0),
      answered: Number(answeredPrayers?.c ?? 0),
    },
    tasksDue: tasksDue.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.due_date,
      priority: t.priority,
      status: t.status,
    })),
    pendingReports: reportsPending.map((r) => ({
      id: r.id,
      type: r.type,
      period: r.period,
      submitterName: r.submitter_name,
      attendanceCount: r.attendance_count,
      newVisitors: r.new_visitors,
      status: r.status,
    })),
    followUpsByStage: followUpStages.map((s) => ({ stage: s.stage, count: Number(s.c ?? 0) })),
    nextEvent,
    announcements: visibleAnnouncements,
    birthdaysThisMonth,
  });
  } catch (err) {
    console.error("[dashboard/overview]", err);
    res.status(500).json({ error: "Failed to load dashboard overview" });
  }
});

app.get("/api/dashboard/birthdays", authMiddleware, requirePage("dashboard"), async (req, res) => {
  if (!canViewBirthdays(req.user.member.role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || new Date().getMonth() + 1;
  const data = await getBirthdaysForMonth(getDb(), year, month);
  if (!data) return res.status(400).json({ error: "Invalid month" });
  res.json(data);
});

app.get("/api/dashboard/stats", authMiddleware, requirePage("dashboard"), async (req, res) => {
  const db = getDb();
  const actor = req.user.member;
  const scope = scopeMemberFilter({
    id: actor.id,
    role: actor.role,
    fellowship_id: actor.fellowshipId,
    cell_id: actor.cellId,
  });

  if (isCellScopedRole(actor.role)) {
    const m = await db.prepare(`SELECT COUNT(*) as c FROM members m WHERE m.active = 1 AND ${scope.sql}`).get(...scope.params);
    const lastCell = await db
      .prepare(
        `SELECT ar.date FROM attendance_records ar
         WHERE ar.type = 'cell' AND ar.cell_id = ? ORDER BY ar.date DESC LIMIT 1`
      )
      .get(actor.cellId);
    return res.json({
      members: Number(m?.c ?? 0),
      cells: 1,
      fellowships: 1,
      departments: 0,
      lastCellMeeting: lastCell?.date || null,
      scoped: "cell",
    });
  }

  const [m, c, f, d] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM members WHERE active = 1").get(),
    db.prepare("SELECT COUNT(*) as c FROM cells").get(),
    db.prepare("SELECT COUNT(*) as c FROM fellowships").get(),
    db.prepare("SELECT COUNT(*) as c FROM departments").get(),
  ]);
  res.json({
    members: Number(m?.c ?? 0),
    cells: Number(c?.c ?? 0),
    fellowships: Number(f?.c ?? 0),
    departments: Number(d?.c ?? 0),
  });
});

registerCompletionRoutes(app, { upload, uid, getMemberDepartments, loadMember, UPLOAD_DIR });

// ─── Production static ─────────────────────────────────────────────────────────

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Christ Embassy API running on http://localhost:${PORT}`);
    void bootstrapDatabase();
  }).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other API process (or run: npx kill-port ${PORT}) and restart.`
      );
    } else {
      console.error("API server failed to start:", err.message);
    }
    process.exit(1);
  });
}
