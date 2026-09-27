import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('persistent policy survives Core object recreation and blocks authorized RBAC access', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    const core1 = new PersistentAfxCore({ repository });
    await core1.migrate();

    const email = `policy-persist-${Date.now()}@example.com`;
    const password = 'Correct Horse Battery Staple!';
    const user = await core1.createUser({ email, password });
    await core1.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
    await core1.grantRolePermission('admin', 'invoice.read');

    const before = await core1.evaluatePolicy(
      { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
      { permission: 'invoice.read', resourceTenantId: 'tenant-a' }
    );
    assert.equal(before.decision, 'allow');

    await core1.registerPolicy({
      id: `pol-${user.id}`,
      effect: 'deny',
      permission: 'invoice.read',
      tenantId: 'tenant-a',
      reason: 'tenant_invoice_restricted',
      priority: 100
    });

    const core2 = new PersistentAfxCore({ repository: new PostgresAfxCoreRepository(pool) });
    const context = await core2.authenticatePassword({ email, password, tenantId: 'tenant-a' });
    const principal = await core2.authenticateAccessToken(context.accessToken);

    const decision = await core2.evaluatePolicy(principal, {
      permission: 'invoice.read',
      resourceTenantId: 'tenant-a'
    });
    assert.equal(decision.decision, 'deny');
    assert.deepEqual(decision.policyIds, [`pol-${user.id}`]);
    assert.equal(await core2.authorize(principal, 'invoice.read', 'tenant-a'), false);
  } finally {
    await pool.end();
  }
});
