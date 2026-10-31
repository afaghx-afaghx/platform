import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPostgresDomainAdapter } from './postgres-adapter.mjs';
import { createPostgresIdempotencyStore, ensureDomainIdempotencyTable } from './postgres-idempotency.mjs';
import { createDomainRecord, DOMAIN_DEFINITIONS } from './domain-runtime.mjs';

const { default: pg } = await import('../../core/AFX-CORE/node_modules/pg/lib/index.js');
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

after(async () => { await pool.end(); });

const payloadFor = (domain, tenantId) => {
  if (domain === 'order') return { tenantId, customerId: 'cust_1' };
  if (domain === 'logistics') return { tenantId, orderId: 'ord_1' };
  if (domain === 'payment') return { tenantId, amount: 10, currency: 'USD' };
  return { tenantId, name: `${domain}-integration` };
};

test('all domain tables persist tenant-owned records across a fresh database connection', async () => {
  const fs = await import('node:fs/promises');
  const schema = await fs.readFile(new URL('./domain-schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) await pool.query(statement);

  const tenantId = `tenant_${randomUUID()}`;
  const otherTenantId = `tenant_${randomUUID()}`;
  const created = [];

  for (const [domain, definition] of Object.entries(DOMAIN_DEFINITIONS)) {
    const adapter = createPostgresDomainAdapter(pool, domain);
    const record = createDomainRecord(domain, payloadFor(domain, tenantId));
    await adapter.insert(definition.table, record);
    const sameTenant = await adapter.findById(definition.table, record.id, tenantId);
    const otherTenant = await adapter.findById(definition.table, record.id, otherTenantId);

    assert.equal(sameTenant.domain, domain);
    assert.equal(sameTenant.data.tenantId, tenantId);
    assert.equal(sameTenant.state, record.state);
    assert.equal(otherTenant, null);
    created.push({ domain, id: record.id, state: record.state });
  }
  assert.equal(created.length, 11);

  const scopedAdapter = createPostgresDomainAdapter(pool, 'product');
  await assert.rejects(
    scopedAdapter.insert('domain_product', { id: randomUUID(), state: 'draft', data: { name: 'missing tenant' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
    /tenant_context_required/
  );

  const freshPool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const item of created) {
      const adapter = createPostgresDomainAdapter(freshPool, item.domain);
      const record = await adapter.findById(DOMAIN_DEFINITIONS[item.domain].table, item.id, tenantId);
      assert.equal(record.domain, item.domain);
      assert.equal(record.state, item.state);
      assert.equal(record.data.tenantId, tenantId);
    }
  } finally {
    await freshPool.end();
  }
});

test('PostgreSQL idempotency serializes concurrent creates and detects key reuse', async () => {
  await ensureDomainIdempotencyTable(pool);
  const store = createPostgresIdempotencyStore(pool);
  const tenantId = `tenant_idem_${randomUUID()}`;
  const key = `concurrent-${randomUUID()}`;
  const requestHash = 'a'.repeat(64);
  let writes = 0;

  const execute = () => store.execute(tenantId, key, requestHash, async (client) => {
    writes += 1;
    await client.query('SELECT pg_sleep(0.05)');
    return { status: 201, body: { recordId: 'record_once', writes } };
  });

  const [first, second] = await Promise.all([execute(), execute()]);
  assert.equal(writes, 1);
  assert.equal(first.response.status, 201);
  assert.deepEqual(second.response, first.response);
  assert.equal([first.replayed, second.replayed].filter(Boolean).length, 1);

  await assert.rejects(
    store.execute(tenantId, key, 'b'.repeat(64), async () => ({ status: 201, body: {} })),
    (error) => error.message === 'idempotency_key_reused' && error.status === 409
  );
});
