import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { MfaService } from '../src/mfa-service.js';

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of input.replace(/=+$/u, '').toUpperCase()) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totp(secret, nowMs) {
  const counter = Math.floor(nowMs / 1000 / 30);
  const buffer = Buffer.alloc(8);
  let value = counter;
  for (let i = 7; i >= 0; i -= 1) {
    buffer[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

test('MFA enrollment requires a valid TOTP confirmation and returns recovery codes once', () => {
  const service = new MfaService();
  let now = 1_700_000_000_000;
  const pending = service.beginEnrollment('user-1');
  const confirmation = service.confirmEnrollment({ enrollmentId: pending.enrollmentId, code: totp(pending.secret, now), nowMs: now });
  assert.equal(confirmation.enabled, true);
  assert.equal(Array.isArray(confirmation.recoveryCodes), true);
  assert.equal(confirmation.recoveryCodes.length, 10);
  now += 30_000;
  assert.equal(service.verify({ userId: 'user-1', code: totp(pending.secret, now), nowMs: now }), true);
});

test('TOTP replay in the same time-step is rejected', () => {
  const service = new MfaService();
  const now = 1_700_000_000_000;
  const pending = service.beginEnrollment('user-2');
  service.confirmEnrollment({ enrollmentId: pending.enrollmentId, code: totp(pending.secret, now), nowMs: now });
  const code = totp(pending.secret, now + 1_000);
  assert.equal(service.verify({ userId: 'user-2', code, nowMs: now + 1_000 }), true);
  assert.throws(() => service.verify({ userId: 'user-2', code, nowMs: now + 2_000 }), /invalid_mfa_code/);
});

test('recovery code is one-time and exhausted code fails', () => {
  const service = new MfaService();
  const now = 1_700_000_000_000;
  const pending = service.beginEnrollment('user-3');
  const confirmation = service.confirmEnrollment({ enrollmentId: pending.enrollmentId, code: totp(pending.secret, now), nowMs: now });
  const recoveryCode = confirmation.recoveryCodes[0];
  assert.deepEqual(service.useRecoveryCode({ userId: 'user-3', code: recoveryCode }), { remaining: 9 });
  assert.throws(() => service.useRecoveryCode({ userId: 'user-3', code: recoveryCode }), /invalid_recovery_code/);
});

test('factor revocation immediately disables TOTP', () => {
  const service = new MfaService();
  const now = 1_700_000_000_000;
  const pending = service.beginEnrollment('user-4');
  service.confirmEnrollment({ enrollmentId: pending.enrollmentId, code: totp(pending.secret, now), nowMs: now });
  assert.equal(service.revoke('user-4'), true);
  assert.throws(() => service.verify({ userId: 'user-4', code: totp(pending.secret, now + 30_000), nowMs: now + 30_000 }), /mfa_not_enrolled/);
});
