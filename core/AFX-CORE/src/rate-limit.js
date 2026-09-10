import crypto from 'node:crypto';

const MAX_KEY_LENGTH = 255;

export function credentialRateLimitKey({ action, ip = '', account = '', device = '' }) {
  if (!action) throw new Error('rate_limit_action_required');
  const normalized = [action, ip.trim(), account.trim().toLowerCase(), device.trim()].join('|');
  return `${action}:${crypto.createHash('sha256').update(normalized).digest('hex')}`.slice(0, MAX_KEY_LENGTH);
}

export class RateLimitStore {
  async consume() { throw new Error('not_implemented'); }
  async reset() { throw new Error('not_implemented'); }
}

/**
 * Distributed rate limiter backed by the shared PostgreSQL database.
 * Every decision is serialized on the bucket row, so independent Node
 * processes/instances observe the same limit.
 */
export class PostgresRateLimitStore extends RateLimitStore {
  constructor(pool) {
    super();
    if (!pool?.query || !pool?.connect) throw new Error('postgres_pool_required');
    this.pool = pool;
  }

  async migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS afx_rate_limit_buckets (
        bucket_key TEXT PRIMARY KEY,
        window_started_at TIMESTAMPTZ NOT NULL,
        hit_count INTEGER NOT NULL CHECK (hit_count >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS afx_rate_limit_updated_idx
        ON afx_rate_limit_buckets(updated_at);
    `);
  }

  async consume({ key, limit, windowMs, now = Date.now() }) {
    if (!key || key.length > MAX_KEY_LENGTH) throw new Error('invalid_rate_limit_key');
    if (!Number.isInteger(limit) || limit < 1) throw new Error('invalid_rate_limit_limit');
    if (!Number.isInteger(windowMs) || windowMs < 1) throw new Error('invalid_rate_limit_window');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO afx_rate_limit_buckets(bucket_key, window_started_at, hit_count, updated_at)
         VALUES ($1, to_timestamp($2 / 1000.0), 0, now())
         ON CONFLICT (bucket_key) DO NOTHING`,
        [key, now]
      );

      const { rows } = await client.query(
        `SELECT bucket_key, EXTRACT(EPOCH FROM window_started_at) * 1000 AS window_started_ms,
                hit_count
           FROM afx_rate_limit_buckets
          WHERE bucket_key = $1
          FOR UPDATE`,
        [key]
      );
      const row = rows[0];
      const windowStarted = Number(row.window_started_ms);
      let count = Number(row.hit_count);
      let windowStart = windowStarted;

      if (now - windowStarted >= windowMs) {
        windowStart = now;
        count = 0;
      }

      const allowed = count < limit;
      if (allowed) count += 1;

      await client.query(
        `UPDATE afx_rate_limit_buckets
            SET window_started_at = to_timestamp($2 / 1000.0), hit_count = $3, updated_at = now()
          WHERE bucket_key = $1`,
        [key, windowStart, count]
      );
      await client.query('COMMIT');

      const resetAt = windowStart + windowMs;
      return {
        allowed,
        limit,
        remaining: Math.max(0, limit - count),
        retryAfterMs: allowed ? 0 : Math.max(1, resetAt - now),
        resetAt
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reset(key) {
    await this.pool.query('DELETE FROM afx_rate_limit_buckets WHERE bucket_key = $1', [key]);
  }
}

export function rateLimitPolicy(action) {
  const policies = {
    login: { limit: 5, windowMs: 60_000 },
    refresh: { limit: 10, windowMs: 60_000 },
    recovery: { limit: 5, windowMs: 15 * 60_000 }
  };
  const policy = policies[action];
  if (!policy) throw new Error('unknown_rate_limit_action');
  return policy;
}
