import { getDb } from "./store.js";
import { getSupabaseAdminClient, useSupabaseAuth } from "./supabase.js";

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "ChangeMe123!";

async function findAuthUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function syncAuthUsers(options = {}) {
  const resetPasswords = options.resetPasswords ?? process.argv.includes("--reset-passwords");
  if (!useSupabaseAuth()) return { synced: 0, skipped: true };

  const admin = getSupabaseAdminClient();
  if (!admin) {
    console.warn(
      "Supabase Auth: set SUPABASE_SERVICE_ROLE_KEY in .env to auto-create login accounts for church users."
    );
    return { synced: 0, skipped: true, reason: "no_service_role" };
  }

  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT u.id, u.email, u.member_id, u.auth_user_id, m.name, m.role
       FROM users u
       JOIN members m ON m.id = u.member_id
       WHERE m.active = 1`
    )
    .all();

  let synced = 0;
  for (const row of rows) {
    if (row.auth_user_id && !resetPasswords) continue;

    let authUser = row.auth_user_id
      ? { id: row.auth_user_id }
      : await findAuthUserByEmail(admin, row.email);

    if (!authUser && !row.auth_user_id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: row.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        app_metadata: {
          member_id: row.member_id,
          role: row.role,
        },
        user_metadata: { name: row.name },
      });
      if (error && !error.message?.toLowerCase().includes("already")) {
        console.warn(`Auth sync failed for ${row.email}:`, error.message);
        continue;
      }
      authUser = data?.user || (await findAuthUserByEmail(admin, row.email));
    }

    if (!authUser) continue;

    const updates = {
      email_confirm: true,
      app_metadata: {
        member_id: row.member_id,
        role: row.role,
      },
    };
    if (resetPasswords || !row.auth_user_id) updates.password = DEFAULT_PASSWORD;
    await admin.auth.admin.updateUserById(authUser.id, updates);

    if (!row.auth_user_id) {
      await db.prepare("UPDATE users SET auth_user_id = ? WHERE id = ?").run(authUser.id, row.id);
    }
    synced += 1;
  }

  if (synced > 0) {
    console.log(
      resetPasswords
        ? `Supabase Auth: refreshed ${synced} user password(s) to SEED_PASSWORD`
        : `Supabase Auth: linked ${synced} church user(s) to auth.users`
    );
  }
  return { synced, skipped: false, resetPasswords };
}

/** Create a Supabase Auth account when a new church user is added via admin UI. */
export async function createSupabaseAuthUser({ email, password, memberId, name, role }) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { authUserId: null, warning: "SUPABASE_SERVICE_ROLE_KEY not set" };

  const { data, error } = await admin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    app_metadata: { member_id: memberId, role },
    user_metadata: { name },
  });

  if (error) {
    const existing = await findAuthUserByEmail(admin, email);
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, {
        password,
        app_metadata: { member_id: memberId, role },
      });
      return { authUserId: existing.id };
    }
    throw error;
  }
  return { authUserId: data.user.id };
}

export async function updateSupabaseAuthPassword(authUserId, newPassword) {
  const admin = getSupabaseAdminClient();
  if (!admin || !authUserId) return { ok: false };
  const { error } = await admin.auth.admin.updateUserById(authUserId, { password: newPassword });
  if (error) throw error;
  return { ok: true };
}
