import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('persistent audit stores security events without credentials or PII fields', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    await repository.appendAudit({
      type: 'auth.login.failed',
      userId: 'usr_test',
      tenantId: 'tenant-a',
      email: 'secret@example.com',
      password: 'should-never-persist',
      accessToken: 'raw-token',
      sessionId: 'ses_test'
    });
    const { rows } = await pool.query('SELECT event_type,user_id,tenant_id,session_id,metadata FROM afx_security_audit WHERE session_id=$1 ORDER BY id DESC LIMIT 1', ['ses_test']);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event_type, 'auth.login.failed');
    assert.equal(rows[0].user_id, 'usr_test');
    assert.equal(rows[0].tenant_id, 'tenant-a');
    assert.equal(rows[0].session_id, 'ses_test');
    assert.deepEqual(rows[0].metadata, {});
  } finally {
    await pool.end();
  }
});

test('persistent core defaults audit to repository authority', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    const core = new PersistentAfxCore({ repository });
    const user = await core.createUser({ email: `audit-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    const { rows } = await pool.query('SELECT event_type,user_id FROM afx_security_audit WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [user.id]);
    assert.equal(rows[0].event_type, 'identity.user.created');
    assert.equal(rows[0].user_id, user.id);
  } finally {
    await pool.end();
  }
});
