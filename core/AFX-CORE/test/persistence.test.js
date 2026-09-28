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
  } finally {
    await pool.end();
  }
});

test('persistent session revocation also revokes its refresh family', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core = await createTestCore(pool);
    const user = await core.createUser({ email: `revoke-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

    await core.revokeSession(tokens.sessionId);
    await assert.rejects(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
    await assert.rejects(() => core.refresh(tokens.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
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

test('login state rolls back as one atomic persistence unit', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core = await createTestCore(pool);
    const user = await core.createUser({ email: `atomic-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const existing = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

    const familyCount = await pool.query('SELECT count(*)::int AS count FROM afx_refresh_families');
    const sessionCount = await pool.query('SELECT count(*)::int AS count FROM afx_sessions');
    const badCredential = existing.refreshToken;

    await assert.rejects(
      () => core.repository.storeAuthState({
        session: { id: `ses-bad-${Date.now()}`, userId: user.id, tenantId: 'tenant-a', familyId: `family-bad-${Date.now()}`, revoked: false, accessDigest: `digest-${Date.now()}`, accessExpiresAt: Date.now() + 300000 },
        family: { id: `family-bad-${Date.now()}`, userId: user.id, tenantId: 'tenant-a', currentDigest: `digest-bad-${Date.now()}`, expiresAt: Date.now() + 300000, revoked: false },
        credential: { digest: require('../src/security.js').tokenDigest(badCredential), familyId: `family-bad-${Date.now()}`, used: false }
      })
    );

    const familyCountAfter = await pool.query('SELECT count(*)::int AS count FROM afx_refresh_families');
    const sessionCountAfter = await pool.query('SELECT count(*)::int AS count FROM afx_sessions');
    assert.equal(familyCountAfter.rows[0].count, familyCount.rows[0].count);
    assert.equal(sessionCountAfter.rows[0].count, sessionCount.rows[0].count);
  } finally {
    await pool.end();
  }
});
