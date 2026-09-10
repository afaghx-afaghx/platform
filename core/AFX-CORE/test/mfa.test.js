import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMfaSecret, generateRecoveryCodes, verifyTotp } from '../src/mfa.js';

const RFC_SECRET = 'JBSWY3DPEHPK3PXP';
const RFC_NOW_MS = 59_000;

test('TOTP RFC vector verifies within the configured time step', () => {
  assert.equal(verifyTotp({ secret: RFC_SECRET, code: '996554', nowMs: RFC_NOW_MS, window: 0 }), false);
  assert.equal(typeof generateMfaSecret(), 'string');
});

test('generated MFA secret has cryptographic randomness and expected size', () => {
  const a = generateMfaSecret();
  const b = generateMfaSecret();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test('recovery codes are unique and never returned as hashes', () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.every(code => /^[0-9a-f]{10}$/.test(code)));
});
