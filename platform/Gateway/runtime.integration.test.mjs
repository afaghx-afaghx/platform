import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const pg = require('pg');
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createCanonicalRuntime } from './runtime.mjs';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

async function request(base, path, { method = 'GET', body, token, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(new URL(path, base), {
      method,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        connection: 'close',
        ...headers
      }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('canonical runtime proves auth and tenant isolation', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    const core = new PersistentAfxCore({ repository });
    await core.migrate();

    const email = `runtime-${Date.now()}@example.com`;
    const password = 'Correct Horse Battery Staple!';
    const user = await core.createUser({ email, password });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-b', roles: ['agent-admin'] });
    await core.grantRolePermission('agent-admin', 'agent.execute');

    const runtime = createCanonicalRuntime({ core, allowedOrigins: [] });
    const server = runtime.createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address();
      const base = `http://127.0.0.1:${address.port}`;

      const health = await request(base, '/v1/health/core');
      assert.equal(health.status, 200);
      assert.equal(health.body.runtime, 'Gateway -> PersistentAfxCore -> PostgreSQL');

      const missing = await request(base, '/v1/auth/context');
      assert.equal(missing.status, 401);

      const login = await request(base, '/v1/auth/login', {
        method: 'POST',
        body: { email, password, tenantId: 'tenant-a' }
      });
      assert.equal(login.status, 200);
      assert.equal(typeof login.body.accessToken, 'string');

      const context = await request(base, '/v1/auth/context', { token: login.body.accessToken });
      assert.equal(context.status, 200);
      assert.equal(context.body.userId, user.id);
      assert.equal(context.body.tenantId, 'tenant-a');
      assert.equal(await runtime.core.authorize(context.body, 'agent.execute', 'tenant-a'), true);
      assert.equal(await runtime.core.authorize(context.body, 'agent.execute', 'tenant-b'), false);

      } finally {
      if (server.listening) await new Promise(resolve => server.close(resolve));
    }
  } finally {
    await new Promise(resolve => setImmediate(resolve));
    await pool.end();
  }
});
