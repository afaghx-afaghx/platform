export class PostgresRateLimiter {
  constructor(pool, { table = 'afx_rate_limits' } = {}) { this.pool = pool; this.table = table; }
  async migrate() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS ${this.table} (
      key TEXT PRIMARY KEY, window_started_at TIMESTAMPTZ NOT NULL, count INTEGER NOT NULL
    )`);
  }
  async check(key, { windowMs = 60000, max = 120 } = {}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const now = Date.now();
      const { rows } = await client.query(`SELECT key, EXTRACT(EPOCH FROM window_started_at)*1000 AS started, count FROM ${this.table} WHERE key=$1 FOR UPDATE`, [key]);
      let started = rows[0] ? Number(rows[0].started) : now;
      let count = rows[0] ? Number(rows[0].count) : 0;
      if (now - started >= windowMs) { started = now; count = 0; }
      count += 1;
      await client.query(`INSERT INTO ${this.table}(key,window_started_at,count) VALUES($1,to_timestamp($2/1000.0),$3)
        ON CONFLICT(key) DO UPDATE SET window_started_at=EXCLUDED.window_started_at,count=EXCLUDED.count`, [key, started, count]);
      await client.query('COMMIT');
      return count <= max
        ? { allowed: true, remaining: Math.max(0, max-count) }
        : { allowed: false, remaining: 0, retryAfterMs: Math.max(1, windowMs-(now-started)) };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
}
