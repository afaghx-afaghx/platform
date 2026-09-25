export class PostgresRateLimiter {
  constructor(pool) {
    if (!pool) throw new Error('pool_required');
    this.pool = pool;
  }

  async migrate() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS afx_rate_limits (
      bucket_key TEXT PRIMARY KEY,
      window_started_at TIMESTAMPTZ NOT NULL,
      request_count INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);
    await this.pool.query('CREATE INDEX IF NOT EXISTS afx_rate_limits_updated_idx ON afx_rate_limits(updated_at);');
  }

  async check(key, { windowMs, max, now = Date.now() }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT window_started_at,request_count FROM afx_rate_limits WHERE bucket_key=$1 FOR UPDATE', [key]);
      const nowDate = new Date(now);
      if (!rows[0]) {
        await client.query('INSERT INTO afx_rate_limits(bucket_key,window_started_at,request_count,updated_at) VALUES($1,$2,1,now())', [key, nowDate]);
        await client.query('COMMIT');
        return { allowed: true, remaining: Math.max(0, max - 1) };
      }
      const startedAt = new Date(rows[0].window_started_at).getTime();
      if (now - startedAt >= windowMs) {
        await client.query('UPDATE afx_rate_limits SET window_started_at=$2,request_count=1,updated_at=now() WHERE bucket_key=$1', [key, nowDate]);
        await client.query('COMMIT');
        return { allowed: true, remaining: Math.max(0, max - 1) };
      }
      const next = Number(rows[0].request_count) + 1;
      if (next > max) {
        await client.query('UPDATE afx_rate_limits SET updated_at=now() WHERE bucket_key=$1', [key]);
        await client.query('COMMIT');
        return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - startedAt) };
      }
      await client.query('UPDATE afx_rate_limits SET request_count=$2,updated_at=now() WHERE bucket_key=$1', [key, next]);
      await client.query('COMMIT');
      return { allowed: true, remaining: max - next };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
