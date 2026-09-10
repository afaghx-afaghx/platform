import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { PostgresRateLimitStore, credentialRateLimitKey, rateLimitPolicy } from '../src/rate-limit.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://afxcore:afxcore@localhost:5432/afxcore_test';

test('G01-17: distributed PostgreSQL rate limit allows exactly the shared quota under concurrency', async (t) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 16 });
  const store = new PostgresRateLimitStore(pool);
  t.after(async () => pool.end());

  await store.migrate();
  const key = `g01-17:${Date.now()}:${Math.random()}`;
  await store.reset(key);

  const limit = 5;
  const windowMs = 60_000;
  const attempts = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      store.consume({ key, limit, windowMs, now: Date.now() + index })
    )
  );

  assert.equal(attempts.filter((result) => result.allowed).length, limit);
  assert.equal(attempts.filter((result) => !result.allowed).length, 15);
  assert.ok(attempts.every((result) => result.remaining >= 0 && result.remaining <= limit));
  assert.ok(attempts.some((result) => result.retryAfterMs > 0));
});

test('G01-17: login/refresh/recovery dimensions are privacy-preserving and policy-backed', () => {
  const loginKey = credentialRateLimitKey({ action: 'login', ip: '203.0.113.5', account: 'User@Example.com', device: 'device-a' });
  const sameKey = credentialRateLimitKey({ action: 'login', ip: '203.0.113.5', account: 'user@example.com', device: 'device-a' });
  const differentDevice = credentialRateLimitKey({ action: 'login', ip: '203.0.113.5', account: 'user@example.com', device: 'device-b' });

  assert.equal(loginKey, sameKey);
  assert.notEqual(loginKey, differentDevice);
  assert.match(loginKey, /^login:[0-9a-f]{64}$/);
  assert.equal(rateLimitPolicy('login').limit, 5);
  assert.equal(rateLimitPolicy('refresh').limit, 10);
  assert.equal(rateLimitPolicy('recovery').windowMs, 15 * 60_000);
  assert.equal(loginKey.includes('user@example.com'), false);
});
