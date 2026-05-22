import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, usePostgres } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "church.db");

const DEPARTMENTS = [
  "Praise & Worship",
  "Ushering",
  "Children's Church (Loveworld Kids)",
  "Youth Ministry (CEYC)",
  "Prayer & Intercession",
  "Media & Technical",
  "Evangelism",
  "Protocol / Admin",
];

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "ChangeMe123!";

function uid() {
  return crypto.randomUUID();
}

async function clearAll(db) {
  const tables = [
    "notifications", "activities", "cell_reports", "media_items", "task_assignees", "tasks",
    "announcements", "follow_up_notes", "follow_ups", "prayer_requests", "finances",
    "message_recipients", "messages", "event_rsvps", "events", "attendance_members",
    "attendance_records", "member_departments", "departments", "cells", "fellowships", "users",
    "members", "church_settings", "password_reset_tokens", "audit_log",
  ];
  if (usePostgres) {
    for (const t of tables) {
      try {
        await db.exec(`DELETE FROM ${t}`);
      } catch {
        /* table may be empty */
      }
    }
    return;
  }
  await db.exec(`
    DELETE FROM notifications; DELETE FROM activities; DELETE FROM cell_reports;
    DELETE FROM media_items; DELETE FROM task_assignees; DELETE FROM tasks;
    DELETE FROM announcements; DELETE FROM follow_up_notes; DELETE FROM follow_ups;
    DELETE FROM prayer_requests; DELETE FROM finances; DELETE FROM message_recipients;
    DELETE FROM messages; DELETE FROM event_rsvps; DELETE FROM events;
    DELETE FROM attendance_members; DELETE FROM attendance_records;
    DELETE FROM member_departments; DELETE FROM departments;
    DELETE FROM cells; DELETE FROM fellowships; DELETE FROM users; DELETE FROM members;
    DELETE FROM password_reset_tokens; DELETE FROM audit_log; DELETE FROM church_settings;
  `);
}

export async function seedDatabase(reset = false) {
  if (reset && !usePostgres && fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("Removed SQLite database file.");
    const { resetDbConnection } = await import("./db.js");
    const { resetSqliteConnection } = await import("./store.js");
    resetDbConnection();
    resetSqliteConnection();
  }
  if (!usePostgres) {
    const { initSchema } = await import("./db.js");
    initSchema();
  }

  const db = getDb();
  const countRow = await db.prepare("SELECT COUNT(*) as c FROM members").get();
  const count = Number(countRow?.c ?? 0);
  if (count > 0 && !reset) {
    console.log("Database already seeded.");
    return;
  }

  if (reset) await clearAll(db);

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const settingsSql = usePostgres
    ? `INSERT INTO church_settings (id, name, tagline, address, phone, email, logo_url)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, tagline=EXCLUDED.tagline, address=EXCLUDED.address, phone=EXCLUDED.phone, email=EXCLUDED.email`
    : `INSERT OR REPLACE INTO church_settings (id, name, tagline, address, phone, email, logo_url) VALUES (1, ?, ?, ?, ?, ?, ?)`;

  await db.prepare(settingsSql).run(
    "Christ Embassy Lagos Zone",
    "Raising a people of excellence",
    "12 Faith Avenue, Lagos, Nigeria",
    "+234 1 234 5678",
    "info@celcm.org",
    ""
  );

  const fellowships = [
    { id: "f1", name: "Grace Fellowship" },
    { id: "f2", name: "Victory Fellowship" },
  ];
  const insF = db.prepare("INSERT INTO fellowships (id, name, leader_id) VALUES (?, ?, ?)");
  for (const f of fellowships) await insF.run(f.id, f.name, null);

  const cells = [
    { id: "c1", name: "Grace Cell A", fellowshipId: "f1" },
    { id: "c2", name: "Grace Cell B", fellowshipId: "f1" },
    { id: "c3", name: "Victory Cell A", fellowshipId: "f2" },
    { id: "c4", name: "Faith Cell", fellowshipId: "f1" },
  ];
  const insC = db.prepare(
    "INSERT INTO cells (id, name, fellowship_id, leader_id, sub_leader_id) VALUES (?, ?, ?, ?, ?)"
  );
  for (const c of cells) await insC.run(c.id, c.name, c.fellowshipId, null, null);

  const insD = db.prepare("INSERT INTO departments (id, name, head_id) VALUES (?, ?, ?)");
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    await insD.run(`d${i + 1}`, DEPARTMENTS[i], null);
  }

  const coreMembers = [
    { id: "m1", name: "Rev. David Okonkwo", email: "pastor@celcm.org", role: "Senior Pastor", cell: null, fel: null },
    { id: "m2", name: "Pastor Grace Adeyemi", email: "grace@celcm.org", role: "Associate Pastor", cell: null, fel: null },
    { id: "m3", name: "Bro. Samuel Eze", email: "samuel@celcm.org", role: "Fellowship Leader", cell: "c1", fel: "f1" },
    { id: "m4", name: "Sis. Chioma Nwosu", email: "chioma@celcm.org", role: "Cell Leader", cell: "c1", fel: "f1" },
    { id: "m5", name: "Bro. Tunde Bakare", email: "tunde@celcm.org", role: "Sub-cell Leader", cell: "c1", fel: "f1" },
    { id: "m6", name: "Sis. Amaka Okafor", email: "amaka@celcm.org", role: "Cell Leader", cell: "c2", fel: "f1" },
    { id: "m7", name: "Mrs. Funke Admin", email: "admin@celcm.org", role: "Admin", cell: null, fel: null },
    { id: "m8", name: "Bro. James Musa", email: "james@celcm.org", role: "Fellowship Leader", cell: "c3", fel: "f2" },
    { id: "m9", name: "Sis. Blessing Udo", email: "blessing@celcm.org", role: "Cell Leader", cell: "c3", fel: "f2" },
    { id: "m10", name: "Bro. Emeka Ibe", email: "emeka@celcm.org", role: "Cell Leader", cell: "c4", fel: "f1" },
  ];

  const insM = db.prepare(
    `INSERT INTO members (id, name, email, phone, role, cell_id, fellowship_id, active, joined_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ${usePostgres ? "TRUE" : "1"}, ?)`
  );
  const insU = db.prepare(
    `INSERT INTO users (id, email, password_hash, member_id, access_level) VALUES (?, ?, ?, ?, ?)`
  );
  const insMD = db.prepare(
    "INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)"
  );

  for (const m of coreMembers) {
    await insM.run(m.id, m.name, m.email, "+234 801 000 0000", m.role, m.cell, m.fel, "2020-01-15");
    await insU.run(uid(), m.email, hash, m.id, m.role === "Admin" ? "full" : m.role.includes("Pastor") ? "full" : "standard");
  }

  await insMD.run("m2", "d1");
  await insMD.run("m3", "d8");
  await insMD.run("m4", "d1");
  await insMD.run("m4", "d5");
  await insMD.run("m7", "d8");

  await db.prepare("UPDATE fellowships SET leader_id = ? WHERE id = ?").run("m3", "f1");
  await db.prepare("UPDATE fellowships SET leader_id = ? WHERE id = ?").run("m8", "f2");
  await db.prepare("UPDATE cells SET leader_id = ?, sub_leader_id = ? WHERE id = ?").run("m4", "m5", "c1");
  await db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run("m6", "c2");
  await db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run("m9", "c3");
  await db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run("m10", "c4");
  await db.prepare("UPDATE departments SET head_id = ? WHERE id = ?").run("m2", "d1");

  for (let i = 0; i < 15; i++) {
    const id = `m${11 + i}`;
    const cell = cells[i % 4].id;
    const fel = i % 4 < 2 ? "f1" : "f2";
    const role = i % 3 === 0 ? "Cell Member" : "Church Member";
    await insM.run(id, `Member ${i + 1} Believer`, `member${i + 1}@celcm.org`, `+234 802 000 ${1000 + i}`, role, cell, fel, "2022-06-10");
    await insU.run(uid(), `member${i + 1}@celcm.org`, hash, id, "standard");
    await insMD.run(id, `d${(i % 8) + 1}`);
  }

  const { logActivity } = await import("./db.js");
  await logActivity(null, "System initialized with seed data", "m1");
  console.log(`Seeded ${usePostgres ? "PostgreSQL" : "SQLite"} database. Default password: ${DEFAULT_PASSWORD}`);
}

if (process.argv[1]?.endsWith("seed.js")) {
  const reset = process.argv.includes("--reset");
  import("./store.js").then(({ initDatabase }) =>
    initDatabase().then(() => seedDatabase(reset)).catch(console.error)
  );
}
