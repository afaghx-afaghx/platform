import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { tokenDigest } from '../src/security.js';

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

test('postgres schema enforces unique identity email constraint', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    const email = `unique-${Date.now()}@example.com`;
    await repository.createUser({ id: `unique-a-${Date.now()}`, email, passwordHash: 'hash', status: 'active' });
    await assert.rejects(
      repository.createUser({ id: `unique-b-${Date.now()}`, email, passwordHash: 'hash', status: 'active' }),
      /duplicate key|unique/i,
    );
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

test('concurrent refresh allows exactly one winner and leaves one successor', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  try {
    const core = await createTestCore(pool);
    const repository = core.repository;
    const user = await core.createUser({ email: `race-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const sessionBefore = await repository.findSessionByAccessDigest(tokenDigest(tokens.accessToken));
    assert.ok(sessionBefore);
    const familyId = sessionBefore.familyId;
    const oldDigest = tokenDigest(tokens.refreshToken);

    const results = await Promise.allSettled([
      core.refresh(tokens.refreshToken),
      core.refresh(tokens.refreshToken),
    ]);
    const fulfilled = results.filter(x => x.status === 'fulfilled');
    const rejected = results.filter(x => x.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.message, 'refresh_reuse_detected');

    const family = (await pool.query(
      'SELECT id,current_digest,revoked,version FROM afx_refresh_families WHERE id=$1',
      [familyId],
    )).rows[0];
    assert.ok(family);
    assert.equal(family.version, '1');
    assert.equal(family.revoked, true);

    const tokenRows = (await pool.query(
      'SELECT digest,used FROM afx_refresh_tokens WHERE family_id=$1',
      [familyId],
    )).rows;
    assert.equal(tokenRows.length, 2);
    assert.equal(tokenRows.filter(row => row.digest === oldDigest && row.used).length, 1);
    assert.equal(tokenRows.filter(row => row.digest === family.current_digest).length, 1);

    const activeSessions = (await pool.query(
      'SELECT count(*)::int AS count FROM afx_sessions WHERE family_id=$1 AND revoked=false',
      [familyId],
    )).rows[0].count;
    assert.equal(activeSessions, 0);
  } finally {
    await pool.end();
  }
});
