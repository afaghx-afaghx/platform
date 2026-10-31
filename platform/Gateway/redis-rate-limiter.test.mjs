import test from 'node:test';
import assert from 'node:assert/strict';
import { createRedisClient } from './redis-client.mjs';
import { createRedisRateLimiter, createRedisStreamPublisher } from './redis-rate-limiter.mjs';

const redisUrl = process.env.REDIS_URL;

test('independent Gateway instances share an atomic Redis sliding-window quota', { skip: !redisUrl }, async () => {
  const redisA = createRedisClient({ url: redisUrl, poolSize: 2 });
  const redisB = createRedisClient({ url: redisUrl, poolSize: 2 });
  const limiterA = createRedisRateLimiter({ redis: redisA });
  const limiterB = createRedisRateLimiter({ redis: redisB });
  const key = `tenant:tenant-test:user:user-test:${Date.now()}`;
  try {
    const decisions = await Promise.all(Array.from({ length: 12 }, (_, index) =>
      (index % 2 ? limiterA : limiterB).consume({
        key,
        windowMs: 10_000,
        limit: 5,
        id: `request-${index}`
      })
    ));
    assert.equal(decisions.filter(item => item.allowed).length, 5);
    assert.equal(decisions.filter(item => !item.allowed).length, 7);
    assert.equal(decisions.filter(item => item.remaining === 0).length, 7);
    assert.ok(decisions.filter(item => !item.allowed).every(item => item.retryAfterMs > 0));
  } finally {
    redisA.close();
    redisB.close();
  }
});

test('Redis Streams publisher appends durable event identifiers and JSON payload', { skip: !redisUrl }, async () => {
  const redis = createRedisClient({ url: redisUrl });
  const streamKey = `afx:test:events:${Date.now()}`;
  const event = {
    type: 'domain.record.created',
    version: 'v1',
    metadata: { eventId: `event-${Date.now()}`, tenantId: 'tenant-1' },
    payload: { recordId: 'record-1' }
  };
  try {
    const publish = createRedisStreamPublisher({ redis, streamKey, maxLength: 1000 });
    const streamId = await publish(event);
    assert.match(streamId, /^\d+-\d+$/);
    const entries = await redis.command('XRANGE', streamKey, '-', '+');
    assert.equal(entries.length, 1);
    const fields = entries[0][1];
    assert.equal(fields[fields.indexOf('eventId') + 1], event.metadata.eventId);
    assert.deepEqual(JSON.parse(fields[fields.indexOf('payload') + 1]), event);
  } finally {
    await redis.command('DEL', streamKey).catch(() => {});
    redis.close();
  }
});
