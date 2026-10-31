function requireInput(tenantId, key, requestHash, operation) {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) throw new Error('tenant_context_required');
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,200}$/.test(key)) throw Object.assign(new Error('invalid_idempotency_key'), { status: 400 });
  if (typeof requestHash !== 'string' || !/^[0-9a-f]{64}$/.test(requestHash)) throw new Error('invalid_request_hash');
  if (typeof operation !== 'function') throw new Error('idempotency_operation_required');
}

export async function ensureDomainIdempotencyTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS domain_idempotency (
    tenant_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT,
    status INTEGER NOT NULL,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, idempotency_key)
  )`);
  await pool.query('ALTER TABLE domain_idempotency ADD COLUMN IF NOT EXISTS request_hash TEXT');
  await pool.query('ALTER TABLE domain_idempotency ALTER COLUMN response DROP NOT NULL');
  await pool.query(`
    DO $migration$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'domain_idempotency_request_hash_present'
          AND conrelid = 'domain_idempotency'::regclass
      ) THEN
        ALTER TABLE domain_idempotency
          ADD CONSTRAINT domain_idempotency_request_hash_present
          CHECK (request_hash IS NOT NULL AND request_hash ~ '^[0-9a-f]{64};
      END IF;
    END
    $migration$
  `);
}

export function createPostgresIdempotencyStore(pool) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('postgres_pool_required');

  return Object.freeze({
    async execute(tenantId, key, requestHash, operation) {
      requireInput(tenantId, key, requestHash, operation);
      const client = await pool.connect();
      let inTransaction = false;

      try {
        await client.query('BEGIN');
        inTransaction = true;

        const reservation = await client.query(
          `INSERT INTO domain_idempotency
             (tenant_id, idempotency_key, request_hash, status, response)
           VALUES ($1, $2, $3, 0, NULL)
           ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
           RETURNING tenant_id`,
          [tenantId, key, requestHash]
        );

        if (reservation.rowCount === 0) {
          const existingResult = await client.query(
            `SELECT request_hash, status, response
             FROM domain_idempotency
             WHERE tenant_id=$1 AND idempotency_key=$2
             FOR UPDATE`,
            [tenantId, key]
          );
          const existing = existingResult.rows[0];
          if (!existing) throw new Error('idempotency_state_unavailable');
          if (!existing.request_hash || existing.request_hash !== requestHash) {
            throw Object.assign(new Error('idempotency_key_reused'), { status: 409 });
          }
          if (existing.response === null) {
            throw Object.assign(new Error('idempotency_in_progress'), { status: 503 });
          }
          await client.query('COMMIT');
          inTransaction = false;
          return {
            response: { status: existing.status, body: existing.response },
            replayed: true
          };
        }

        const response = await operation(client);
        if (!response || !Number.isInteger(response.status) || response.status < 200 || response.status > 599 || response.body === undefined) {
          throw new Error('invalid_idempotency_response');
        }

        await client.query(
          `UPDATE domain_idempotency
           SET status=$3, response=$4
           WHERE tenant_id=$1 AND idempotency_key=$2`,
          [tenantId, key, response.status, JSON.stringify(response.body)]
        );
        await client.query('COMMIT');
        inTransaction = false;
        return { response, replayed: false };
      } catch (error) {
        if (inTransaction) {
          try { await client.query('ROLLBACK'); } catch { /* preserve the original failure */ }
        }
        throw error;
      } finally {
        client.release();
      }
    }
  });
}
) NOT VALID;
      END IF;
    END
    $migration$
  `);
}

export function createPostgresIdempotencyStore(pool) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('postgres_pool_required');

  return Object.freeze({
    async execute(tenantId, key, requestHash, operation) {
      requireInput(tenantId, key, requestHash, operation);
      const client = await pool.connect();
      let inTransaction = false;

      try {
        await client.query('BEGIN');
        inTransaction = true;

        const reservation = await client.query(
          `INSERT INTO domain_idempotency
             (tenant_id, idempotency_key, request_hash, status, response)
           VALUES ($1, $2, $3, 0, NULL)
           ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
           RETURNING tenant_id`,
          [tenantId, key, requestHash]
        );

        if (reservation.rowCount === 0) {
          const existingResult = await client.query(
            `SELECT request_hash, status, response
             FROM domain_idempotency
             WHERE tenant_id=$1 AND idempotency_key=$2
             FOR UPDATE`,
            [tenantId, key]
          );
          const existing = existingResult.rows[0];
          if (!existing) throw new Error('idempotency_state_unavailable');
          if (!existing.request_hash || existing.request_hash !== requestHash) {
            throw Object.assign(new Error('idempotency_key_reused'), { status: 409 });
          }
          if (existing.response === null) {
            throw Object.assign(new Error('idempotency_in_progress'), { status: 503 });
          }
          await client.query('COMMIT');
          inTransaction = false;
          return {
            response: { status: existing.status, body: existing.response },
            replayed: true
          };
        }

        const response = await operation(client);
        if (!response || !Number.isInteger(response.status) || response.status < 200 || response.status > 599 || response.body === undefined) {
          throw new Error('invalid_idempotency_response');
        }

        await client.query(
          `UPDATE domain_idempotency
           SET status=$3, response=$4
           WHERE tenant_id=$1 AND idempotency_key=$2`,
          [tenantId, key, response.status, JSON.stringify(response.body)]
        );
        await client.query('COMMIT');
        inTransaction = false;
        return { response, replayed: false };
      } catch (error) {
        if (inTransaction) {
          try { await client.query('ROLLBACK'); } catch { /* preserve the original failure */ }
        }
        throw error;
      } finally {
        client.release();
      }
    }
  });
}
