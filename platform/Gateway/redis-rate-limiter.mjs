import { createHash, randomUUID } from 'node:crypto';

export const REDIS_SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local member = ARGV[4]
local cutoff = now - windowMs
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local count = redis.call('ZCARD', key)
if count >= maxRequests then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfter = windowMs
  if oldest[2] then
    retryAfter = math.max(1, tonumber(oldest[2]) + windowMs - now)
  end
  return {0, 0, retryAfter}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs + 1000)
return {1, maxRequests - count - 1, 0}
`;

export function createRedisRateLimiter({
  redis,
  prefix = 'afx:ratelimit:v1',
  now = () => Date.now(),
  requestId = randomUUID
} = {}) {
  if (!redis || typeof redis.command !== 'function') throw new Error('redis_client_required');
  if (typeof prefix !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(prefix)) throw new Error('redis_rate_limit_prefix_invalid');

  return Object.freeze({
    async consume({ key, windowMs, limit, id } = {}) {
      if (typeof key !== 'string' || !key) throw new Error('rate_limit_key_required');
      if (!Number.isSafeInteger(windowMs) || windowMs < 100 || windowMs > 86_400_000) throw new Error('rate_limit_window_invalid');
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000_000) throw new Error('rate_limit_limit_invalid');

      const digest = createHash('sha256').update(key, 'utf8').digest('hex');
      const redisKey = `${prefix}:${digest}`;
      const timestamp = now();
      const uniqueMember = `${timestamp}:${id || requestId()}`;
      const response = await redis.command(
        'EVAL',
        REDIS_SLIDING_WINDOW_SCRIPT,
        1,
        redisKey,
        timestamp,
        windowMs,
        limit,
        uniqueMember
      );
      if (!Array.isArray(response) || response.length !== 3) throw new Error('redis_rate_limit_response_invalid');
      const [allowed, remaining, retryAfterMs] = response.map(Number);
      if (![allowed, remaining, retryAfterMs].every(Number.isFinite)) throw new Error('redis_rate_limit_response_invalid');
      return {
        allowed: allowed === 1,
        remaining: Math.max(0, remaining),
        retryAfterMs: Math.max(0, retryAfterMs)
      };
    }
  });
}

export function createRedisStreamPublisher({ redis, streamKey = 'afx:events:v1', maxLength = 1_000_000 } = {}) {
  if (!redis || typeof redis.command !== 'function') throw new Error('redis_client_required');
  if (typeof streamKey !== 'string' || !/^[a-zA-Z0-9:_-]{1,160}$/.test(streamKey)) throw new Error('redis_stream_key_invalid');
  if (!Number.isSafeInteger(maxLength) || maxLength < 1000) throw new Error('redis_stream_max_length_invalid');

  return async function publish(event) {
    if (!event?.metadata?.eventId || !event.type) throw new Error('invalid_domain_event');
    const result = await redis.command(
      'XADD',
      streamKey,
      'MAXLEN',
      '~',
      maxLength,
      '*',
      'eventId',
      event.metadata.eventId,
      'type',
      event.type,
      'tenantId',
      event.metadata.tenantId || '',
      'payload',
      JSON.stringify(event)
    );
    if (typeof result !== 'string' || !result.includes('-')) throw new Error('redis_stream_publish_failed');
    return result;
  };
}
