import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('postgres migration registry is versioned and idempotent', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const first = await pool.query('SELECT id FROM afx_schema_migrations ORDER BY id');
  assert.deepEqual(first.rows.map((row) => row.id), [
    '001_core_identity_auth_baseline',
    '002_account_lifecycle_recovery',
  ]);

  await repository.migrate();
  const second = await pool.query('SELECT id FROM afx_schema_migrations ORDER BY id');
  assert.deepEqual(second.rows, first.rows);
  await pool.end();
});

test('postgres persistence survives service object recreation', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core1 = new PersistentAfxCore({ repository });
  const user = await core1.createUser({ email: `persist-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  await core1.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  await core1.grantRolePermission('admin', 'invoice.read');
  const tokens = await core1.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

  const core2 = new PersistentAfxCore({ repository });
  const context = await core2.authenticateAccessToken(tokens.accessToken);
  assert.equal(context.userId, user.id);
  assert.equal(await core2.authorize(context, 'invoice.read', 'tenant-a'), true);
  await pool.end();
});

test('concurrent refresh allows exactly one winner', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core = new PersistentAfxCore({ repository });
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
  await pool.end();
});
