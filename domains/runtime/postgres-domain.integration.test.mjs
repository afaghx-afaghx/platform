import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresDomainAdapter } from './postgres-adapter.mjs';
import { createDomainRecord, DOMAIN_DEFINITIONS } from './domain-runtime.mjs';

const { Pool } = await import('../../core/AFX-CORE/node_modules/pg/lib/index.js');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const payloadFor = (domain) => {
  if (domain === 'order') return { customerId: 'cust_1' };
  if (domain === 'logistics') return { orderId: 'ord_1' };
  if (domain === 'payment') return { amount: 10, currency: 'USD' };
  return { name: `${domain}-integration` };
};

test('all eleven domain tables persist records across a fresh database connection', async () => {
  const schema = await import('node:fs/promises').then((fs) => fs.readFile(new URL('./domain-schema.sql', import.meta.url), 'utf8'));
  for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) await pool.query(statement);

  const created = [];
  for (const [domain, definition] of Object.entries(DOMAIN_DEFINITIONS)) {
    const adapter = createPostgresDomainAdapter(pool, domain);
    const record = createDomainRecord(domain, payloadFor(domain));
    await adapter.insert(definition.table, record);
    created.push({ domain, id: record.id, state: record.state });
  }
  assert.equal(created.length, 11);

  await pool.end();
  const { Pool: FreshPool } = await import('../../core/AFX-CORE/node_modules/pg/lib/index.js');
  const freshPool = new FreshPool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const item of created) {
      const adapter = createPostgresDomainAdapter(freshPool, item.domain);
      const record = await adapter.findById(DOMAIN_DEFINITIONS[item.domain].table, item.id);
      assert.equal(record.domain, item.domain);
      assert.equal(record.state, item.state);
    }
  } finally {
    await freshPool.end();
  }
});
