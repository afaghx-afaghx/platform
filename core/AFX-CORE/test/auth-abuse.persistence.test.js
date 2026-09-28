import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../src/repository.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('persistent login abuse control locks repeated failures and clears explicitly', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  await core.migrate();

  try {
    const email = `risk-${Date.now()}@example.com`;
    const ip = '203.0.113.25';
    for (let i = 0; i < 4; i += 1) {
      const result = await core.recordLoginFailure({ email, ip, maxFailures: 5, windowMs: 60_000, lockMs: 120_000 });
      assert.equal(result.locked, false);
    }
    const locked = await core.recordLoginFailure({ email, ip, maxFailures: 5, windowMs: 60_000, lockMs: 120_000 });
    assert.equal(locked.locked, true);

    const rebuilt = new PersistentAfxCore({ repository: new PostgresAfxCoreRepository(pool) });
    assert.equal((await rebuilt.checkLoginRisk({ email, ip })).locked, true);

    await rebuilt.clearLoginFailures({ email, ip });
    assert.equal((await rebuilt.checkLoginRisk({ email, ip })).locked, false);

    const rows = await pool.query('SELECT key, failed_count, locked_until FROM afx_auth_abuse');
    assert.equal(rows.rows.some(row => row.key === locked.key && Number(row.failed_count) === 5), false, 'clear must remove the abuse record');
  } finally {
    await pool.end();
  }
});
