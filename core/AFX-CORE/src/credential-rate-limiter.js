const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_BLOCK_MS = 15 * 60 * 1000;

function normalizeKey(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512) throw new TypeError('rate_limit_key_required');
  return value;
}

export function createCredentialRateLimiter({ maxAttempts = DEFAULT_MAX_ATTEMPTS, windowMs = DEFAULT_WINDOW_MS, blockMs = DEFAULT_BLOCK_MS, now = () => Date.now() } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new TypeError('invalid_max_attempts');
  if (!Number.isInteger(windowMs) || windowMs < 1) throw new TypeError('invalid_window_ms');
  if (!Number.isInteger(blockMs) || blockMs < 1) throw new TypeError('invalid_block_ms');
  if (typeof now !== 'function') throw new TypeError('invalid_clock');

  const buckets = new Map();

  function prune(timestamp) {
    for (const [key, state] of buckets) {
      if (state.blockedUntil <= timestamp && timestamp - state.windowStartedAt >= windowMs) buckets.delete(key);
    }
  }

  function check(rawKey) {
    const key = normalizeKey(rawKey);
    const timestamp = now();
    prune(timestamp);
    const state = buckets.get(key);
    if (!state) return { allowed: true, remaining: maxAttempts };
    if (state.blockedUntil > timestamp) return { allowed: false, remaining: 0, retryAfterMs: state.blockedUntil - timestamp };
    if (timestamp - state.windowStartedAt >= windowMs) {
      buckets.delete(key);
      return { allowed: true, remaining: maxAttempts };
    }
    return { allowed: state.failures < maxAttempts, remaining: Math.max(0, maxAttempts - state.failures) };
  }

  function recordFailure(rawKey) {
    const key = normalizeKey(rawKey);
    const timestamp = now();
    prune(timestamp);
    let state = buckets.get(key);
    if (!state || timestamp - state.windowStartedAt >= windowMs) {
      state = { failures: 0, windowStartedAt: timestamp, blockedUntil: 0 };
    }
    state.failures += 1;
    if (state.failures >= maxAttempts) state.blockedUntil = timestamp + blockMs;
    buckets.set(key, state);
    return check(key);
  }

  function recordSuccess(rawKey) {
    buckets.delete(normalizeKey(rawKey));
  }

  function clear() {
    buckets.clear();
  }

  return Object.freeze({ check, recordFailure, recordSuccess, clear });
}
