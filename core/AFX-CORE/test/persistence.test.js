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

function requireDatabaseUrl() {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for G01-10 persistence tests');
}

test('G01-10: migration is idempotent and canonical', async (t) => {
  requireDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(() => pool.end());
  const repository = new PostgresAfxCoreRepository(pool);

  await repository.migrate();
  await repository.migrate();

  const { rows } = await pool.query(
    "SELECT version FROM afx_schema_migrations WHERE version='001_initial.sql'",
  );
  assert.deepEqual(rows.map((row) => row.version), ['001_initial.sql']);
});

test('G01-10: uniqueness constraints reject duplicate identity state', async (t) => {
  requireDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(() => pool.end());
  const core = await createTestCore(pool);
  const email = `unique-${Date.now()}@example.com`;
  const user = await core.createUser({ email, password: 'Correct Horse Battery Staple!' });

  await assert.rejects(
    () => core.createUser({ email, password: 'Correct Horse Battery Staple!' }),
    /duplicate key|user_exists/i,
  );

  await core.addMembership({ userId: user.id, tenantId: 'tenant-unique', roles: ['admin'] });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-unique', roles: ['admin'] });
  const membership = await core.repository.findMembership(user.id, 'tenant-unique');
  assert.deepEqual(membership.roles, ['admin']);
});

test('G01-10: PostgreSQL persistence survives service and connection restart', async (t) => {
  requireDatabaseUrl();
  const pool1 = new Pool({ connectionString: databaseUrl });
  t.after(() => pool1.end());

  const core1 = await createTestCore(pool1);
  const user = await core1.createUser({
    email: `restart-${Date.now()}@example.com`,
    password: 'Correct Horse Battery Staple!',
  });
  await core1.addMembership({ userId: user.id, tenantId: 'tenant-restart', roles: ['admin'] });
  await core1.grantRolePermission('admin', 'invoice.read');
  const tokens = await core1.authenticatePassword({
    email: user.email,
    password: 'Correct Horse Battery Staple!',
    tenantId: 'tenant-restart',
  });

  await pool1.end();

  const pool2 = new Pool({ connectionString: databaseUrl });
  t.after(() => pool2.end());
  const core2 = await createTestCore(pool2);
  const context = await core2.authenticateAccessToken(tokens.accessToken);
  assert.equal(context.userId, user.id);
  assert.equal(context.tenantId, 'tenant-restart');
  assert.equal(await core2.authorize(context, 'invoice.read', 'tenant-restart'), true);
});

test('G01-10: two independent service instances observe the same durable state', async (t) => {
  requireDatabaseUrl();
  const poolA = new Pool({ connectionString: databaseUrl, max: 4 });
  const poolB = new Pool({ connectionString: databaseUrl, max: 4 });
  t.after(async () => Promise.all([poolA.end(), poolB.end()]));

  const coreA = await createTestCore(poolA);
  const coreB = await createTestCore(poolB);
  const user = await coreA.createUser({
    email: `multi-${Date.now()}@example.com`,
    password: 'Correct Horse Battery Staple!',
  });
  await coreA.addMembership({ userId: user.id, tenantId: 'tenant-multi', roles: ['admin'] });
  const tokens = await coreA.authenticatePassword({
    email: user.email,
    password: 'Correct Horse Battery Staple!',
    tenantId: 'tenant-multi',
  });

  const observedUser = await coreB.repository.findUserById(user.id);
  const observedMembership = await coreB.repository.findMembership(user.id, 'tenant-multi');
  const context = await coreB.authenticateAccessToken(tokens.accessToken);

  assert.equal(observedUser.email, user.email);
  assert.equal(observedMembership.userId, user.id);
  assert.equal(context.sessionId, tokens.sessionId);
});

test('G01-10: persistent session revocation also revokes its refresh family', async (t) => {
  requireDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(() => pool.end());
  const core = await createTestCore(pool);
  const user = await core.createUser({
    email: `revoke-${Date.now()}@example.com`,
    password: 'Correct Horse Battery Staple!',
  });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-revoke' });
  const tokens = await core.authenticatePassword({
    email: user.email,
    password: 'Correct Horse Battery Staple!',
    tenantId: 'tenant-revoke',
  });

  await core.revokeSession(tokens.sessionId);
  await assert.rejects(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  await assert.rejects(() => core.refresh(tokens.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
});
