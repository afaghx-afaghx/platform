import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createCanonicalRuntime } from '../../../platform/Gateway/canonical-runtime.js';
import { tokenDigest } from '../src/security.js';

const databaseUrl = process.env.DATABASE_URL;

test('canonical Gateway -> PersistentAfxCore -> PostgreSQL runtime is end-to-end proven', { skip: !databaseUrl }, async () => {
  const runtime = createCanonicalRuntime({ databaseUrl, rateLimit: { windowMs: 60_000, max: 1000 } });
  let server;
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    server = await runtime.start(0);
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'Correct Horse Battery Staple!';
    await runtime.core.createUser({ email, password });
    const user = await runtime.repository.findUserByEmail(email);
    await runtime.core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });

    const login = await fetch(`${base}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId: 'tenant-a' }),
    });
    assert.equal(login.status, 200);
    const tokens = await login.json();
    assert.ok(tokens.accessToken);
    assert.ok(tokens.refreshToken);

    const storedSession = await pool.query('SELECT access_digest FROM afx_sessions WHERE id=$1', [tokens.sessionId]);
    assert.equal(storedSession.rowCount, 1);
    assert.equal(storedSession.rows[0].access_digest, tokenDigest(tokens.accessToken));
    assert.notEqual(storedSession.rows[0].access_digest, tokens.accessToken);

    const unauthenticated = await fetch(`${base}/v1/auth/context`);
    assert.equal(unauthenticated.status, 401);

    const context = await fetch(`${base}/v1/auth/context`, {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });
    assert.equal(context.status, 200);
    assert.equal((await context.json()).userId, user.id);

    const forbidden = await fetch(`${base}/v1/auth/context?tenantId=tenant-b`, {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });
    assert.equal(forbidden.status, 403);

    const rotated = await fetch(`${base}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    assert.equal(rotated.status, 200);
    const rotatedTokens = await rotated.json();
    assert.notEqual(rotatedTokens.accessToken, tokens.accessToken);
    assert.notEqual(rotatedTokens.refreshToken, tokens.refreshToken);

    await runtime.close(server);
    server = undefined;

    const restarted = createCanonicalRuntime({ databaseUrl, rateLimit: { windowMs: 60_000, max: 1000 } });
    try {
      const restartedServer = await restarted.start(0);
      const restartedPort = restartedServer.address().port;
      const afterRestart = await fetch(`http://127.0.0.1:${restartedPort}/v1/auth/context`, {
        headers: { authorization: `Bearer ${rotatedTokens.accessToken}` },
      });
      assert.equal(afterRestart.status, 200);
      const persistedContext = await afterRestart.json();
      assert.equal(persistedContext.userId, user.id);
      assert.equal(persistedContext.tenantId, 'tenant-a');
      await restarted.close(restartedServer);
    } catch (error) {
      await restarted.close();
      throw error;
    }
  } finally {
    if (server) await runtime.close(server);
    await pool.end();
  }
});
