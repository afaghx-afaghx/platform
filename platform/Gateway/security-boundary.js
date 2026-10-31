import { randomUUID } from 'node:crypto';
import { createSecurityContext } from './security-context.js';

const DEFAULT_ALLOWED_ORIGINS = Object.freeze([]);
const DEFAULT_MAX_BODY_BYTES = 1_048_576;

export const SECURITY_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PROTECTED: 'protected'
});

export function createInMemoryRateLimiter({ now = () => Date.now() } = {}) {
  const counters = new Map();
  return Object.freeze({
    async consume({ key, windowMs, limit } = {}) {
      const current = now();
      const previous = counters.get(key);
      if (!previous || current - previous.startedAt >= windowMs) {
        counters.set(key, { startedAt: current, count: 1 });
        return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
      }
      previous.count += 1;
      if (previous.count > limit) {
        return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, windowMs - (current - previous.startedAt)) };
      }
      return { allowed: true, remaining: Math.max(0, limit - previous.count), retryAfterMs: 0 };
    }
  });
}

export function createSecurityBoundary({
  allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  rateLimit = { windowMs: 60_000, max: 120 },
  now = () => Date.now(),
  rateLimiter = createInMemoryRateLimiter({ now }),
} = {}) {
  const origins = new Set(allowedOrigins);

  async function consumeLimit(key, policy, requestId) {
    const windowMs = policy?.windowMs ?? rateLimit.windowMs;
    const limit = policy?.limit ?? policy?.max ?? rateLimit.max;
    return rateLimiter.consume({ key, windowMs, limit, id: requestId });
  }

  function corsHeaders(origin) {
    if (!origin) return {};
    if (!origins.has(origin)) return { 'x-afx-cors-denied': 'true' };
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

  async function authenticate(request, authenticateAccessToken) {
    const authorization = request.headers?.authorization ?? request.headers?.Authorization;
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
      return { ok: false, status: 401, code: 'missing_or_invalid_bearer_token' };
    }
    if (typeof authenticateAccessToken !== 'function') {
      return { ok: false, status: 503, code: 'security_boundary_misconfigured' };
    }

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    try {
      const principal = await authenticateAccessToken(token);
      return { ok: true, securityContext: createSecurityContext(principal) };
    } catch {
      return { ok: false, status: 401, code: 'invalid_access_token' };
    }
  }

  async function authorize(securityContext, { tenantId, permission, resourceState } = {}, authorizeAccess) {
    if (!securityContext) return { ok: false, status: 401, code: 'unauthenticated' };
    if (!tenantId || securityContext.tenantId !== tenantId) {
      return { ok: false, status: 403, code: 'tenant_context_denied' };
    }
    if (!permission) return { ok: true };
    if (typeof authorizeAccess !== 'function') {
      return { ok: false, status: 503, code: 'security_boundary_misconfigured' };
    }
    try {
      const allowed = await authorizeAccess(
        securityContext.userId,
        securityContext.tenantId,
        permission,
        resourceState
      );
      return allowed
        ? { ok: true }
        : { ok: false, status: 403, code: 'forbidden' };
    } catch {
      return { ok: false, status: 403, code: 'forbidden' };
    }
  }

  async function process(
    request,
    { authenticateAccessToken, authorizeAccess } = {},
    {
      visibility = SECURITY_VISIBILITY.PROTECTED,
      requiredPermission = null,
      rateLimitScope = 'default',
      ipRateLimit = null,
      principalRateLimit = null
    } = {}
  ) {
    const requestId = request.requestId ?? randomUUID();
    const origin = request.headers?.origin ?? request.headers?.Origin;
    const responseHeaders = { ...headers(origin), 'x-request-id': requestId };

    if (![SECURITY_VISIBILITY.PUBLIC, SECURITY_VISIBILITY.PROTECTED].includes(visibility)) {
      return { status: 503, headers: responseHeaders, body: { error: 'security_boundary_misconfigured', requestId } };
    }

    if (origin && !origins.has(origin)) {
      return { status: 403, headers: responseHeaders, body: { error: 'origin_not_allowed', requestId } };
    }

    const scope = rateLimitScope;
    let ipLimit;
    try {
      ipLimit = await consumeLimit(
        `ip:${request.rateLimitKey ?? request.ip ?? 'anonymous'}:${scope}`,
        ipRateLimit,
        requestId
      );
    } catch {
      return { status: 503, headers: responseHeaders, body: { error: 'rate_limit_unavailable', requestId } };
    }
    if (!ipLimit.allowed) {
      return {
        status: 429,
        headers: { ...responseHeaders, 'retry-after': String(Math.max(1, Math.ceil(ipLimit.retryAfterMs / 1000))), 'x-rate-limit-remaining': '0' },
        body: { error: 'rate_limited', requestId }
      };
    }

    if (request.bodyBytes > maxBodyBytes) {
      return { status: 413, headers: responseHeaders, body: { error: 'payload_too_large', requestId } };
    }

    if (visibility === SECURITY_VISIBILITY.PUBLIC) {
      return {
        status: 200,
        headers: { ...responseHeaders, 'x-rate-limit-remaining': String(ipLimit.remaining) },
        requestId,
        securityContext: null
      };
    }

    const authentication = await authenticate(request, authenticateAccessToken);
    if (!authentication.ok) {
      return {
        status: authentication.status,
        headers: { ...responseHeaders, 'x-rate-limit-remaining': String(ipLimit.remaining) },
        body: { error: authentication.code, requestId }
      };
    }

    let principalLimit;
    try {
      principalLimit = await consumeLimit(
        `principal:${authentication.securityContext.tenantId}:${authentication.securityContext.userId}:${scope}`,
        principalRateLimit,
        requestId
      );
    } catch {
      return { status: 503, headers: responseHeaders, body: { error: 'rate_limit_unavailable', requestId } };
    }
    if (!principalLimit.allowed) {
      return {
        status: 429,
        headers: { ...responseHeaders, 'retry-after': String(Math.max(1, Math.ceil(principalLimit.retryAfterMs / 1000))), 'x-rate-limit-remaining': '0' },
        body: { error: 'rate_limited', requestId }
      };
    }

    const authorization = await authorize(
      authentication.securityContext,
      {
        tenantId: authentication.securityContext.tenantId,
        permission: requiredPermission
      },
      authorizeAccess
    );
    if (!authorization.ok) {
      return {
        status: authorization.status,
        headers: { ...responseHeaders, 'x-rate-limit-remaining': String(ipLimit.remaining) },
        body: { error: authorization.code, requestId }
      };
    }

    return {
      status: 200,
      headers: { ...responseHeaders, 'x-rate-limit-remaining': String(ipLimit.remaining) },
      requestId,
      securityContext: authentication.securityContext
    };
  }

  return Object.freeze({ process, authenticate, authorize, headers });
}
