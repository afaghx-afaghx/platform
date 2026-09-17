export async function ensureDomainIdempotencyTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS domain_idempotency (
    tenant_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    status INTEGER NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, idempotency_key)
  )`);
}

export function createPostgresIdempotencyStore(pool) {
  return {
    async get(tenantId, key) {
      const { rows } = await pool.query(
        'SELECT status,response FROM domain_idempotency WHERE tenant_id=$1 AND idempotency_key=$2',
        [tenantId, key]
      );
      if (!rows[0]) return null;
      return { status: rows[0].status, body: rows[0].response };
    },
    async put(tenantId, key, response) {
      await pool.query(
        'INSERT INTO domain_idempotency (tenant_id,idempotency_key,status,response) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id,idempotency_key) DO NOTHING',
        [tenantId, key, response.status, JSON.stringify(response.body)]
      );
    }
  };
}
