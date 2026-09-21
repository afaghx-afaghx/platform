import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('persistent refresh race has one winner and replay revokes the family', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    const core = new PersistentAfxCore({ repository });
    const user = await core.createUser({
      email: `refresh-race-${Date.now()}@example.com`,
      password: 'Correct Horse Battery Staple!'
    });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
    const initial = await core.authenticatePassword({
      email: user.email,
      password: 'Correct Horse Battery Staple!',
      tenantId: 'tenant-a'
    });

    const results = await Promise.allSettled([
      core.refresh(initial.refreshToken),
      core.refresh(initial.refreshToken)
    ]);
    const winners = results.filter(result => result.status === 'fulfilled');
    const losers = results.filter(result => result.status === 'rejected');

    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    assert.match(losers[0].reason.message, /refresh_reuse_detected|invalid_refresh_token/);
    await assert.rejects(
      () => core.authenticateAccessToken(winners[0].value.accessToken),
      /unauthorized/
    );
  } finally {
    await pool.end();
  }
});
