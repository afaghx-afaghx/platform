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
  if (domain === 'payment') return { tenantId, amount: '10.000000', currency: 'USD' };
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

test('PostgreSQL idempotency serializes concurrent writes, rejects key reuse and rolls back atomically', async () => {
  await ensureDomainIdempotencyTable(pool);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS domain_idempotency_test_writes (
      tenant_id TEXT NOT NULL,
      write_id TEXT NOT NULL,
      PRIMARY KEY (tenant_id, write_id)
    )
  `);
  const store = createPostgresIdempotencyStore(pool);
  const tenantId = `tenant_idem_${randomUUID()}`;
  const key = `concurrent-${randomUUID()}`;
  const writeId = randomUUID();
  const requestHash = 'a'.repeat(64);

  const execute = () => store.execute(tenantId, key, requestHash, async (client) => {
    await client.query(
      'INSERT INTO domain_idempotency_test_writes (tenant_id, write_id) VALUES ($1, $2)',
      [tenantId, writeId]
    );
    await client.query('SELECT pg_sleep(0.05)');
    return { status: 201, body: { writeId } };
  });

  const [first, second] = await Promise.all([execute(), execute()]);
  assert.equal(first.response.status, 201);
  assert.deepEqual(second.response, first.response);
  assert.equal([first.replayed, second.replayed].filter(Boolean).length, 1);
  const persisted = await pool.query(
    'SELECT count(*)::int AS count FROM domain_idempotency_test_writes WHERE tenant_id=$1 AND write_id=$2',
    [tenantId, writeId]
  );
  assert.equal(persisted.rows[0].count, 1);

  await assert.rejects(
    store.execute(tenantId, key, 'b'.repeat(64), async () => ({ status: 201, body: {} })),
    (error) => error.message === 'idempotency_key_reused' && error.status === 409
  );

  const rollbackKey = `rollback-${randomUUID()}`;
  const rollbackWriteId = randomUUID();
  await assert.rejects(
    store.execute(tenantId, rollbackKey, 'c'.repeat(64), async (client) => {
      await client.query(
        'INSERT INTO domain_idempotency_test_writes (tenant_id, write_id) VALUES ($1, $2)',
        [tenantId, rollbackWriteId]
      );
      throw new Error('simulated_domain_insert_failure');
    }),
    /simulated_domain_insert_failure/
  );
  const afterRollback = await pool.query(
    'SELECT count(*)::int AS count FROM domain_idempotency_test_writes WHERE tenant_id=$1 AND write_id=$2',
    [tenantId, rollbackWriteId]
  );
  assert.equal(afterRollback.rows[0].count, 0);

  const recovered = await store.execute(tenantId, rollbackKey, 'c'.repeat(64), async (client) => {
    await client.query(
      'INSERT INTO domain_idempotency_test_writes (tenant_id, write_id) VALUES ($1, $2)',
      [tenantId, rollbackWriteId]
    );
    return { status: 201, body: { recovered: true, writeId: rollbackWriteId } };
  });
  assert.equal(recovered.replayed, false);
  assert.deepEqual(recovered.response.body, { recovered: true, writeId: rollbackWriteId });
});

test('audit outbox failure rolls back the domain write and idempotency reservation', async () => {
  const fs = await import('node:fs/promises');
  const schema = await fs.readFile(new URL('./domain-schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) await pool.query(statement);
  const store = createPostgresIdempotencyStore(pool);
  const tenantId = `tenant_audit_${randomUUID()}`;
  const key = `audit-fail-${randomUUID()}`;
  const recordId = randomUUID();
  await assert.rejects(store.execute(tenantId, key, 'd'.repeat(64), async (client) => {
    await client.query(
      `INSERT INTO domain_product (id, tenant_id, state, name, payload) VALUES ($1, $2, 'draft', 'atomic-audit-test', $3::jsonb)`,
      [recordId, tenantId, JSON.stringify({ tenantId })]
    );
    // Simulate an audit/outbox persistence failure inside the same transaction.
    await client.query(
      'INSERT INTO domain_audit_outbox (event_type, tenant_id, aggregate_type, aggregate_id, payload) VALUES (NULL, $1, $2, $3, $4::jsonb)',
      [tenantId, 'product', recordId, JSON.stringify({ tenantId })]
    );
    return { status: 201, body: { id: recordId } };
  }), /null value in column|violates not-null constraint/i);
  const business = await pool.query('SELECT count(*)::int AS count FROM domain_product WHERE id=$1 AND tenant_id=$2', [recordId, tenantId]);
  const idem = await pool.query('SELECT count(*)::int AS count FROM domain_idempotency WHERE tenant_id=$1 AND idempotency_key=$2', [tenantId, key]);
  assert.equal(business.rows[0].count, 0);
  assert.equal(idem.rows[0].count, 0);
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
    const legacyIdempotency = await client.query(
      `SELECT request_hash, status, response FROM domain_idempotency
       WHERE tenant_id='tenant-known' AND idempotency_key='legacy-key-001'`
    );
    assert.equal(legacyIdempotency.rows[0].request_hash, null);
    assert.equal(legacyIdempotency.rows[0].status, 201);
    assert.deepEqual(legacyIdempotency.rows[0].response, { id: 'legacy-response' });

    await client.query('BEGIN');
    await assert.rejects(
      client.query(`INSERT INTO domain_product(id,payload) VALUES ('new-unowned','{}'::jsonb)`),
      /tenant_id_present|check constraint/i
    );
    await client.query('ROLLBACK');
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
    client.release();
  }
});
