import { getDb } from "./db.js";

export function logAudit(memberId, action, entityType = null, entityId = null, details = null) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_log (id, member_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), memberId, action, entityType, entityId, details ? JSON.stringify(details) : null);
}
