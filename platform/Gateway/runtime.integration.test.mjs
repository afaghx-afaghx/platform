import test from 'node:test';
import assert from 'node:assert/strict';
import { createGatewayRuntime } from './runtime.mjs';

const databaseUrl = process.env.DATABASE_URL;

async function request(base, path, options = {}) {
  const response = await fetch(base + path, options);
  const body = await response.json();
  return { response, body };
}

test('canonical runtime proves Gateway -> PersistentAfxCore -> PostgreSQL', { skip: !databaseUrl }, async () => {
  const runtime = createGatewayRuntime({ databaseUrl, port: 0, migrate: true });
  const userEmail = `gateway-runtime-${Date.now()}@example.com`;
  const password = 'Correct Horse Battery Staple!';
  try {
    const address = await runtime.start();
    const base = `http://${address.address}:${address.port}`;

    const health = await request(base, '/v1/health/core');
    assert.equal(health.response.status, 200);
    assert.equal(health.body.authority, 'AFX-CORE');
    assert.equal(health.body.persistence, 'PostgreSQL');

    const user = await runtime.core.createUser({ email: userEmail, password });
    await runtime.core.addMembership({ userId: user.id, tenantId: 'tenant-runtime', roles: ['admin'] });
    await runtime.core.grantRolePermission('admin', 'runtime.read');

    const login = await request(base, '/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(JSON.stringify({ email: userEmail, password, tenantId: 'tenant-runtime' }).length) },
      body: JSON.stringify({ email: userEmail, password, tenantId: 'tenant-runtime' }),
    });
    assert.equal(login.response.status, 200);
    assert.ok(login.body.accessToken);

    const unauthenticated = await request(base, '/v1/auth/context');
    assert.equal(unauthenticated.response.status, 401);

    const context = await request(base, '/v1/auth/context', {
      headers: { authorization: `Bearer ${login.body.accessToken}` },
    });
    assert.equal(context.response.status, 200);
    assert.equal(context.body.userId, user.id);
    assert.equal(context.body.tenantId, 'tenant-runtime');

    const allowed = await request(base, '/v1/auth/authorize?tenantId=tenant-runtime&permission=runtime.read', {
      headers: { authorization: `Bearer ${login.body.accessToken}` },
    });
    assert.equal(allowed.response.status, 200);
    assert.equal(allowed.body.allowed, true);

    const denied = await request(base, '/v1/auth/authorize?tenantId=other-tenant&permission=runtime.read', {
      headers: { authorization: `Bearer ${login.body.accessToken}` },
    });
    assert.equal(denied.response.status, 403);

    await runtime.stop();

    const runtimeAfterRestart = createGatewayRuntime({ databaseUrl, port: 0, migrate: false });
    try {
      const restartedAddress = await runtimeAfterRestart.start();
      const restartedBase = `http://${restartedAddress.address}:${restartedAddress.port}`;
      const persistedContext = await request(restartedBase, '/v1/auth/context', {
        headers: { authorization: `Bearer ${login.body.accessToken}` },
      });
      assert.equal(persistedContext.response.status, 200);
      assert.equal(persistedContext.body.userId, user.id);
      assert.equal(persistedContext.body.tenantId, 'tenant-runtime');
    } finally {
      await runtimeAfterRestart.stop();
    }
  } finally {
    if (runtime.server.listening) await runtime.stop();
  }
});
