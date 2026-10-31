import { randomUUID } from 'node:crypto';

function assertEvent(event) {
  if (!event || typeof event !== 'object'
    || typeof event.type !== 'string' || !event.type
    || typeof event.version !== 'string' || !event.version
    || !event.metadata?.eventId
    || !event.metadata?.occurredAt
    || !event.metadata?.contractVersion
    || !event.metadata?.correlationId
    || !event.metadata?.producer
    || !event.aggregate?.type
    || !event.aggregate?.id
    || !event.payload || typeof event.payload !== 'object') {
    throw new Error('invalid_domain_event');
  }
}

function rowToEvent(row) {
  return {
    eventId: row.event_id,
    tenantId: row.tenant_id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    event: row.event_payload,
    attempts: Number(row.attempts),
    status: row.status,
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : null
  };
}

export async function ensureOutboxSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS afx_outbox_events (
      event_id TEXT PRIMARY KEY,
      tenant_id TEXT,
      event_type TEXT NOT NULL,
      aggregate_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      event_payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','processing','published','dead_letter')),
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      locked_at TIMESTAMPTZ,
      lock_owner TEXT,
      last_error_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS afx_outbox_pending_idx
    ON afx_outbox_events (next_attempt_at, created_at)
    WHERE status IN ('pending','processing')
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS afx_outbox_tenant_created_idx
    ON afx_outbox_events (tenant_id, created_at)
  `);
}

export function createPostgresOutboxStore(pool) {
  if (!pool || typeof pool.query !== 'function') throw new Error('outbox_postgres_queryable_required');

  return Object.freeze({
    async append(queryable, event) {
      assertEvent(event);
      const target = queryable || pool;
      if (typeof target.query !== 'function') throw new Error('outbox_transaction_queryable_required');
      await target.query(
        `INSERT INTO afx_outbox_events
          (event_id, tenant_id, event_type, aggregate_type, aggregate_id, event_payload)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [
          event.metadata.eventId,
          event.metadata.tenantId ?? null,
          event.type,
          event.aggregate.type,
          event.aggregate.id,
          JSON.stringify(event)
        ]
      );
      return event.metadata.eventId;
    },

    async claimBatch({ workerId = randomUUID(), batchSize = 50, leaseMs = 30_000, tenantId = null } = {}) {
      if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error('outbox_batch_size_invalid');
      if (!Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > 600_000) throw new Error('outbox_lease_invalid');
      const { rows } = await pool.query(
        `WITH candidates AS (
           SELECT event_id
           FROM afx_outbox_events
           WHERE (
             (status = 'pending' AND next_attempt_at <= now())
             OR (status = 'processing' AND locked_at <= now() - ($2::text || ' milliseconds')::interval)
           )
             AND ($4::text IS NULL OR tenant_id = $4)
           ORDER BY created_at, event_id
           FOR UPDATE SKIP LOCKED
           LIMIT $1
         )
         UPDATE afx_outbox_events AS events
         SET status='processing',
             attempts=events.attempts+1,
             locked_at=now(),
             lock_owner=$3
         FROM candidates
         WHERE events.event_id=candidates.event_id
         RETURNING events.*`,
        [batchSize, leaseMs, workerId, tenantId]
      );
      return rows.map(row => ({ ...rowToEvent(row), workerId }));
    },

    async markPublished(eventId, workerId) {
      const result = await pool.query(
        `UPDATE afx_outbox_events
         SET status='published', published_at=now(), locked_at=NULL, lock_owner=NULL, last_error_code=NULL
         WHERE event_id=$1 AND status='processing' AND lock_owner=$2`,
        [eventId, workerId]
      );
      if (result.rowCount !== 1) throw new Error('outbox_lease_lost');
    },

    async markFailed(eventId, workerId, { attempts, maxAttempts = 12, retryDelayMs = 1000, errorCode = 'publish_failed' } = {}) {
      const status = attempts >= maxAttempts ? 'dead_letter' : 'pending';
      const safeCode = String(errorCode).replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 120) || 'publish_failed';
      const result = await pool.query(
        `UPDATE afx_outbox_events
         SET status=$3,
             next_attempt_at=now() + ($4::text || ' milliseconds')::interval,
             locked_at=NULL,
             lock_owner=NULL,
             last_error_code=$5
         WHERE event_id=$1 AND status='processing' AND lock_owner=$2`,
        [eventId, workerId, status, Math.max(0, retryDelayMs), safeCode]
      );
      if (result.rowCount !== 1) throw new Error('outbox_lease_lost');
      return status;
    },

    async getStatus(eventId) {
      const { rows } = await pool.query(
        'SELECT event_id,status,attempts,last_error_code,created_at,published_at FROM afx_outbox_events WHERE event_id=$1',
        [eventId]
      );
      return rows[0] ?? null;
    }
  });
}

export function createOutboxDispatcher({
  store,
  publish,
  workerId = `outbox_${randomUUID()}`,
  batchSize = 50,
  maxAttempts = 12,
  baseRetryDelayMs = 500,
  maxRetryDelayMs = 60_000,
  leaseMs = 30_000,
  tenantId = null
} = {}) {
  if (!store || typeof store.claimBatch !== 'function' || typeof store.markPublished !== 'function' || typeof store.markFailed !== 'function') {
    throw new Error('outbox_store_required');
  }
  if (typeof publish !== 'function') throw new Error('outbox_publisher_required');

  async function dispatchOnce() {
    const events = await store.claimBatch({ workerId, batchSize, leaseMs, tenantId });
    const result = { claimed: events.length, published: 0, retried: 0, deadLettered: 0 };
    for (const item of events) {
      try {
        await publish(item.event);
        await store.markPublished(item.eventId, workerId);
        result.published += 1;
      } catch (error) {
        const exponent = Math.min(Math.max(0, item.attempts - 1), 16);
        const retryDelayMs = Math.min(maxRetryDelayMs, baseRetryDelayMs * (2 ** exponent));
        const status = await store.markFailed(item.eventId, workerId, {
          attempts: item.attempts,
          maxAttempts,
          retryDelayMs,
          errorCode: error?.code || 'publish_failed'
        });
        if (status === 'dead_letter') result.deadLettered += 1;
        else result.retried += 1;
      }
    }
    return result;
  }

  async function run({ signal, idleMs = 500 } = {}) {
    if (!signal) throw new Error('outbox_abort_signal_required');
    while (!signal.aborted) {
      const result = await dispatchOnce();
      if (result.claimed === 0 && !signal.aborted) {
        await new Promise(resolve => {
          const done = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', done);
            resolve();
          };
          const timer = setTimeout(done, idleMs);
          timer.unref?.();
          signal.addEventListener('abort', done, { once: true });
        });
      }
    }
  }

  return Object.freeze({ workerId, dispatchOnce, run });
}
