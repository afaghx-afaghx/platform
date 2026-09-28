import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../package.json', import.meta.url));
const pg = require('pg');
import { PersistentAfxCore } from '../src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../src/repository.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('Persistent Core returns tenant-bound identity and RBAC aggregates', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  await core.migrate();

  const email = `aggregate-${Date.now()}@example.com`;
  const user = await core.createUser({ email, password: 'Correct Horse Battery Staple!' });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-aggregate-a', roles: ['aggregate-role'] });
  await core.grantRolePermission('aggregate-role', 'search.read');
  await core.grantRolePermission('aggregate-role', 'domain:product:read');

  try {
    assert.deepEqual(await core.getIdentity(user.id), {
      userId: user.id,
      email,
      status: 'active'
    });
    assert.deepEqual(await core.getMembershipAggregate(user.id, 'tenant-aggregate-a'), {
      userId: user.id,
      tenantId: 'tenant-aggregate-a',
      roles: ['aggregate-role'],
      permissions: ['domain:product:read', 'search.read'],
      status: 'active'
    });
    await assert.rejects(() => core.getMembershipAggregate(user.id, 'tenant-aggregate-b'), /membership_not_found/);
  } finally {
    await pool.end();
  }
});
