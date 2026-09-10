import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { MFA_PARAMETERS } from '../src/mfa.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const mfaKey = process.env.AFX_MFA_ENCRYPTION_KEY;

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0; let value = 0; const bytes = [];
  for (const char of input.toUpperCase()) {
    value = (value << 5) | alphabet.indexOf(char); bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

function totp(secret, nowMs) {
  const counter = Math.floor(nowMs / 1000 / MFA_PARAMETERS.totp.stepSeconds);
  const buffer = Buffer.alloc(8); let value = counter;
  for (let i = 7; i >= 0; i -= 1) { buffer[i] = value & 0xff; value = Math.floor(value / 256); }
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(binary % 1_000_000).padStart(6, '0');
}

async function createCore(pool) {
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  return new PersistentAfxCore({ repository, mfaEncryptionKey: mfaKey });
}

test('MFA persistence gates password authentication and survives core recreation', { skip: !databaseUrl || !mfaKey }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    let core = await createCore(pool);
    const user = await core.createUser({ email: `mfa-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });

    const before = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    assert.equal(typeof before.accessToken, 'string');

    const enrollment = await core.beginMfaEnrollment({ userId: user.id });
    const now = Date.now();
    const recovery = await core.confirmMfaEnrollment({ userId: user.id, secret: enrollment.secret, code: totp(enrollment.secret, now) });
    assert.equal(recovery.enabled, true);
    assert.equal(recovery.recoveryCodes.length, 10);

    core = await createCore(pool);
    const gated = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    assert.equal(gated.mfaRequired, true);
    assert.equal(typeof gated.challengeId, 'string');
    assert.equal(gated.accessToken, undefined);

    const issued = await core.completeMfaAuthentication({ challengeId: gated.challengeId, code: totp(enrollment.secret, core.clock()) });
    assert.equal(typeof issued.accessToken, 'string');

    const challengeReplay = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    await assert.rejects(() => core.completeMfaAuthentication({ challengeId: challengeReplay.challengeId, code: totp(enrollment.secret, core.clock()) }), /invalid_mfa_code/);
  } finally { await pool.end(); }
});

test('MFA recovery codes are one-time and factor revocation disables MFA verification', { skip: !databaseUrl || !mfaKey }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core = await createCore(pool);
    const user = await core.createUser({ email: `mfa-recovery-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const enrollment = await core.beginMfaEnrollment({ userId: user.id });
    const recovery = await core.confirmMfaEnrollment({ userId: user.id, secret: enrollment.secret, code: totp(enrollment.secret, Date.now()) });

    const firstChallenge = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const issued = await core.completeMfaAuthentication({ challengeId: firstChallenge.challengeId, recoveryCode: recovery.recoveryCodes[0] });
    assert.equal(typeof issued.accessToken, 'string');

    const secondChallenge = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    await assert.rejects(() => core.completeMfaAuthentication({ challengeId: secondChallenge.challengeId, recoveryCode: recovery.recoveryCodes[0] }), /invalid_mfa_code/);

    assert.equal(await core.revokeMfa(user.id), true);
    const afterRevoke = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    assert.equal(typeof afterRevoke.accessToken, 'string');
  } finally { await pool.end(); }
});

test('MFA challenge attempt limit and expiration are enforced', { skip: !databaseUrl || !mfaKey }, async () => {
  let now = 1_000_000;
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    const core = new PersistentAfxCore({ repository, mfaEncryptionKey: mfaKey, clock: () => now });
    const user = await core.createUser({ email: `mfa-abuse-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const enrollment = await core.beginMfaEnrollment({ userId: user.id });
    await core.confirmMfaEnrollment({ userId: user.id, secret: enrollment.secret, code: totp(enrollment.secret, now) });

    const challenge = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    for (let i = 0; i < MFA_PARAMETERS.maxAttempts; i += 1) await assert.rejects(() => core.completeMfaAuthentication({ challengeId: challenge.challengeId, code: '000000' }), /invalid_mfa_code/);
    await assert.rejects(() => core.completeMfaAuthentication({ challengeId: challenge.challengeId, code: totp(enrollment.secret, now) }), /invalid_mfa_challenge/);

    const expired = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    now += (MFA_PARAMETERS.challengeTtlSeconds + 1) * 1000;
    await assert.rejects(() => core.completeMfaAuthentication({ challengeId: expired.challengeId, code: totp(enrollment.secret, now) }), /invalid_mfa_challenge/);
  } finally { await pool.end(); }
});
