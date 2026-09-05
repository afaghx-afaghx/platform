import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';

const databaseUrl = process.env.DATABASE_URL;

test('G01-22 durable audit is append-oriented, tenant scoped, redacted and purgeable', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repo = new PostgresAfxCoreRepository(pool);
  await repo.migrate();
  const id1 = `audit-${Date.now()}-1`;
  const id2 = `audit-${Date.now()}-2`;
  const first = await repo.appendSecurityAudit({ id: id1, eventType: 'auth.login', outcome: 'success', tenantId: 'tenant-a', requestId: 'req-1', metadata: { method: 'password' }, retentionUntil: Date.now() + 60_000 });
  const second = await repo.appendSecurityAudit({ id: id2, eventType: 'auth.denied', outcome: 'denied', tenantId: 'tenant-a', requestId: 'req-2', metadata: { reason: 'policy' }, retentionUntil: Date.now() - 1 });
  assert.equal(second.integrityPrevHash, first.integrityHash);
  const rows = await repo.listSecurityAudit({ tenantId: 'tenant-a' });
  assert.ok(rows.some((row) => row.id === id1));
  await assert.rejects(() => repo.appendSecurityAudit({ id: `audit-${Date.now()}-bad`, eventType: 'auth.login', outcome: 'failure', tenantId: 'tenant-a', metadata: { credential_value: 'should-not-be-recorded' }, retentionUntil: Date.now() + 60_000 }), /audit_sensitive_metadata/);
  assert.ok((await repo.purgeExpiredAudit()) >= 1);
  await pool.query('DELETE FROM afx_security_audit_events WHERE id IN ($1,$2)', [id1, id2]);
  await pool.end();
});
