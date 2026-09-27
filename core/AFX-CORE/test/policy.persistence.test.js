import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('persistent Policy survives Core recreation and is audited', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    const audits = [];
    const core1 = new PersistentAfxCore({ repository, audit: async event => audits.push(event) });
    await core1.migrate();

    const email = `policy-persist-${Date.now()}@example.com`;
    const password = 'Correct Horse Battery Staple!';
    const user = await core1.createUser({ email, password });
    await core1.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
    await core1.grantRolePermission('admin', 'invoice.read');

    await core1.registerPolicy({
      id: `pol-${user.id}`,
      tenantId: 'tenant-a',
      name: 'invoice-read-allow',
      rules: [{
        subject: { roles: ['admin'] },
        resource: { type: 'invoice', tenantScoped: true },
        action: 'read',
        effect: 'allow',
        reason: 'ACCESS_ALLOWED'
      }],
      priority: 100
    });

    const core2 = new PersistentAfxCore({ repository: new PostgresAfxCoreRepository(pool), audit: async event => audits.push(event) });
    const context = await core2.authenticatePassword({ email, password, tenantId: 'tenant-a' });
    const principal = await core2.authenticateAccessToken(context.accessToken);
    const allowed = await core2.evaluatePolicy(principal, { type: 'invoice', id: 'inv-1', tenantId: 'tenant-a' }, 'read');
    assert.equal(allowed.effect, 'allow');
    assert.deepEqual(allowed.policyId, `pol-${user.id}`);

    await core2.registerPolicy({
      id: `pol-deny-${user.id}`,
      tenantId: 'tenant-a',
      name: 'invoice-read-deny',
      rules: [{
        subject: { userIds: [user.id] },
        resource: { type: 'invoice', tenantScoped: true },
        action: 'read',
        effect: 'deny',
        reason: 'ACCESS_REVOKED'
      }],
      priority: 200
    });

    const denied = await core2.evaluatePolicy(principal, { type: 'invoice', id: 'inv-1', tenantId: 'tenant-a' }, 'read');
    assert.equal(denied.effect, 'deny');
    assert.equal(denied.policyId, `pol-deny-${user.id}`);

    const auditRows = await pool.query(
      `SELECT count(*)::int AS count FROM afx_policy_audit WHERE tenant_id='tenant-a'`
    );
    assert.ok(auditRows.rows[0].count >= 2);
    assert.ok(audits.some(event => event.type === 'policy.decision' && event.effect === 'deny'));
  } finally {
    await pool.end();
  }
});
