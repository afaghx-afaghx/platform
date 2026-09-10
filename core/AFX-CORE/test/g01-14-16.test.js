import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';
import { generateTotpCode } from '../src/mfa.js';

const key = Buffer.alloc(32, 7);
function setup() {
  let now = 1_700_000_000_000;
  const delivered = [];
  const events = [];
  const core = new AfxCore({ clock: () => now, audit: e => events.push(e), mfaEncryptionKey: key, deliverRecoveryToken: p => delivered.push(p) });
  const user = core.createUser({ email: `security-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['member'] });
  return { core, user, delivered, events, setNow: value => { now = value; } };
}

test('G01-14 enrollment encrypts secret and returns one-time recovery material', () => {
  const { core, user, events } = setup();
  const result = core.beginMfaEnrollment({ userId: user.id });
  assert.equal(result.recoveryCodes.length, 10);
  assert.ok(result.recoveryCodes.every(code => /^[a-f0-9]{16}$/.test(code)));
  assert.equal(core.users.get(user.email).mfa.secretCiphertext.includes(result.secret), false);
  assert.ok(events.every(e => !JSON.stringify(e).includes(result.secret)));
});

test('G01-14 valid TOTP enables MFA and password login does not mint tokens early', () => {
  const { core, user } = setup();
  const enrollment = core.beginMfaEnrollment({ userId: user.id });
  core.confirmMfaEnrollment({ userId: user.id, code: generateTotpCode(enrollment.secret, 1_700_000_000_000) });
  const challenge = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  assert.equal(challenge.mfaRequired, true); assert.equal('accessToken' in challenge, false);
  const session = core.verifyMfaChallenge({ challengeId: challenge.challengeId, code: generateTotpCode(enrollment.secret, 1_700_000_000_000) });
  assert.ok(session.accessToken); assert.ok(session.refreshToken);
});

test('G01-14 challenge locks after failed attempts and recovery codes are single-use', () => {
  const { core, user } = setup();
  const enrollment = core.beginMfaEnrollment({ userId: user.id });
  core.confirmMfaEnrollment({ userId: user.id, code: generateTotpCode(enrollment.secret, 1_700_000_000_000) });
  const c = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  for (let i = 0; i < 5; i += 1) assert.throws(() => core.verifyMfaChallenge({ challengeId: c.challengeId, code: '000000' }), /invalid_mfa_code/);
  assert.throws(() => core.verifyMfaChallenge({ challengeId: c.challengeId, code: generateTotpCode(enrollment.secret, 1_700_000_000_000) }), /mfa_challenge_locked/);
  const second = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const session = core.verifyMfaChallenge({ challengeId: second.challengeId, recoveryCode: enrollment.recoveryCodes[0] });
  assert.ok(session.accessToken);
  const third = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  assert.throws(() => core.verifyMfaChallenge({ challengeId: third.challengeId, recoveryCode: enrollment.recoveryCodes[0] }), /invalid_mfa_code/);
});

test('G01-15 WebAuthn policy and lifecycle boundary exists', async () => {
  const { WebAuthnService } = await import('../src/webauthn.js');
  const service = new WebAuthnService({ rpId: 'afaghx.test', origins: ['https://login.afaghx.test'] });
  const registration = service.beginRegistration({ userId: 'usr-1', userName: 'u@afaghx.test', displayName: 'User' });
  assert.equal(registration.publicKey.rp.id, 'afaghx.test');
  assert.equal(registration.publicKey.authenticatorSelection.userVerification, 'required');
  assert.throws(() => new WebAuthnService({ rpId: 'afaghx.test', origins: ['https://evil.example'] }), /invalid_webauthn_origin_policy/);
});

test('G01-16 recovery is non-enumerating, one-time, expiring, session-revoking and MFA-aware', async () => {
  const { core, user, delivered, setNow } = setup();
  const old = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const unknown = core.requestPasswordRecovery({ email: 'missing@example.com' });
  const known = core.requestPasswordRecovery({ email: user.email });
  assert.deepEqual(unknown, { accepted: true }); assert.deepEqual(known, { accepted: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(delivered.length, 1); assert.ok(delivered[0].token);
  await core.completePasswordRecovery({ recoveryToken: delivered[0].token, newPassword: 'New Password 456!' });
  assert.throws(() => core.authenticateAccessToken(old.accessToken), /unauthorized/);
  assert.throws(() => core.completePasswordRecovery({ recoveryToken: delivered[0].token, newPassword: 'Another Password 789!' }), /invalid_recovery_token/);

  const enrollment = core.beginMfaEnrollment({ userId: user.id });
  core.confirmMfaEnrollment({ userId: user.id, code: generateTotpCode(enrollment.secret, 1_700_000_000_000) });
  const recovery = core.requestPasswordRecovery({ email: user.email });
  assert.deepEqual(recovery, { accepted: true });
  await new Promise(resolve => setImmediate(resolve));
  const raw = delivered.at(-1).token;
  assert.throws(() => core.completePasswordRecovery({ recoveryToken: raw, newPassword: 'Mfa Bypass 789!' }), /mfa_recovery_required/);
  await assert.rejects(Promise.resolve().then(() => core.completePasswordRecovery({ recoveryToken: raw, newPassword: 'Expired 123456!', mfaRecoveryCode: 'not-valid' })), /mfa_recovery_invalid/);
  setNow(1_700_000_000_000 + 16 * 60 * 1000);
  const expired = core.requestPasswordRecovery({ email: user.email });
  assert.deepEqual(expired, { accepted: true });
});
