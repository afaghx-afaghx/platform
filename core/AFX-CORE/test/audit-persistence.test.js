import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const coreRequire = createRequire(new URL('../package.json', import.meta.url));
const { Pool } = coreRequire('pg');
const databaseUrl = process.env.DATABASE_URL;

test('persistent audit is stored in PostgreSQL and strips protected fields', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    const core = new PersistentAfxCore({ repository });
    const email = `audit-${Date.now()}@example.com`;
    const password = 'Correct Horse Battery Staple!';
    const tenantId = `tenant-audit-${Date.now()}`;
    const user = await core.createUser({ email, password });
    await core.addMembership({ userId: user.id, tenantId, roles: ['user'] });
    await core.authenticatePassword({ email, password, tenantId });
    await core.audit({ type: 'security.test.sanitization', userId: user.id, tenantId, password, bearer: 'opaque-value', payload: { authorization: 'opaque-value', safe: 'ok' } });

    const events = await repository.listAuditEvents({ userId: user.id, tenantId, limit: 50 });
    assert.ok(events.length >= 3);
    const event = events.find(item => item.type === 'security.test.sanitization');
    assert.ok(event);
    assert.equal(event.payload.safe, 'ok');
    assert.equal('password' in event, false);
    assert.equal('bearer' in event, false);
    assert.equal('authorization' in event.payload, false);
  } finally {
    await pool.end();
  }
});
