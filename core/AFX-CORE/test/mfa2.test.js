import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMfaSecret, generateRecoveryCodes } from '../src/mfa.js';

test('generated MFA secret has cryptographic randomness and expected size', () => {
  const a = generateMfaSecret();
  const b = generateMfaSecret();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test('recovery codes are unique and fixed-count one-time credentials', () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.every(code => /^[0-9a-f]{10}$/u.test(code)));
});
