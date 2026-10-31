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

test('tenant migration backfills known owners and quarantines unowned legacy rows', async () => {
  const fs = await import('node:fs/promises');
  const migration = await fs.readFile(new URL('./migrations/001-tenant-scoped-domain-persistence.sql', import.meta.url), 'utf8');
  const schemaName = `migration_${randomUUID().replaceAll('-', '')}`;
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
    const tables = Object.values(DOMAIN_DEFINITIONS).map((definition) => definition.table);
    for (const table of tables) {
      await client.query(`CREATE TABLE ${table} (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT '{}'::jsonb)`);
    }
    await client.query(`
      CREATE TABLE domain_idempotency (
        tenant_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        status INTEGER NOT NULL,
        response JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_id, idempotency_key)
      )
    `);
    await client.query(
      `INSERT INTO domain_product(id, payload) VALUES
        ('legacy-owned', '{"tenantId":"tenant-known","name":"Legacy product"}'::jsonb),
        ('legacy-unowned', '{"name":"Unassigned legacy product"}'::jsonb)`
    );
    await client.query(
      `INSERT INTO domain_idempotency(tenant_id,idempotency_key,status,response)
       VALUES ('tenant-known','legacy-key-001',201,'{"id":"legacy-response"}'::jsonb)`
    );

    await client.query(migration);

    const rows = await client.query(
      `SELECT id, tenant_id FROM domain_product ORDER BY id`
    );
    assert.deepEqual(rows.rows, [
      { id: 'legacy-owned', tenant_id: 'tenant-known' },
      { id: 'legacy-unowned', tenant_id: null }
    ]);

    await assert.rejects(
      client.query(`INSERT INTO domain_product(id,payload) VALUES ('new-unowned','{}'::jsonb)`),
      /tenant_id_present|check constraint/i
    );
    await client.query('ROLLBACK TO SAVEPOINT migration_constraint_check').catch(() => {});
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
    client.release();
  }
});
