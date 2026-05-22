import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, initSchema, logActivity } from "./db.js";

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

export async function seedDatabase(reset = false) {
  if (reset && fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("Removed existing database.");
  }
  initSchema();
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as c FROM members").get();
  if (count.c > 0 && !reset) {
    console.log("Database already seeded.");
    return;
  }

  if (reset) {
    db.exec(`
      DELETE FROM notifications; DELETE FROM activities; DELETE FROM cell_reports;
      DELETE FROM media_items; DELETE FROM task_assignees; DELETE FROM tasks;
      DELETE FROM announcements; DELETE FROM follow_up_notes; DELETE FROM follow_ups;
      DELETE FROM prayer_requests; DELETE FROM finances; DELETE FROM message_recipients;
      DELETE FROM messages; DELETE FROM event_rsvps; DELETE FROM events;
      DELETE FROM attendance_members; DELETE FROM attendance_records;
      DELETE FROM member_departments; DELETE FROM departments;
      DELETE FROM cells; DELETE FROM fellowships; DELETE FROM users; DELETE FROM members;
      DELETE FROM church_settings;
    `);
  }

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  db.prepare(
    `INSERT OR REPLACE INTO church_settings (id, name, tagline, address, phone, email, logo_url)
     VALUES (1, ?, ?, ?, ?, ?, ?)`
  ).run(
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
  fellowships.forEach((f) => insF.run(f.id, f.name, null));

  const cells = [
    { id: "c1", name: "Grace Cell A", fellowshipId: "f1" },
    { id: "c2", name: "Grace Cell B", fellowshipId: "f1" },
    { id: "c3", name: "Victory Cell A", fellowshipId: "f2" },
    { id: "c4", name: "Faith Cell", fellowshipId: "f1" },
  ];
  const insC = db.prepare(
    "INSERT INTO cells (id, name, fellowship_id, leader_id, sub_leader_id) VALUES (?, ?, ?, ?, ?)"
  );
  cells.forEach((c) => insC.run(c.id, c.name, c.fellowshipId, null, null));

  const insD = db.prepare("INSERT INTO departments (id, name, head_id) VALUES (?, ?, ?)");
  DEPARTMENTS.forEach((name, i) => insD.run(`d${i + 1}`, name, null));

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
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  );
  const insU = db.prepare(
    `INSERT INTO users (id, email, password_hash, member_id, access_level) VALUES (?, ?, ?, ?, ?)`
  );
  const insMD = db.prepare(
    "INSERT INTO member_departments (member_id, department_id) VALUES (?, ?)"
  );

  for (const m of coreMembers) {
    insM.run(m.id, m.name, m.email, "+234 801 000 0000", m.role, m.cell, m.fel, "2020-01-15");
    insU.run(uid(), m.email, hash, m.id, m.role === "Admin" ? "admin" : m.role.includes("Pastor") ? "full" : "standard");
  }

  insMD.run("m2", "d1");
  insMD.run("m3", "d8");
  insMD.run("m4", "d1");
  insMD.run("m4", "d5");
  insMD.run("m7", "d8");

  db.prepare("UPDATE fellowships SET leader_id = ? WHERE id = ?").run("m3", "f1");
  db.prepare("UPDATE fellowships SET leader_id = ? WHERE id = ?").run("m8", "f2");
  db.prepare("UPDATE cells SET leader_id = ?, sub_leader_id = ? WHERE id = ?").run("m4", "m5", "c1");
  db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run("m6", "c2");
  db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run("m9", "c3");
  db.prepare("UPDATE cells SET leader_id = ? WHERE id = ?").run("m10", "c4");
  db.prepare("UPDATE departments SET head_id = ? WHERE id = ?").run("m2", "d1");

  for (let i = 0; i < 15; i++) {
    const id = `m${11 + i}`;
    const cell = cells[i % 4].id;
    const fel = i % 4 < 2 ? "f1" : "f2";
    const role = i % 3 === 0 ? "Cell Member" : "Church Member";
    insM.run(id, `Member ${i + 1} Believer`, `member${i + 1}@celcm.org`, `+234 802 000 ${1000 + i}`, role, cell, fel, "2022-06-10");
    insU.run(uid(), `member${i + 1}@celcm.org`, hash, id, "standard");
    insMD.run(id, `d${(i % 8) + 1}`);
  }

  const insAtt = db.prepare(
    "INSERT INTO attendance_records (id, date, type, cell_id, fellowship_id, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insAM = db.prepare(
    "INSERT INTO attendance_members (record_id, member_id, status) VALUES (?, ?, ?)"
  );
  const a1 = uid();
  insAtt.run(a1, "2025-05-18", "cell", "c1", "f1", "m4");
  ["m4", "m5", "m11", "m12"].forEach((mid) => insAM.run(a1, mid, "present"));
  insAM.run(a1, "m13", "absent");

  db.prepare(
    `INSERT INTO events (id, title, date, time, location, department_id, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uid(), "Sunday Service", "2025-05-25", "09:00", "Main Auditorium", "d1", "Combined service", "m1");

  db.prepare(
    `INSERT INTO finances (id, date, type, category, amount, member_id, description, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uid(), "2025-05-19", "income", "Tithe", 450000, "m11", "Sunday tithes", "m7");

  db.prepare(
    `INSERT INTO prayer_requests (id, member_id, title, content, is_private, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uid(), "m11", "Healing for my mother", "Please pray for my mother.", 0, "pending");

  db.prepare(
    `INSERT INTO follow_ups (id, name, contact, stage, assigned_to_id) VALUES (?, ?, ?, ?, ?)`
  ).run(uid(), "John Visitor", "+234 803 111 2222", "Visitor", "m4");

  db.prepare(
    `INSERT INTO announcements (id, title, content, target, pinned, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uid(), "Water Baptism Class", "Register at the protocol desk.", "all", 1, "2025-12-31", "m7");

  db.prepare(
    `INSERT INTO tasks (id, title, description, department_id, due_date, priority, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uid(), "Prepare usher roster", "June services roster", "d2", "2025-05-28", "high", "in_progress", "m7");

  db.prepare(
    `INSERT INTO cell_reports (id, type, submitter_id, cell_id, period, attendance_count, new_visitors, prayer_points, challenges, status, submitted_at, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
  ).run(uid(), "cell", "m4", "c1", "May Week 3", 12, 2, "Healing, jobs", "Venue capacity", "submitted", "2025-05-25");

  logActivity(db, "System initialized with seed data", "m1");
  console.log(`Seeded database. Default password for all accounts: ${DEFAULT_PASSWORD}`);
}

if (process.argv[1]?.endsWith("seed.js")) {
  const reset = process.argv.includes("--reset");
  seedDatabase(reset).catch(console.error);
}
