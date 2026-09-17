import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const coreRequire = createRequire(new URL('../package.json', import.meta.url));
const { Pool } = coreRequire('pg');
const databaseUrl = process.env.DATABASE_URL;

test('persistent audit is durable, tenant-scoped and protected', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    const core = new PersistentAfxCore({ repository });
    const email = `audit-${Date.now()}@example.com`;
    const password = 'Correct Horse Battery Staple!';
    const tenantId = `tenant-audit-${Date.now()}`;
    const user = await core.createUser({ email, password });
    await core.addMembership({ userId: user.id, tenantId, roles: ['audit-admin'] });
    await core.grantRolePermission('audit-admin', 'audit.read');
    await core.grantRolePermission('audit-admin', 'audit.retention.manage');
    const tokens = await core.authenticatePassword({ email, password, tenantId });
    const context = await core.authenticateAccessToken(tokens.accessToken);

    await core.audit({ type: 'security.test.sanitization', userId: user.id, tenantId, password, bearer: 'opaque-value', payload: { authorization: 'opaque-value', safe: 'ok' } });
    await core.audit({ type: 'security.test.old', userId: user.id, tenantId, occurredAt: Date.now() - 400 * 24 * 60 * 60 * 1000 });

    const events = await core.readAuditEvents({ context, tenantId, limit: 50 });
    assert.ok(events.length >= 4);
    const event = events.find(item => item.type === 'security.test.sanitization');
    assert.ok(event);
    assert.equal(event.payload.safe, 'ok');
    assert.equal('password' in event, false);
    assert.equal('bearer' in event, false);
    assert.equal('authorization' in event.payload, false);

    await assert.rejects(() => core.readAuditEvents({ context, tenantId: 'tenant-other', limit: 10 }), /forbidden/);
    const purged = await core.purgeAuditEvents({ context, tenantId, before: Date.now() - 365 * 24 * 60 * 60 * 1000 });
    assert.ok(purged >= 1);
    const remaining = await core.readAuditEvents({ context, tenantId, limit: 50 });
    assert.equal(remaining.some(item => item.type === 'security.test.old'), false);
  } finally {
    await pool.end();
  }
});
