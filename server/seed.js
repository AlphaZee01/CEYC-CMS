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
  await ensureDashboardSamples(db);
  console.log(`Seeded ${usePostgres ? "PostgreSQL" : "SQLite"} database. Default password: ${DEFAULT_PASSWORD}`);
}

function lastSunday(offsetWeeks = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetWeeks * 7);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Sample attendance, finances, and pastoral metrics when the database has none */
export async function ensureDashboardSamples(db) {
  const row = await db.prepare("SELECT COUNT(*) as c FROM attendance_records").get();
  if (Number(row?.c ?? 0) > 0) return;

  const members = (await db.prepare("SELECT id FROM members WHERE active = 1").all()).map((m) => m.id);
  if (!members.length) return;

  const insRec = db.prepare(
    "INSERT INTO attendance_records (id, date, type, cell_id, fellowship_id, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insMem = db.prepare(
    "INSERT INTO attendance_members (record_id, member_id, status, is_newcomer) VALUES (?, ?, ?, ?)"
  );
  const insGuest = db.prepare(
    "INSERT INTO attendance_guests (id, record_id, name, contact) VALUES (?, ?, ?, ?)"
  );

  const serviceDates = [lastSunday(0), lastSunday(1), lastSunday(2), lastSunday(3)];
  const servicePresent = [22, 20, 24, 19];
  const lastServiceNewcomers = ["m11", "m12", "m13"];
  let lastServiceId = null;
  for (let i = 0; i < serviceDates.length; i++) {
    const id = uid();
    if (i === 0) lastServiceId = id;
    const presentCount = servicePresent[i];
    const present = members.slice(0, presentCount);
    const absent = members.slice(presentCount, presentCount + 3);
    await insRec.run(id, serviceDates[i], "service", null, null, "m1");
    for (const mid of present) {
      await insMem.run(id, mid, "present", i === 0 && lastServiceNewcomers.includes(mid) ? 1 : 0);
    }
    for (const mid of absent) await insMem.run(id, mid, "absent", 0);
    if (i === 0) {
      await insGuest.run(uid(), id, "Kwame Asante", "+233 24 000 3333");
      await insGuest.run(uid(), id, "Ama Serwaa", null);
    }
  }

  const cellMeetings = [
    { cell: "c1", fel: "f1", date: daysAgo(3), present: 8 },
    { cell: "c2", fel: "f1", date: daysAgo(4), present: 6 },
    { cell: "c3", fel: "f2", date: daysAgo(2), present: 7 },
    { cell: "c4", fel: "f1", date: daysAgo(5), present: 5 },
  ];
  for (const cm of cellMeetings) {
    const id = uid();
    const idx = cellMeetings.indexOf(cm);
    const present = members.slice(idx * 3, idx * 3 + cm.present);
    await insRec.run(id, cm.date, "cell", cm.cell, cm.fel, "m4");
    for (const mid of present) await insMem.run(id, mid, "present", 0);
  }

  const insFin = db.prepare(
    `INSERT INTO finances (id, date, type, category, amount, member_id, description, purpose_type, purpose_id, purpose_label, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const lastSvc = serviceDates[0];
  const svcLabel = `Sunday Service · ${lastSvc}`;
  await insFin.run(uid(), lastSvc, "income", "Offering", 4850, null, "Sunday service offering", null, null, null, "m7");
  await insFin.run(uid(), lastSvc, "income", "Tithe", 6200, "m4", "Sunday tithes", null, null, null, "m7");
  await insFin.run(uid(), lastSvc, "income", "Seed", 1200, "m6", "Special seed offering", null, null, null, "m7");
  await insFin.run(uid(), serviceDates[1], "income", "Offering", 4200, null, "Sunday offering", null, null, null, "m7");
  await insFin.run(uid(), serviceDates[1], "income", "Tithe", 5800, null, "Sunday tithes", null, null, null, "m7");
  await insFin.run(uid(), lastSvc, "expense", "Refreshments", 650, null, "Tea, water and snacks after service", "service", lastServiceId, svcLabel, "m7");
  await insFin.run(uid(), lastSvc, "expense", "Sound & Media", 400, null, "Extra microphone batteries and cables", "service", lastServiceId, svcLabel, "m7");
  await insFin.run(uid(), daysAgo(10), "expense", "Utilities", 1500, null, "Electricity and water bills", "general", null, "Church utilities", "m7");
  await insFin.run(uid(), daysAgo(5), "expense", "Outreach", 800, null, "Tracts and flyers for evangelism", "outreach", null, "Street outreach", "m7");
  await insFin.run(uid(), daysAgo(3), "expense", "Transport", 350, null, "Usher team transport", "cell", "c1", "Grace Cell A", "m7");

  await db.prepare(
    "INSERT INTO prayer_requests (id, member_id, title, content, is_private, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(uid(), "m11", "Healing for sister", "Pray for complete recovery after surgery", usePostgres ? false : 0, "pending");
  await db.prepare(
    "INSERT INTO prayer_requests (id, member_id, title, content, is_private, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(uid(), "m12", "Job breakthrough", "Seeking employment after graduation", usePostgres ? false : 0, "pending");
  await db.prepare(
    "INSERT INTO prayer_requests (id, member_id, title, content, is_private, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(uid(), "m13", "Family salvation", "Parents to receive salvation", usePostgres ? true : 1, "prayed");

  const taskId = uid();
  await db.prepare(
    "INSERT INTO tasks (id, title, description, department_id, due_date, priority, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(taskId, "Prepare Sunday bulletin", "Finalize order of service and announcements", "d8", daysAgo(-2), "high", "pending", "m1");
  await db.prepare("INSERT INTO task_assignees (task_id, member_id) VALUES (?, ?)").run(taskId, "m7");

  await db.prepare(
    "INSERT INTO follow_ups (id, name, contact, stage, assigned_to_id) VALUES (?, ?, ?, ?, ?)"
  ).run(uid(), "John Visitor", "+233 24 000 1111", "Visitor", "m4");
  await db.prepare(
    "INSERT INTO follow_ups (id, name, contact, stage, assigned_to_id) VALUES (?, ?, ?, ?, ?)"
  ).run(uid(), "Mary Convert", "+233 24 000 2222", "New Convert", "m6");

  await db.prepare(
    `INSERT INTO cell_reports (id, type, submitter_id, cell_id, fellowship_id, period, attendance_count, new_visitors, prayer_points, challenges, status, submitted_at, due_date)
     VALUES (?, 'cell', ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', datetime('now'), ?)`
  ).run(uid(), "m4", "c1", "f1", "Week of " + daysAgo(7), 8, 2, "Growth in cell", "Venue space limited", daysAgo(-3));

  await db.prepare(
    "INSERT INTO announcements (id, title, content, target, expires_at, pinned, created_by) VALUES (?, ?, ?, 'all', ?, ?, ?)"
  ).run(uid(), "Combined Service This Sunday", "All fellowships meet at the main auditorium at 9 AM.", daysAgo(-14), usePostgres ? true : 1, "m1");

  console.log("Dashboard sample data (attendance, finances, prayers) added.");
}

/** Backfill newcomer flags on the latest service when attendance exists but newcomers were never tracked */
export async function ensureNewcomerSampleData(db) {
  const newcomerCheck = usePostgres
    ? "SELECT 1 as x FROM attendance_members WHERE is_newcomer IS TRUE LIMIT 1"
    : "SELECT 1 as x FROM attendance_members WHERE is_newcomer = 1 LIMIT 1";
  const has = await db.prepare(newcomerCheck).get();
  if (has) return;

  const lastSvc = await db
    .prepare("SELECT id FROM attendance_records WHERE type = 'service' ORDER BY date DESC LIMIT 1")
    .get();
  if (!lastSvc) return;

  const newcomerSet = usePostgres
    ? "UPDATE attendance_members SET is_newcomer = TRUE WHERE record_id = ? AND member_id = ? AND status = 'present'"
    : "UPDATE attendance_members SET is_newcomer = 1 WHERE record_id = ? AND member_id = ? AND status = 'present'";

  for (const mid of ["m11", "m12", "m13"]) {
    await db.prepare(newcomerSet).run(lastSvc.id, mid);
  }

  const guestCount = await db
    .prepare("SELECT COUNT(*) as c FROM attendance_guests WHERE record_id = ?")
    .get(lastSvc.id);
  if (Number(guestCount?.c ?? 0) === 0) {
    await db
      .prepare("INSERT INTO attendance_guests (id, record_id, name, contact) VALUES (?, ?, ?, ?)")
      .run(uid(), lastSvc.id, "Kwame Asante", "+233 24 000 3333");
    await db
      .prepare("INSERT INTO attendance_guests (id, record_id, name, contact) VALUES (?, ?, ?, ?)")
      .run(uid(), lastSvc.id, "Ama Serwaa", null);
  }

  console.log("Newcomer sample data added to latest service attendance.");
}

if (process.argv[1]?.endsWith("seed.js")) {
  const reset = process.argv.includes("--reset");
  import("./store.js").then(({ initDatabase }) =>
    initDatabase().then(() => seedDatabase(reset)).catch(console.error)
  );
}
