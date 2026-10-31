import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createPostgresOutboxStore, ensureOutboxSchema, createOutboxDispatcher } from './outbox.mjs';

const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const { Pool } = require('pg');
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 10 }) : null;

after(async () => { await pool?.end(); });

function event(tenantId = 'tenant-outbox-test') {
  const eventId = randomUUID();
  return {
    type: 'domain.record.created',
    version: 'v1',
    metadata: {
      eventId,
      occurredAt: new Date().toISOString(),
      contractVersion: 'v1',
      correlationId: eventId,
      producer: 'outbox.integration.test',
      tenantId
    },
    aggregate: { type: 'product', id: `product_${randomUUID()}` },
    payload: { state: 'draft' }
  };
}

test('PostgreSQL outbox append participates in the caller business transaction', { skip: !databaseUrl }, async () => {
  await ensureOutboxSchema(pool);
  const store = createPostgresOutboxStore(pool);
  const rolledBackEvent = event();
  const rollbackClient = await pool.connect();
  try {
    await rollbackClient.query('BEGIN');
    await store.append(rollbackClient, rolledBackEvent);
    await rollbackClient.query('ROLLBACK');
  } finally {
    rollbackClient.release();
  }
  assert.equal(await store.getStatus(rolledBackEvent.metadata.eventId), null);

  const committedEvent = event();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await store.append(client, committedEvent);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  const committed = await store.getStatus(committedEvent.metadata.eventId);
  assert.equal(committed.status, 'pending');
  assert.equal(Number(committed.attempts), 0);
});

test('two independent outbox workers claim tenant-scoped rows without duplicate ownership', { skip: !databaseUrl }, async () => {
  await ensureOutboxSchema(pool);
  const storeA = createPostgresOutboxStore(pool);
  const storeB = createPostgresOutboxStore(pool);
  const tenantId = `tenant-outbox-workers-${randomUUID()}`;
  const events = Array.from({ length: 30 }, () => event(tenantId));
  for (const item of events) await storeA.append(pool, item);

  const [a, b] = await Promise.all([
    storeA.claimBatch({ workerId: 'worker-a', batchSize: 20, tenantId }),
    storeB.claimBatch({ workerId: 'worker-b', batchSize: 20, tenantId })
  ]);
  const ids = [...a, ...b].map(item => item.eventId);
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
  assert.equal(a.every(item => item.workerId === 'worker-a'), true);
  assert.equal(b.every(item => item.workerId === 'worker-b'), true);

  await Promise.all([
    ...a.map(item => storeA.markPublished(item.eventId, 'worker-a')),
    ...b.map(item => storeB.markPublished(item.eventId, 'worker-b'))
  ]);
  for (const item of events) assert.equal((await storeA.getStatus(item.metadata.eventId)).status, 'published');
});

test('outbox dispatcher retries publication failure and later marks the event published', { skip: !databaseUrl }, async () => {
  await ensureOutboxSchema(pool);
  const store = createPostgresOutboxStore(pool);
  const item = event();
  await store.append(pool, item);

  const first = createOutboxDispatcher({
    store,
    workerId: `worker-fail-${randomUUID()}`,
    baseRetryDelayMs: 0,
    publish: async () => { throw Object.assign(new Error('private token must not be persisted'), { code: 'redis_unavailable' }); }
  });
  const failed = await first.dispatchOnce();
  assert.deepEqual(failed, { claimed: 1, published: 0, retried: 1, deadLettered: 0 });
  const pending = await store.getStatus(item.metadata.eventId);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.last_error_code, 'redis_unavailable');
  assert.equal(String(pending.last_error_code).includes('private token'), false);

  const second = createOutboxDispatcher({
    store,
    workerId: `worker-success-${randomUUID()}`,
    publish: async publishedEvent => assert.equal(publishedEvent.metadata.eventId, item.metadata.eventId)
  });
  const published = await second.dispatchOnce();
  assert.deepEqual(published, { claimed: 1, published: 1, retried: 0, deadLettered: 0 });
  assert.equal((await store.getStatus(item.metadata.eventId)).status, 'published');
});

test('outbox dispatcher sends exhausted events to dead letter', { skip: !databaseUrl }, async () => {
  await ensureOutboxSchema(pool);
  const store = createPostgresOutboxStore(pool);
  const item = event();
  await store.append(pool, item);
  const worker = createOutboxDispatcher({
    store,
    workerId: `worker-dlq-${randomUUID()}`,
    maxAttempts: 1,
    publish: async () => { throw Object.assign(new Error('unavailable'), { code: 'downstream_unavailable' }); }
  });
  const result = await worker.dispatchOnce();
  assert.deepEqual(result, { claimed: 1, published: 0, retried: 0, deadLettered: 1 });
  assert.equal((await store.getStatus(item.metadata.eventId)).status, 'dead_letter');
});
