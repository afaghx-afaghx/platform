import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../package.json', import.meta.url));
const pg = require('pg');
import { PersistentAfxCore } from '../src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../src/repository.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('persistent security audit is durable, tenant-scoped and retainable', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  await core.migrate();
  const email = `audit-${Date.now()}@example.com`;

  try {
    const user = await core.createUser({ email, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['audit-role'] });
    await core.grantRolePermission('audit-role', 'audit.read');
    await core.authenticatePassword({ email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

    const tenantAEvents = await core.listSecurityAudit({ tenantId: 'tenant-a', limit: 20 });
    assert.ok(tenantAEvents.some(event => event.type === 'identity.user.created'));
    assert.ok(tenantAEvents.some(event => event.type === 'auth.login.succeeded'));
    assert.equal(tenantAEvents.some(event => JSON.stringify(event).includes('Correct Horse Battery Staple!')), false);

    const tenantBEvents = await core.listSecurityAudit({ tenantId: 'tenant-b', limit: 20 });
    assert.equal(tenantBEvents.length, 0);

    const oldEventId = `old-audit-${Date.now()}`;
    await repository.createSecurityAudit({
      id: oldEventId,
      type: 'security.synthetic.old',
      tenantId: 'tenant-a',
      event: { type: 'security.synthetic.old' },
      createdAt: '2020-01-01T00:00:00.000Z'
    });
    const deleted = await core.pruneSecurityAudit('2021-01-01T00:00:00.000Z');
    assert.ok(deleted >= 1);
    const after = await core.listSecurityAudit({ tenantId: 'tenant-a', limit: 100 });
    assert.equal(after.some(event => event.id === oldEventId), false);
  } finally {
    await pool.end();
  }
});
