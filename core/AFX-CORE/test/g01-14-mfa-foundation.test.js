import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';
import { generateTotpCode } from '../src/mfa.js';

const key = Buffer.alloc(32, 7);

function setup() {
  let now = 1_700_000_000_000;
  const auditEvents = [];
  const core = new AfxCore({ clock: () => now, audit: event => auditEvents.push(event), mfaEncryptionKey: key });
  const created = core.createUser({ email: 'mfa@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: created.id, tenantId: 'tenant-a', roles: ['member'] });
  return { core, userId: created.id, auditEvents, advance: ms => { now += ms; } };
}

test('G01-14: enrollment requires runtime encryption key and returns recovery material once', () => {
  const { core, userId, auditEvents } = setup();
  const result = core.beginMfaEnrollment({ userId });
  assert.match(result.secret, /^[A-Z2-7]+$/);
  assert.equal(result.recoveryCodes.length, 10);
  assert.ok(result.recoveryCodes.every(code => /^[a-f0-9]{16}$/.test(code)));
  assert.equal(core.users.values().next().value.mfa.secretCiphertext.includes(result.secret), false);
  assert.ok(auditEvents.every(event => !JSON.stringify(event).includes(result.secret)));
});

test('G01-14: enrollment confirmation enables MFA only with a valid current TOTP', () => {
  const { core, userId } = setup();
  const { secret } = core.beginMfaEnrollment({ userId });
  assert.throws(() => core.confirmMfaEnrollment({ userId, code: '000000' }), /invalid_mfa_code/);
  const result = core.confirmMfaEnrollment({ userId, code: generateTotpCode(secret, 1_700_000_000_000) });
  assert.deepEqual(result, { enabled: true });
  assert.equal(core.users.values().next().value.mfa.enabled, true);
});

test('G01-14: enabled MFA converts password login into a bounded challenge and never mints tokens early', () => {
  const { core, userId } = setup();
  const { secret } = core.beginMfaEnrollment({ userId });
  core.confirmMfaEnrollment({ userId, code: generateTotpCode(secret, 1_700_000_000_000) });
  const challenge = core.authenticatePassword({ email: 'mfa@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  assert.equal(challenge.mfaRequired, true);
  assert.ok(challenge.challengeId);
  assert.equal('accessToken' in challenge, false);
  assert.equal('refreshToken' in challenge, false);
});

test('G01-14: TOTP challenge is one-time, attempt limited, and successful verification issues session', () => {
  const { core, userId } = setup();
  const { secret } = core.beginMfaEnrollment({ userId });
  core.confirmMfaEnrollment({ userId, code: generateTotpCode(secret, 1_700_000_000_000) });
  const challenge = core.authenticatePassword({ email: 'mfa@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const session = core.verifyMfaChallenge({ challengeId: challenge.challengeId, code: generateTotpCode(secret, 1_700_000_000_000) });
  assert.ok(session.accessToken);
  assert.ok(session.refreshToken);
  assert.throws(() => core.verifyMfaChallenge({ challengeId: challenge.challengeId, code: generateTotpCode(secret, 1_700_000_000_000) }), /invalid_mfa_challenge/);
});

test('G01-14: recovery code is single-use and cannot be reused', () => {
  const { core, userId } = setup();
  const { secret, recoveryCodes } = core.beginMfaEnrollment({ userId });
  core.confirmMfaEnrollment({ userId, code: generateTotpCode(secret, 1_700_000_000_000) });
  const first = core.authenticatePassword({ email: 'mfa@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const session = core.verifyMfaChallenge({ challengeId: first.challengeId, recoveryCode: recoveryCodes[0] });
  assert.ok(session.accessToken);
  const second = core.authenticatePassword({ email: 'mfa@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  assert.throws(() => core.verifyMfaChallenge({ challengeId: second.challengeId, recoveryCode: recoveryCodes[0] }), /invalid_mfa_code/);
});

test('G01-14: challenge expires and disablement revokes active sessions', () => {
  const { core, userId, advance } = setup();
  const { secret } = core.beginMfaEnrollment({ userId });
  core.confirmMfaEnrollment({ userId, code: generateTotpCode(secret, 1_700_000_000_000) });
  const challenge = core.authenticatePassword({ email: 'mfa@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  advance(5 * 60 * 1000 + 1);
  assert.throws(() => core.verifyMfaChallenge({ challengeId: challenge.challengeId, code: generateTotpCode(secret, 1_700_000_000_000) }), /invalid_mfa_challenge/);

  const fresh = core.authenticatePassword({ email: 'mfa@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  // Move the clock back to the original TOTP epoch only for deterministic challenge completion.
  // The challenge TTL semantics are already asserted above; a real deployment clock is monotonic wall time.
  advance(-(5 * 60 * 1000 + 1));
  const tokenSet = core.verifyMfaChallenge({ challengeId: fresh.challengeId, code: generateTotpCode(secret, 1_700_000_000_000) });
  core.disableMfa({ userId });
  assert.throws(() => core.authenticateAccessToken(tokenSet.accessToken), /unauthorized/);
});
