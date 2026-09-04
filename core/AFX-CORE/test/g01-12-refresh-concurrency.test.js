import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { tokenDigest } from '../src/security.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('G01-12: concurrent reuse of one refresh token has exactly one winner and revokes the family', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 12 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();

  const core = new PersistentAfxCore({ repository });
  const user = await core.createUser({
    email: `g01-12-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    password: 'Correct Horse Battery Staple!',
  });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-g01-12' });
  const issued = await core.authenticatePassword({
    email: user.email,
    password: 'Correct Horse Battery Staple!',
    tenantId: 'tenant-g01-12',
  });

  const attempts = await Promise.allSettled(
    Array.from({ length: 8 }, () => core.refresh(issued.refreshToken)),
  );
  const winners = attempts.filter((result) => result.status === 'fulfilled');
  const losers = attempts.filter((result) => result.status === 'rejected');

  assert.equal(winners.length, 1, 'exactly one concurrent refresh may succeed');
  assert.equal(losers.length, 7, 'all competing refreshes must fail after rotation/reuse detection');
  for (const loser of losers) {
    assert.match(loser.reason.message, /refresh_reuse_detected|invalid_refresh_token/);
  }

  const oldDigest = tokenDigest(issued.refreshToken);
  const familyRow = (await pool.query(
    'SELECT family_id AS "familyId" FROM afx_refresh_tokens WHERE digest=$1',
    [oldDigest],
  )).rows[0];
  assert.ok(familyRow?.familyId, 'original refresh token must remain attributable to its family');

  const refreshRows = (await pool.query(
    'SELECT digest, used FROM afx_refresh_tokens WHERE family_id=$1 ORDER BY created_at',
    [familyRow.familyId],
  )).rows;
  assert.equal(refreshRows.length, 2, 'one consumed token and one successor must exist in the family');
  assert.equal(refreshRows.filter((row) => row.used).length, 1, 'only the original token may be marked used');

  const familyState = (await pool.query(
    'SELECT revoked, version FROM afx_refresh_families WHERE id=$1',
    [familyRow.familyId],
  )).rows[0];
  assert.equal(familyState.revoked, true, 'refresh-token reuse must revoke the entire family');
  assert.equal(familyState.version, 1, 'exactly one successful rotation may advance the family version');

  const sessionState = (await pool.query(
    'SELECT revoked FROM afx_sessions WHERE id=$1',
    [issued.sessionId],
  )).rows[0];
  assert.equal(sessionState.revoked, true, 'family revocation must revoke the associated session');

  await assert.rejects(
    () => core.refresh(winners[0].value.refreshToken),
    /refresh_reuse_detected|invalid_refresh_token/,
    'the single successor must not remain usable after concurrent reuse detection revokes its family',
  );

  await assert.rejects(
    () => core.authenticateAccessToken(winners[0].value.accessToken),
    /unauthorized/,
    'the access token minted by the winning refresh must be unusable after family revocation',
  );

  await pool.end();
});
