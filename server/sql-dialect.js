/** Translate app SQL placeholders and SQLite idioms to Postgres (Supabase). */

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
  s = s.replace(/\browid\b/gi, "id");
  s = s.replace(/strftime\s*\(\s*'%Y-%m'\s*,\s*([\w.]+)\s*\)/gi, "TO_CHAR($1::date, 'YYYY-MM')");
  s = s.replace(/strftime\s*\(\s*'%m'\s*,\s*([\w.]+)\s*\)/gi, "TO_CHAR($1::date, 'MM')");
  s = s.replace(/strftime\s*\(\s*'%d'\s*,\s*([\w.]+)\s*\)/gi, "TO_CHAR($1::date, 'DD')");

  // Keep 0/1 integer comparisons — app schema uses INTEGER flags on Postgres (not BOOLEAN).

  return convertPlaceholders(s);
}

export { canUseSupabaseDatabase as useSupabaseDatabase, resolveDatabaseUrl } from "./supabase-db-url.js";
