import { randomUUID } from 'node:crypto';

const DEFAULT_ALLOWED_ORIGINS = Object.freeze([]);
const DEFAULT_MAX_BODY_BYTES = 1_048_576;

export function createSecurityBoundary({
  allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  rateLimit = { windowMs: 60_000, max: 120 },
  now = () => Date.now(),
} = {}) {
  const origins = new Set(allowedOrigins);
  const counters = new Map();

  function rateLimitKey(request) {
    return request.rateLimitKey ?? request.ip ?? 'anonymous';
  }

  function checkRateLimit(request) {
    const key = rateLimitKey(request);
    const current = now();
    const previous = counters.get(key);
    if (!previous || current - previous.startedAt >= rateLimit.windowMs) {
      counters.set(key, { startedAt: current, count: 1 });
      return { allowed: true, remaining: Math.max(0, rateLimit.max - 1) };
    }
    previous.count += 1;
    if (previous.count > rateLimit.max) {
      return { allowed: false, remaining: 0, retryAfterMs: rateLimit.windowMs - (current - previous.startedAt) };
    }
    return { allowed: true, remaining: rateLimit.max - previous.count };
  }

  function corsHeaders(origin) {
    if (!origin) return {};
    if (!origins.has(origin)) {
      return { 'x-afx-cors-denied': 'true' };
    }
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      vary: 'Origin',
    };
  }

  function headers(origin) {
    return {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-site',
      ...corsHeaders(origin),
    };
  }

  function authenticate(request, authenticateAccessToken) {
    const authorization = request.headers?.authorization ?? request.headers?.Authorization;
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
      return { ok: false, status: 401, code: 'missing_or_invalid_bearer_token' };
    }
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    try {
      const principal = authenticateAccessToken(token);
      return { ok: true, principal };
    } catch {
      return { ok: false, status: 401, code: 'invalid_access_token' };
    }
  }

  function authorize(principal, { tenantId, permission, resourceState } = {}, authorizeAccess) {
    if (!principal) return { ok: false, status: 401, code: 'unauthenticated' };
    if (!tenantId || principal.tenantId !== tenantId) {
      return { ok: false, status: 403, code: 'tenant_context_denied' };
    }
    if (!permission) return { ok: false, status: 403, code: 'permission_required' };
    try {
      const allowed = authorizeAccess(principal.userId, tenantId, permission, resourceState);
      return allowed ? { ok: true } : { ok: false, status: 403, code: 'forbidden' };
    } catch {
      return { ok: false, status: 403, code: 'forbidden' };
    }
  }

  function process(request, authenticateAccessToken, authorizeAccess) {
    const requestId = request.requestId ?? randomUUID();
    const origin = request.headers?.origin ?? request.headers?.Origin;
    const responseHeaders = { ...headers(origin), 'x-request-id': requestId };
    if (origin && !origins.has(origin)) {
      return { status: 403, headers: responseHeaders, body: { error: 'origin_not_allowed', requestId } };
    }
    const limit = checkRateLimit(request);
    if (!limit.allowed) {
      return { status: 429, headers: { ...responseHeaders, 'retry-after': String(Math.ceil(limit.retryAfterMs / 1000)) }, body: { error: 'rate_limited', requestId } };
    }
    if (request.bodyBytes > maxBodyBytes) {
      return { status: 413, headers: responseHeaders, body: { error: 'payload_too_large', requestId } };
    }
    return { status: 200, headers: { ...responseHeaders, 'x-rate-limit-remaining': String(limit.remaining) }, requestId };
  }

  return Object.freeze({ process, authenticate, authorize, headers });
}
