import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import pg from 'pg';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createCanonicalRuntime } from './runtime.mjs';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

async function request(base, path, { method='GET', body, token } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(new URL(path, base), { method, headers: { ...(payload ? {'content-type':'application/json','content-length':Buffer.byteLength(payload)} : {}), ...(token ? {authorization:`Bearer ${token}`} : {}) } }, res => {
      const chunks=[]; res.on('data', c=>chunks.push(c)); res.on('end', ()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}));
    });
    req.on('error',reject); if(payload) req.write(payload); req.end();
  });
}

test('B2C-02 Product -> Offer -> Availability proves organization ownership and persistence', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  await core.migrate();

  await pool.query('CREATE TABLE IF NOT EXISTS domain_offer (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, product_id TEXT NOT NULL, organization_id TEXT NOT NULL, state TEXT NOT NULL, currency TEXT NOT NULL, price NUMERIC(20,4) NOT NULL, minimum_order_quantity NUMERIC(20,4), lead_time_days INTEGER, availability_policy TEXT, trade_terms JSONB, valid_from TIMESTAMPTZ, valid_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  await pool.query('CREATE TABLE IF NOT EXISTS domain_inventory (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, offer_id TEXT NOT NULL, state TEXT NOT NULL, available_quantity NUMERIC(20,4) NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())');

  const orgA = await core.createOrganization({ id:'org-b2c-a', tenantId:'tenant-a', name:'<MOCK> Seller A' });
  const orgB = await core.createOrganization({ id:'org-b2c-b', tenantId:'tenant-b', name:'<MOCK> Seller B' });
  await core.createUser({ email:'b2c-02@example.com', password:'Correct Horse Battery Staple!' });
  const user = await repository.findUserByEmail('b2c-02@example.com');
  await core.addMembership({ userId:user.id, tenantId:'tenant-a', roles:['b2c-reader'] });
  await core.grantRolePermission('b2c-reader','domain:offer:read');
  await core.grantRolePermission('b2c-reader','domain:inventory:read');

  await pool.query('INSERT INTO domain_offer (id,tenant_id,product_id,organization_id,state,currency,price,availability_policy,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now()),($9,$10,$11,$12,$13,$14,$15,$16,now(),now()) ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state,price=EXCLUDED.price,updated_at=now()',
    ['<MOCK> offer-a','tenant-a','b2c-product-a',orgA.id,'active','USD',12.50,'stock','<MOCK> offer-b','tenant-b','b2c-product-a',orgB.id,'active','USD',13.50,'stock']);
  await pool.query('INSERT INTO domain_inventory (id,tenant_id,offer_id,state,available_quantity,updated_at) VALUES ($1,$2,$3,$4,$5,now()),($6,$7,$8,$9,$10,now()) ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state,available_quantity=EXCLUDED.available_quantity,updated_at=now()',
    ['inv-a','tenant-a','<MOCK> offer-a','available',42,'inv-b','tenant-b','<MOCK> offer-b','available',77]);

  const runtime = createCanonicalRuntime({ core, pool, allowedOrigins:[] });
  const server=runtime.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address(); const base=`http://127.0.0.1:${address.port}`;
  try {
    const login=await request(base,'/v1/auth/login',{method:'POST',body:{email:'b2c-02@example.com',password:'Correct Horse Battery Staple!',tenantId:'tenant-a'}});
    assert.equal(login.status,200);

    const offers=await request(base,'/v1/products/b2c-product-a/offers',{token:login.body.accessToken});
    assert.equal(offers.status,200);
    assert.equal(offers.body.items.length,1);
    assert.deepEqual(offers.body.items[0].id,'<MOCK> offer-a');
    assert.equal(offers.body.items[0].organizationId,orgA.id);
    assert.equal(offers.body.items[0].price,12.5);

    const availability=await request(base,'/v1/offers/%3CMOCK%3E%20offer-a/availability',{token:login.body.accessToken});
    assert.equal(availability.status,200);
    assert.equal(availability.body.availableQuantity,42);

    const crossTenantAvailability=await request(base,'/v1/offers/%3CMOCK%3E%20offer-b/availability',{token:login.body.accessToken});
    assert.equal(crossTenantAvailability.status,404);

    await new Promise(resolve=>server.close(resolve));
    const restarted=createCanonicalRuntime({ core:new PersistentAfxCore({repository:new PostgresAfxCoreRepository(pool)}), pool, allowedOrigins:[] });
    const server2=restarted.createServer();
    await new Promise(resolve=>server2.listen(0,'127.0.0.1',resolve));
    try {
      const a2=server2.address();
      const persisted=await request(`http://127.0.0.1:${a2.port}`,'/v1/products/b2c-product-a/offers',{token:login.body.accessToken});
      assert.equal(persisted.status,200);
      assert.equal(persisted.body.items[0].price,12.5);
    } finally { await new Promise(resolve=>server2.close(resolve)); }
  } finally { if(server.listening) await new Promise(resolve=>server.close(resolve)); await pool.end(); }
});
