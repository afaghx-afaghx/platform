import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

async function createTestCore(pool) {
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  return new PersistentAfxCore({ repository });
}

test('postgres persistence survives service object recreation', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core1 = await createTestCore(pool);
    const user = await core1.createUser({ email: `persist-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core1.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
    await core1.grantRolePermission('admin', 'invoice.read');
    const tokens = await core1.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

    const repository = new PostgresAfxCoreRepository(pool);
    const core2 = new PersistentAfxCore({ repository });
    const context = await core2.authenticateAccessToken(tokens.accessToken);
    assert.equal(context.userId, user.id);
    assert.equal(await core2.authorize(context, 'invoice.read', 'tenant-a'), true);

    const { rows } = await pool.query(
      'SELECT event_type,user_id,tenant_id,session_id,family_id,email,occurred_at FROM afx_audit_events WHERE user_id=$1 ORDER BY id',
      [user.id]
    );
    assert.ok(rows.length >= 3);
    assert.equal(rows.some(row => row.event_type === 'identity.user.created'), true);
    assert.equal(rows.some(row => row.event_type === 'identity.membership.created'), true);
    assert.equal(rows.some(row => row.event_type === 'auth.login.succeeded' && row.session_id === tokens.sessionId), true);
  } finally {
    await pool.end();
  }
});

test('persistent audit is redacted by construction', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core = await createTestCore(pool);
    const user = await core.createUser({ email: `audit-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    await core.refresh(tokens.refreshToken);

    const { rows } = await pool.query(
      'SELECT event_type,user_id,tenant_id,session_id,family_id,email FROM afx_audit_events WHERE user_id=$1 OR email=$2 ORDER BY id',
      [user.id, user.email]
    );
    const serialized = JSON.stringify(rows);
    assert.equal(serialized.includes('Correct Horse Battery Staple!'), false);
    assert.equal(serialized.includes(tokens.accessToken), false);
    assert.equal(serialized.includes(tokens.refreshToken), false);
    assert.equal(rows.some(row => row.event_type === 'auth.refresh.rotated' && row.user_id === user.id && row.tenant_id === 'tenant-a'), true);
  } finally {
    await pool.end();
  }
});

test('schema enforces tenant nonempty and session-family referential integrity', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core = await createTestCore(pool);
    const user = await core.createUser({ email: `schema-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });

    await assert.rejects(
      () => pool.query(
        'INSERT INTO afx_memberships(user_id,tenant_id,roles,status) VALUES($1,$2,$3,$4)',
        [user.id, '   ', '[]', 'active']
      ),
      /afx_memberships_tenant_nonempty|check/
    );

    await assert.rejects(
      () => pool.query(
        'INSERT INTO afx_sessions(id,user_id,tenant_id,family_id,access_digest,access_expires_at,revoked) VALUES($1,$2,$3,$4,$5,now(),false)',
        [`orphan-${Date.now()}`, user.id, 'tenant-a', 'missing-family', `digest-${Date.now()}`]
      ),
      /afx_sessions_family_fk|foreign key/
    );
  } finally {
    await pool.end();
  }
});

test('concurrent refresh allows exactly one winner', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  try {
    const core = await createTestCore(pool);
    const user = await core.createUser({ email: `race-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const results = await Promise.allSettled([
      core.refresh(tokens.refreshToken),
      core.refresh(tokens.refreshToken),
    ]);
    const fulfilled = results.filter(x => x.status === 'fulfilled');
    const rejected = results.filter(x => x.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(rejected[0].reason.message, /refresh_reuse_detected|invalid_refresh_token/);
  } finally {
    await pool.end();
  }
});
