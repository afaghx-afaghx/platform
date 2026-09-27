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

test('canonical runtime Gateway -> PersistentAfxCore -> PostgreSQL proves auth, tenant isolation, policy, priority and restart', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const repository = new PostgresAfxCoreRepository(pool);
  const audits = [];
  const core = new PersistentAfxCore({ repository, audit: async event => audits.push(event) });
  await core.migrate();

  const email = `runtime-${Date.now()}@example.com`;
  const password = 'Correct Horse Battery Staple!';
  const user = await core.createUser({ email, password });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-b', roles: ['agent-admin'] });
  await core.grantRolePermission('agent-admin', 'agent.execute');
  await core.grantRolePermission('agent-admin', 'domain:product:read');
  await core.grantRolePermission('agent-admin', 'search.read');

  await core.registerPolicy({
    id: 'runtime-search-allow-a',
    tenantId: 'tenant-a',
    name: 'runtime-search-read-a',
    rules: [{
      subject: { roles: ['agent-admin'] },
      resource: { type: 'search', tenantScoped: true },
      action: 'read',
      effect: 'allow',
      reason: 'SEARCH_READ_ALLOWED_A'
    }],
    priority: 100
  });

  await core.registerPolicy({
    id: 'runtime-product-allow-a',
    tenantId: 'tenant-a',
    name: 'runtime-product-read-a',
    rules: [{
      subject: { roles: ['agent-admin'] },
      resource: { type: 'product', tenantScoped: true },
      action: 'read',
      effect: 'allow',
      reason: 'PRODUCT_READ_ALLOWED'
    }],
    priority: 100
  });

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
    `INSERT INTO domain_product (id, state, name, payload)
      VALUES
        ('b2c-product-a', 'active', 'Copper Cable', $1::jsonb),
        ('b2c-product-draft', 'draft', 'Draft Cable', $2::jsonb),
        ('b2c-product-b', 'active', 'Other Tenant Cable', $3::jsonb)
      ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, name=EXCLUDED.name, payload=EXCLUDED.payload, updated_at=now()`,
    [
      JSON.stringify({ tenantId: 'tenant-a', slug: 'copper-cable', category: 'electrical-equipment', description: 'Real Product A', price: 999, stock: 17, paymentState: 'captured', orderState: 'fulfilled' }),
      JSON.stringify({ tenantId: 'tenant-a' }),
      JSON.stringify({ tenantId: 'tenant-b' })
    ]
  );

  const searchCalls = [];
  const runtime = createCanonicalRuntime({
    core,
    pool,
    allowedOrigins: [],
    audit: async event => audits.push(event),
    search: {
      async search(input) {
        searchCalls.push(input);
        return {
          items: [{ id: 'search-a', tenant_id: input.securityContext.tenant.tenantId, title: 'Tenant Scoped Result' }],
          estimatedTotalHits: 1,
          processingTimeMs: 1,
          source: 'test-search'
        };
      }
    }
  });
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

    const loginA = await request(base, '/v1/auth/login', {
      method: 'POST',
      body: { email, password, tenantId: 'tenant-a' }
    });
    assert.equal(loginA.status, 200);
    assert.equal(typeof loginA.body.accessToken, 'string');

    const contextA = await request(base, '/v1/auth/context', {
      token: loginA.body.accessToken,
      headers: { 'x-tenant-id': 'tenant-b' }
    });
    assert.equal(contextA.status, 200);
    assert.equal(contextA.body.identity.userId, user.id);
    assert.equal(contextA.body.tenant.tenantId, 'tenant-a');
    assert.equal(contextA.body.tenant.resolvedFrom, 'session');
    assert.equal(contextA.body.authn.method, 'session');
    assert.equal(contextA.body.policy, null);
    assert.ok(audits.some(event => event.type === 'security.tenant_request_ignored' && event.source === 'header'));
    assert.equal(await runtime.core.authorize({ userId: user.id, tenantId: 'tenant-a' }, 'agent.execute', 'tenant-a'), true);

    const search = await request(base, '/v1/search?q=steel&category=metals&tenantId=tenant-b', {
      token: loginA.body.accessToken,
      headers: { 'x-tenant-id': 'tenant-b' }
    });
    assert.equal(search.status, 200, JSON.stringify(search.body));
    assert.equal(search.body.items[0].tenant_id, 'tenant-a');
    assert.equal(searchCalls.length, 1);
    assert.equal(searchCalls[0].securityContext.tenant.tenantId, 'tenant-a');
    assert.equal(searchCalls[0].securityContext.rbac.allowed, true);
    assert.equal(searchCalls[0].securityContext.policy.effect, 'allow');
    assert.ok(audits.some(event => event.type === 'security.tenant_request_ignored' && event.source === 'query'));

    const product = await request(base, '/v1/products/b2c-product-a', { token: loginA.body.accessToken });
    assert.equal(product.status, 200, JSON.stringify(product.body));
    assert.deepEqual(Object.keys(product.body).sort(), ['category','createdAt','description','id','name','requestId','slug','status','updatedAt'].sort());
    assert.equal(product.body.id, 'b2c-product-a');
    assert.equal(product.body.status, 'active');
    assert.equal(product.body.name, 'Copper Cable');
    assert.equal('price' in product.body, false);
    assert.equal('stock' in product.body, false);
    assert.equal('paymentState' in product.body, false);
    assert.equal('orderState' in product.body, false);

    const draft = await request(base, '/v1/products/b2c-product-draft', { token: loginA.body.accessToken });
    assert.equal(draft.status, 404);

    const crossTenant = await request(base, '/v1/products/b2c-product-b', { token: loginA.body.accessToken });
    assert.equal(crossTenant.status, 404);

    const anonymous = await request(base, '/v1/products/b2c-product-a');
    assert.equal(anonymous.status, 401);

    const loginB = await request(base, '/v1/auth/login', {
      method: 'POST',
      body: { email, password, tenantId: 'tenant-b' }
    });
    assert.equal(loginB.status, 200);

    const isolatedBeforeAllow = await request(base, '/v1/products/b2c-product-b', { token: loginB.body.accessToken });
    assert.equal(isolatedBeforeAllow.status, 403);
    assert.equal(isolatedBeforeAllow.body.error, 'POLICY_DENIED');
    assert.equal(isolatedBeforeAllow.body.reason, 'NO_POLICY_MATCHED');

    await core.registerPolicy({
      id: 'runtime-product-allow-b',
      tenantId: 'tenant-b',
      name: 'runtime-product-read-b',
      rules: [{
        subject: { roles: ['agent-admin'] },
        resource: { type: 'product', tenantScoped: true },
        action: 'read',
        effect: 'allow',
        reason: 'PRODUCT_READ_ALLOWED_B'
      }],
      priority: 100
    });

    const tenantBProduct = await request(base, '/v1/products/b2c-product-b', { token: loginB.body.accessToken });
    assert.equal(tenantBProduct.status, 200);
    assert.equal(tenantBProduct.body.id, 'b2c-product-b');

    const tenantBWrongProduct = await request(base, '/v1/products/b2c-product-a', { token: loginB.body.accessToken });
    assert.equal(tenantBWrongProduct.status, 404);

    await core.registerPolicy({
      id: 'runtime-product-deny-a',
      tenantId: 'tenant-a',
      name: 'runtime-product-restrict-a',
      rules: [{
        subject: { userIds: [user.id] },
        resource: { type: 'product', ids: ['b2c-product-a'], tenantScoped: true },
        action: 'read',
        effect: 'deny',
        reason: 'PRODUCT_RUNTIME_DENIED'
      }],
      priority: 200
    });

    const deniedByPolicy = await request(base, '/v1/products/b2c-product-a', { token: loginA.body.accessToken });
    assert.equal(deniedByPolicy.status, 403);
    assert.equal(deniedByPolicy.body.error, 'POLICY_DENIED');
    assert.equal(deniedByPolicy.body.reason, 'PRODUCT_RUNTIME_DENIED');

    assert.ok(audits.some(event => event.type === 'policy.decision' && event.effect === 'deny' && event.policyId === 'runtime-product-deny-a'));

    server.close();
    const restarted = createCanonicalRuntime({
      core: new PersistentAfxCore({
        repository: new PostgresAfxCoreRepository(pool),
        audit: async event => audits.push(event)
      }),
      pool,
      allowedOrigins: []
    });
    const server2 = restarted.createServer();
    await new Promise(resolve => server2.listen(0, '127.0.0.1', resolve));
    try {
      const address2 = server2.address();
      const reused = await request(`http://127.0.0.1:${address2.port}`, '/v1/auth/context', { token: loginA.body.accessToken });
      assert.equal(reused.status, 200);
      assert.equal(reused.body.identity.userId, user.id);
      assert.equal(reused.body.tenant.tenantId, 'tenant-a');

      const persistedDecision = await restarted.core.evaluatePolicy(
        { userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] },
        { type: 'product', id: 'b2c-product-a', tenantId: 'tenant-a' },
        'read'
      );
      assert.equal(persistedDecision.effect, 'deny');
      assert.equal(persistedDecision.policyId, 'runtime-product-deny-a');
    } finally {
      await new Promise(resolve => server2.close(resolve));
    }
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
