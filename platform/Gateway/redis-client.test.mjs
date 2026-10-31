import test from 'node:test';
import assert from 'node:assert/strict';
import { createRedisClient } from './redis-client.mjs';

const redisUrl = process.env.REDIS_URL;

test('Redis RESP client supports authenticated connection, pipelined commands and pooled sockets', { skip: !redisUrl }, async () => {
  const redis = createRedisClient({ url: redisUrl, poolSize: 4 });
  const prefix = `afx:test:client:${process.pid}:${Date.now()}`;
  try {
    assert.equal(await redis.ping(), 'PONG');
    const values = await Promise.all(Array.from({ length: 100 }, async (_, index) => {
      const key = `${prefix}:${index}`;
      await redis.command('SET', key, String(index), 'PX', 10_000);
      return redis.command('GET', key);
    }));
    assert.deepEqual(values, Array.from({ length: 100 }, (_, index) => String(index)));
    await redis.command('DEL', ...Array.from({ length: 100 }, (_, index) => `${prefix}:${index}`));
  } finally {
    redis.close();
  }
});

test('Redis client rejects invalid URLs and pool sizing', () => {
  assert.throws(() => createRedisClient({ url: 'http://localhost:6379' }), /redis_url_invalid/);
  assert.throws(() => createRedisClient({ url: 'redis://localhost:6379', poolSize: 0 }), /redis_pool_size_invalid/);
});
