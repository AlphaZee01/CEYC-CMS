/** Translate SQLite-oriented SQL used by the API to Postgres (Supabase). */

function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export function toPostgresSql(sql) {
  let s = sql;

  if (/INSERT\s+OR\s+REPLACE\s+INTO\s+church_settings/i.test(s)) {
    s = s.replace(/INSERT\s+OR\s+REPLACE/i, "INSERT");
    if (!/ON\s+CONFLICT/i.test(s)) {
      s = `${s.trim()} ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tagline = EXCLUDED.tagline, address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, logo_url = EXCLUDED.logo_url`;
    }
  } else if (/INSERT\s+OR\s+IGNORE\s+INTO\s+member_departments/i.test(s)) {
    s = s.replace(/INSERT\s+OR\s+IGNORE/i, "INSERT");
    if (!/ON\s+CONFLICT/i.test(s)) {
      s = s.replace(/;?\s*$/, " ON CONFLICT (member_id, department_id) DO NOTHING");
    }
  } else {
    s = s.replace(/INSERT\s+OR\s+IGNORE/gi, "INSERT");
  }

  s = s.replace(/datetime\s*\(\s*'now'\s*\)/gi, "NOW()");
  s = s.replace(/date\s*\(\s*'now'\s*,\s*'([^']+)'\s*\)/gi, (_m, offset) => {
    const trimmed = offset.trim();
    const match = trimmed.match(/^([+-])\s*(\d+)\s+(\w+)$/);
    if (match) {
      const sign = match[1] === "-" ? "-" : "+";
      return `(TO_CHAR(CURRENT_DATE ${sign} INTERVAL '${match[2]} ${match[3]}', 'YYYY-MM-DD'))`;
    }
    return "TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')";
  });
  s = s.replace(/date\s*\(\s*'now'\s*\)/gi, "TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')");

  const boolEq = [
    ["active", "1", "TRUE"],
    ["active", "0", "FALSE"],
    ["read", "1", "TRUE"],
    ["read", "0", "FALSE"],
    ["used", "1", "TRUE"],
    ["used", "0", "FALSE"],
    ["broadcast", "1", "TRUE"],
    ["broadcast", "0", "FALSE"],
    ["pinned", "1", "TRUE"],
    ["pinned", "0", "FALSE"],
    ["is_private", "1", "TRUE"],
    ["is_private", "0", "FALSE"],
    ["notified", "1", "TRUE"],
    ["notified", "0", "FALSE"],
    ["is_newcomer", "1", "TRUE"],
    ["is_newcomer", "0", "FALSE"],
  ];
  for (const [col, val, repl] of boolEq) {
    s = s.replace(new RegExp(`\\b${col}\\s*=\\s*${val}\\b`, "gi"), `${col} = ${repl}`);
  }

  return convertPlaceholders(s);
}

export { canUseSupabaseDatabase as useSupabaseDatabase, resolveDatabaseUrl } from "./supabase-db-url.js";
