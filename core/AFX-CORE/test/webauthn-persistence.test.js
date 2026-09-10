import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { generateKeyPairSync } from 'node:crypto';
import { PostgresAfxCoreRepository } from '../src/repository.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('G01-15 PostgreSQL persistence survives repository recreation', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  try {
    const repository1 = new PostgresAfxCoreRepository(pool);
    await repository1.migrate();

    const userId = `webauthn-persist-${Date.now()}`;
    await repository1.createUser({ id: userId, email: `${userId}@example.com`, passwordHash: 'hash', status: 'active' });

    const now = Date.now();
    const challengeId = `wch_${Date.now()}`;
    const challenge = `challenge_${Date.now()}`;
    await repository1.createWebAuthnChallenge({
      id: challengeId,
      userId,
      kind: 'authentication',
      challenge,
      rpId: 'login.afaghx.test',
      expiresAt: now + 300_000,
    });

    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const credentialId = `cred_${Date.now()}`;
    await repository1.createWebAuthnCredential({
      id: credentialId,
      userId,
      publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
      aaguid: Buffer.alloc(16).toString('base64url'),
      signCount: 7,
      backupEligible: true,
      backupState: false,
      revoked: false,
      createdAt: now,
    });

    const repository2 = new PostgresAfxCoreRepository(pool);
    const persistedChallenge = await repository2.getWebAuthnChallenge(challengeId);
    const persistedCredential = await repository2.findWebAuthnCredential(credentialId);

    assert.equal(persistedChallenge.userId, userId);
    assert.equal(persistedChallenge.kind, 'authentication');
    assert.equal(persistedChallenge.challenge, challenge);
    assert.equal(persistedChallenge.rpId, 'login.afaghx.test');
    assert.equal(persistedChallenge.consumed, false);
    assert.equal(persistedCredential.userId, userId);
    assert.equal(persistedCredential.signCount, 7);
    assert.equal(persistedCredential.backupEligible, true);
    assert.equal(persistedCredential.revoked, false);

    assert.equal(await repository2.updateWebAuthnSignCount({ id: credentialId, signCount: 8, now: now + 1000, backupState: true }), true);
    assert.equal(await repository2.updateWebAuthnSignCount({ id: credentialId, signCount: 8, now: now + 2000, backupState: true }), false);
    assert.equal(await repository2.consumeWebAuthnChallenge({ id: challengeId, now: now + 1000 }), true);
    assert.equal(await repository2.consumeWebAuthnChallenge({ id: challengeId, now: now + 1000 }), false);

    assert.equal(await repository2.revokeWebAuthnCredential(credentialId), true);
    const revoked = await repository2.findWebAuthnCredential(credentialId);
    assert.equal(revoked.revoked, true);
    assert.equal(revoked.signCount, 8);
  } finally {
    await pool.end();
  }
});
