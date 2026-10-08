import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { PostgresAfxCoreRepository, sanitizeAuditEvent } from "../src/repository.js";
import { PersistentAfxCore } from "../src/persistent-core.js";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test("G01-22 sanitizer rejects malformed event and strips credential-like fields", () => {
  const safe = sanitizeAuditEvent({
    type: "auth.login.succeeded",
    userId: "usr_1",
    tenantId: "tenant_1",
    accessToken: "secret-access-token",
    refreshToken: "secret-refresh-token",
    password: "secret-password",
    reason: "login"
  });
  assert.equal(safe.accessToken, undefined);
  assert.equal(safe.refreshToken, undefined);
  assert.equal(safe.password, undefined);
  assert.deepEqual(safe, {
    type: "auth.login.succeeded",
    userId: "usr_1",
    tenantId: "tenant_1",
    reason: "login"
  });
});

test("G01-22 persistent audit stores sanitized events and retention deletes expired records", { skip: !databaseUrl }, async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(() => pool.end());
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();

  const now = new Date("2026-10-08T00:00:00.000Z");
  const oldAt = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000);
  const newAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  await repository.recordAuditEvent({
    type: "auth.test.old",
    userId: "usr_old",
    tenantId: "tenant_old",
    accessToken: "DO_NOT_STORE"
  }, { createdAt: oldAt });

  await repository.recordAuditEvent({
    type: "auth.test.new",
    userId: "usr_new",
    tenantId: "tenant_new",
    refreshToken: "DO_NOT_STORE",
    reason: "retention-check"
  }, { createdAt: newAt });

  const rowsBefore = (await pool.query(
    "SELECT type, user_id AS \"userId\", tenant_id AS \"tenantId\", metadata, created_at FROM afx_audit_events WHERE type IN ('auth.test.old','auth.test.new') ORDER BY type"
  )).rows;

  assert.equal(rowsBefore.length, 2);
  assert.equal(rowsBefore[0].metadata.accessToken, undefined);
  assert.equal(rowsBefore[1].metadata.refreshToken, undefined);

  const pruned = await repository.pruneAuditEvents({ retentionDays: 90, now });
  assert.ok(pruned.deleted >= 1);

  const rowsAfter = (await pool.query(
    "SELECT type FROM afx_audit_events WHERE type IN ('auth.test.old','auth.test.new') ORDER BY type"
  )).rows;
  assert.deepEqual(rowsAfter.map(row => row.type), ["auth.test.new"]);

  const core = new PersistentAfxCore({ repository, clock: () => now.getTime() });
  await core.audit({ type: "auth.audit.default", userId: "usr_core", tenantId: "tenant_core", secret: "NOT_ALLOWED" });

  const defaultRow = (await pool.query(
    "SELECT metadata FROM afx_audit_events WHERE type='auth.audit.default' ORDER BY created_at DESC LIMIT 1"
  )).rows[0];
  assert.ok(defaultRow);
  assert.equal(defaultRow.metadata.secret, undefined);
});

test("G01-22 retention policy rejects unsafe retention ranges", { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(() => pool.end());
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  await assert.rejects(() => repository.pruneAuditEvents({ retentionDays: 0 }), /invalid_audit_retention/);
  await assert.rejects(() => repository.pruneAuditEvents({ retentionDays: 3651 }), /invalid_audit_retention/);
});
