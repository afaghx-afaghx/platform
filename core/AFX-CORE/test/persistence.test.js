import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('G01-10 PostgreSQL persistence survives service restart and multi-instance recreation', { skip: !databaseUrl }, async () => {
  const pool1 = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository1 = new PostgresAfxCoreRepository(pool1);
  await repository1.migrate();
  const core1 = new PersistentAfxCore({ repository: repository1 });

  const user = await core1.createUser({ email: `persist-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  await core1.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  await core1.grantRolePermission('admin', 'invoice.read');
  const tokens = await core1.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

  await pool1.end();

  const pool2 = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository2 = new PostgresAfxCoreRepository(pool2);
  const core2 = new PersistentAfxCore({ repository: repository2 });
  const context = await core2.authenticateAccessToken(tokens.accessToken);

  assert.equal(context.userId, user.id);
  assert.equal(context.tenantId, 'tenant-a');
  assert.equal(await core2.authorize(context, 'invoice.read', 'tenant-a'), true);
  await pool2.end();
});

test('G01-10 migration is idempotent', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  await repository.migrate();
  const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('afx_identities','afx_memberships','afx_sessions','afx_refresh_families','afx_refresh_tokens') ORDER BY table_name");
  assert.deepEqual(rows.map(row => row.table_name), [
    'afx_identities',
    'afx_memberships',
    'afx_refresh_families',
    'afx_refresh_tokens',
    'afx_sessions',
  ]);
  await pool.end();
});
