const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function canViewBirthdays(role) {
  return ["Senior Pastor", "Associate Pastor", "Admin"].includes(role);
}

function parseMonthInput(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return null;
  }
  return { year: y, month: m };
}

function birthdayTiming(day, month, year, referenceDate = new Date()) {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  if (year === refYear && month === refMonth) {
    if (day === refDay) return "today";
    if (day > refDay) return "upcoming";
    return "past";
  }
  if (year > refYear || (year === refYear && month > refMonth)) return "upcoming";
  return "past";
}

function formatCelebrant(row, contextYear, contextMonth, referenceDate = new Date()) {
  const [birthYear, birthMonth, birthDay] = row.date_of_birth.split("-").map(Number);
  const day = birthDay;
  const monthLabel = MONTH_NAMES[contextMonth - 1];
  const ageOnBirthday = contextYear - birthYear;

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone || null,
    dateOfBirth: row.date_of_birth,
    day,
    dateLabel: `${monthLabel} ${day}`,
    turningAge: ageOnBirthday,
    timing: birthdayTiming(day, contextMonth, contextYear, referenceDate),
  };
}

async function queryBirthdayRows(db, month) {
  return db
    .prepare(
      `SELECT id, name, role, phone, date_of_birth
       FROM members
       WHERE active = 1 AND date_of_birth IS NOT NULL
         AND CAST(strftime('%m', date_of_birth) AS INTEGER) = ?
       ORDER BY CAST(strftime('%d', date_of_birth) AS INTEGER), name`
    )
    .all(month);
}

export async function getBirthdaysForMonth(db, year, month, referenceDate = new Date()) {
  const parsed = parseMonthInput(year, month);
  if (!parsed) return null;

  const rows = await queryBirthdayRows(db, parsed.month);
  const celebrants = rows.map((row) => formatCelebrant(row, parsed.year, parsed.month, referenceDate));

  return {
    year: parsed.year,
    month: parsed.month,
    monthLabel: `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`,
    count: celebrants.length,
    celebrants,
  };
}

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
