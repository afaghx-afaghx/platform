import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { tokenDigest } from '../src/security.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('G01-12 concurrent refresh has exactly one winner and revokes the family on reuse', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 12 });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    const core = new PersistentAfxCore({ repository });
    await core.migrate();
    const user = await core.createUser({ email: `g01-12-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-g01-12', roles: ['member'] });
    const issued = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-g01-12' });
    const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => core.refresh(issued.refreshToken)));
    const winners = attempts.filter((r) => r.status === 'fulfilled');
    const losers = attempts.filter((r) => r.status === 'rejected');
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 7);
    for (const loser of losers) assert.match(loser.reason.message, /refresh_reuse_detected|invalid_refresh_token/);

    const familyRow = (await pool.query('SELECT family_id AS "familyId" FROM afx_refresh_tokens WHERE digest=$1', [tokenDigest(issued.refreshToken)])).rows[0];
    assert.ok(familyRow?.familyId);
    const refreshRows = (await pool.query('SELECT digest, used FROM afx_refresh_tokens WHERE family_id=$1 ORDER BY created_at', [familyRow.familyId])).rows;
    assert.equal(refreshRows.length, 2);
    assert.equal(refreshRows.filter((row) => row.used).length, 1);
    const familyState = (await pool.query('SELECT revoked, version FROM afx_refresh_families WHERE id=$1', [familyRow.familyId])).rows[0];
    assert.equal(familyState.revoked, true);
    assert.equal(Number(familyState.version), 1);
    const sessionState = (await pool.query('SELECT revoked FROM afx_sessions WHERE id=$1', [issued.sessionId])).rows[0];
    assert.equal(sessionState.revoked, true);
    await assert.rejects(() => core.refresh(winners[0].value.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
    await assert.rejects(() => core.authenticateAccessToken(winners[0].value.accessToken), /unauthorized/);
  } finally {
    await pool.end();
  }
});
