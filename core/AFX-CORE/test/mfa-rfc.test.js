import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyTotp } from '../src/mfa.js';

test('TOTP RFC 6238 SHA-1 6-digit vector at 59 seconds', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(verifyTotp({ secret, code: '287082', nowMs: 59_000, window: 0 }), true);
});

test('TOTP rejects wrong code and accepts one adjacent time-step', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(verifyTotp({ secret, code: '000000', nowMs: 59_000, window: 0 }), false);
});
