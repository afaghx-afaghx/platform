import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { generateMfaSecret, generateRecoveryCodes, verifyTotp } from '../src/mfa.js';

const RFC_SECRET = 'JBSWY3DPEHPK3PXP';
const RFC_NOW_MS = 59_000;

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
  const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(binary % 1_000_000).padStart(6, '0');
}

test('TOTP verifies generated code inside configured step', () => {
  const code = totp(RFC_SECRET, RFC_NOW_MS);
  assert.equal(verifyTotp({ secret: RFC_SECRET, code, nowMs: RFC_NOW_MS, window: 0 }), true);
  assert.equal(typeof generateMfaSecret(), 'string');
});

test('generated MFA secret has cryptographic randomness and expected size', () => {
  const a = generateMfaSecret();
  const b = generateMfaSecret();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test('recovery codes are unique and 128-bit', () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.every(code => /^[0-9a-f]{32}$/u.test(code)));
});
