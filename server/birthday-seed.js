/** Assign sample birthdays when none exist (existing databases). */
export async function ensureBirthdayData(db) {
  const row = await db.prepare("SELECT COUNT(*) as c FROM members WHERE date_of_birth IS NOT NULL").get();
  if (Number(row?.c ?? 0) > 0) return;

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const samples = [
    { id: "m2", day: "05" },
    { id: "m4", day: "12" },
    { id: "m6", day: "18" },
    { id: "m9", day: "22" },
    { id: "m11", day: "08" },
    { id: "m12", day: "24" },
    { id: "m1", day: "03" },
    { id: "m3", day: "15" },
  ];

  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevMonthStr = String(prevMonth).padStart(2, "0");
  const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  const nextMonthStr = String(nextMonth).padStart(2, "0");

  const extra = [
    { id: "m5", month: prevMonthStr, day: "10", birthYear: 1992 },
    { id: "m7", month: prevMonthStr, day: "28", birthYear: 1988 },
    { id: "m8", month: nextMonthStr, day: "06", birthYear: 1985 },
    { id: "m10", month: nextMonthStr, day: "20", birthYear: 1994 },
    { id: "m13", month: "07", day: "14", birthYear: 1996 },
    { id: "m14", month: "09", day: "30", birthYear: 1991 },
  ];

  const upd = db.prepare("UPDATE members SET date_of_birth = ? WHERE id = ?");
  for (const s of samples) {
    const birthYear = s.id === "m1" ? 1975 : s.id === "m2" ? 1982 : 1990 - (samples.indexOf(s) % 8);
    await upd.run(`${birthYear}-${month}-${s.day}`, s.id);
  }
  for (const e of extra) {
    await upd.run(`${e.birthYear}-${e.month}-${e.day}`, e.id);
  }

  for (let i = 0; i < 10; i++) {
    const id = `m${15 + i}`;
    const exists = await db.prepare("SELECT id FROM members WHERE id = ?").get(id);
    if (!exists) continue;
    const m = String(((i % 6) + 1)).padStart(2, "0");
    const d = String(5 + i * 2).padStart(2, "0");
    const months = [month, prevMonthStr, nextMonthStr, "01", "11"];
    const birthMonth = months[i % months.length];
    await upd.run(`${1995 + (i % 10)}-${birthMonth}-${d}`, id);
  }

  console.log(`Birthday sample data applied (${month}/${year} celebrants included).`);
}
