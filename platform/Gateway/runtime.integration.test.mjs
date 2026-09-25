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

async function request(base, path, { method='GET', body, token, headers={} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(new URL(path, base), {
      method,
      headers: {
        ...(payload ? {'content-type':'application/json','content-length':Buffer.byteLength(payload)} : {}),
        ...(token ? {authorization:`Bearer ${token}`} : {}),
        ...headers
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('canonical runtime Gateway -> PersistentAfxCore -> PostgreSQL proves auth, tenant isolation, and restart', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  await core.migrate();

  const email = `runtime-${Date.now()}@example.com`;
  const password = 'Correct Horse Battery Staple!';
  const user = await core.createUser({ email, password });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-b', roles: ['agent-admin'] });
  await core.grantRolePermission('agent-admin', 'agent.execute');
  await core.grantRolePermission('agent-admin', 'domain:product:read');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS domain_product (
      id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      name TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(
    \`INSERT INTO domain_product (id, state, name, payload)
      VALUES
        ('b2c-product-a', 'active', 'Copper Cable', $1::jsonb),
        ('b2c-product-draft', 'draft', 'Draft Cable', $2::jsonb),
        ('b2c-product-b', 'active', 'Other Tenant Cable', $3::jsonb)
      ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, name=EXCLUDED.name, payload=EXCLUDED.payload, updated_at=now()\`,
    [
      JSON.stringify({ tenantId: 'tenant-a', slug: 'copper-cable', category: 'electrical-equipment', description: 'Real Product A', price: 999, stock: 17, paymentState: 'captured', orderState: 'fulfilled' }),
      JSON.stringify({ tenantId: 'tenant-a' }),
      JSON.stringify({ tenantId: 'tenant-b' })
    ]
  );

  const runtime = createCanonicalRuntime({ core, pool, allowedOrigins: [] });
  const server = runtime.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const health = await request(base, '/v1/health/core');
    assert.equal(health.status, 200);
    assert.equal(health.body.runtime, 'Gateway -> PersistentAfxCore -> PostgreSQL');

    const missing = await request(base, '/v1/auth/context');
    assert.equal(missing.status, 401);

    const login = await request(base, '/v1/auth/login', { method:'POST', body:{email,password,tenantId:'tenant-a'} });
    assert.equal(login.status, 200);
    assert.equal(typeof login.body.accessToken, 'string');

    const context = await request(base, '/v1/auth/context', { token:login.body.accessToken });
    assert.equal(context.status, 200);
    assert.equal(context.body.userId, user.id);
    assert.equal(context.body.tenantId, 'tenant-a');
    assert.equal(await runtime.core.authorize(context.body, 'agent.execute', 'tenant-a'), true);

    const product = await request(base, '/v1/products/b2c-product-a', { token: login.body.accessToken });
    assert.equal(product.status, 200);
    assert.deepEqual(Object.keys(product.body).sort(), ['category','createdAt','description','id','name','requestId','slug','status','updatedAt'].sort());
    assert.deepEqual(product.body, {
      id: 'b2c-product-a',
      status: 'active',
      name: 'Copper Cable',
      slug: 'copper-cable',
      category: 'electrical-equipment',
      description: 'Real Product A',
      createdAt: product.body.createdAt,
      updatedAt: product.body.updatedAt,
      requestId: product.body.requestId
    });
    assert.equal('price' in product.body, false);
    assert.equal('stock' in product.body, false);
    assert.equal('paymentState' in product.body, false);
    assert.equal('orderState' in product.body, false);

    const draft = await request(base, '/v1/products/b2c-product-draft', { token: login.body.accessToken });
    assert.equal(draft.status, 404);

    const crossTenant = await request(base, '/v1/products/b2c-product-b', { token: login.body.accessToken });
    assert.equal(crossTenant.status, 404);

    const anonymous = await request(base, '/v1/products/b2c-product-a');
    assert.equal(anonymous.status, 401);

    const wrongTenantContext = { ...context.body, tenantId:'tenant-b' };
    assert.equal(await runtime.core.authorize(context.body, 'agent.execute', 'tenant-b'), false);
    assert.equal(wrongTenantContext.tenantId, 'tenant-b');

    server.close();
    const restarted = createCanonicalRuntime({ core:new PersistentAfxCore({ repository:new PostgresAfxCoreRepository(pool) }) });
    const server2 = restarted.createServer();
    await new Promise(resolve => server2.listen(0, '127.0.0.1', resolve));
    try {
      const address2 = server2.address();
      const reused = await request(`http://127.0.0.1:${address2.port}`, '/v1/auth/context', { token:login.body.accessToken });
      assert.equal(reused.status, 200);
      assert.equal(reused.body.userId, user.id);
    } finally {
      await new Promise(resolve => server2.close(resolve));
    }
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
