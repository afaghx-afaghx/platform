import test from 'node:test';
import assert from 'node:assert/strict';
import { createCredentialRateLimiter } from '../src/credential-rate-limiter.js';

test('G01-17 allows attempts until the configured failure threshold', () => {
  let now = 1_000;
  const limiter = createCredentialRateLimiter({ maxAttempts: 3, windowMs: 60_000, blockMs: 30_000, now: () => now });
  assert.equal(limiter.check('login:alice').allowed, true);
  assert.equal(limiter.recordFailure('login:alice').remaining, 2);
  assert.equal(limiter.recordFailure('login:alice').remaining, 1);
  assert.equal(limiter.recordFailure('login:alice').allowed, false);
});

test('G01-17 blocks credential attempts for the configured block interval', () => {
  let now = 1_000;
  const limiter = createCredentialRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 10_000, now: () => now });
  limiter.recordFailure('login:alice');
  const blocked = limiter.recordFailure('login:alice');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 10_000);
  now += 9_999;
  assert.equal(limiter.check('login:alice').allowed, false);
  now += 1;
  assert.equal(limiter.check('login:alice').allowed, true);
});

test('G01-17 successful authentication clears the failure bucket', () => {
  const limiter = createCredentialRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 10_000 });
  limiter.recordFailure('login:alice');
  limiter.recordSuccess('login:alice');
  assert.deepEqual(limiter.check('login:alice'), { allowed: true, remaining: 2 });
});

test('G01-17 rate limits are keyed so one identity cannot consume another identity bucket', () => {
  const limiter = createCredentialRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 10_000 });
  limiter.recordFailure('login:alice');
  limiter.recordFailure('login:alice');
  assert.equal(limiter.check('login:alice').allowed, false);
  assert.equal(limiter.check('login:bob').allowed, true);
});

test('G01-17 rejects invalid rate-limit configuration and keys', () => {
  assert.throws(() => createCredentialRateLimiter({ maxAttempts: 0 }), /invalid_max_attempts/);
  assert.throws(() => createCredentialRateLimiter({ windowMs: 0 }), /invalid_window_ms/);
  assert.throws(() => createCredentialRateLimiter({ blockMs: 0 }), /invalid_block_ms/);
  const limiter = createCredentialRateLimiter();
  assert.throws(() => limiter.check(''), /rate_limit_key_required/);
});
