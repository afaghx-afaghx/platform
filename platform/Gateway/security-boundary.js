import { randomUUID } from 'node:crypto';

const DEFAULT_ALLOWED_ORIGINS = Object.freeze([]);
const DEFAULT_MAX_BODY_BYTES = 1_048_576;

function freezeSecurityContext(context) {
  const frozen = {
    ...context,
    authn: Object.freeze({ ...context.authn }),
    identity: Object.freeze({ ...context.identity }),
    tenant: Object.freeze({ ...context.tenant }),
    membership: Object.freeze({
      ...context.membership,
      roles: Object.freeze([...context.membership.roles])
    }),
    rbac: Object.freeze({ ...context.rbac }),
    policy: context.policy
      ? Object.freeze({
          ...context.policy,
          reasons: Object.freeze([...context.policy.reasons]),
          policyIds: Object.freeze([...context.policy.policyIds])
        })
      : null,
    trace: Object.freeze({ ...context.trace })
  };
  return Object.freeze(frozen);
}

export function buildSecurityContext({ principal, requestId } = {}) {
  if (!principal?.userId || !principal?.tenantId || !principal?.sessionId) {
    throw new Error('invalid_security_principal');
  }

  return freezeSecurityContext({
    authn: {
      subject: principal.userId,
      method: 'session',
      authenticatedAt: principal.authenticatedAt ?? null,
      expiresAt: principal.expiresAt ?? null,
      sessionId: principal.sessionId
    },
    tenant: {
      tenantId: principal.tenantId,
      resolvedFrom: 'session'
    },
    membership: {
      userId: principal.userId,
      tenantId: principal.tenantId,
      roles: principal.roles ?? [],
      status: 'active'
    },
    identity: {
      userId: principal.userId
    },
    rbac: {
      evaluatedAt: null
    },
    policy: null,
    trace: {
      requestId: requestId ?? randomUUID(),
      gatewayVersion: null,
      coreVersion: null
    }
  });
}

export function createSecurityBoundary({
  allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  rateLimit = { windowMs: 60_000, max: 120 },
  now = () => Date.now(),
  audit = async () => {}
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

  async function authenticate(request, authenticateAccessToken) {
    const authorization = request.headers?.authorization ?? request.headers?.Authorization;
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
      return { ok: false, status: 401, code: 'missing_or_invalid_bearer_token' };
    }
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    try {
      const principal = await authenticateAccessToken(token);
      return principal?.userId && principal?.tenantId && principal?.sessionId
        ? { ok: true, principal }
        : { ok: false, status: 401, code: 'invalid_principal' };
    } catch {
      return { ok: false, status: 401, code: 'invalid_access_token' };
    }
  }

  async function authorize(principal, { tenantId, permission, resourceState } = {}, authorizeAccess) {
    if (!principal) return { ok: false, status: 401, code: 'unauthenticated' };
    if (!tenantId || principal.tenantId !== tenantId) {
      return { ok: false, status: 403, code: 'tenant_context_denied' };
    }
    if (!permission) return { ok: false, status: 403, code: 'permission_required' };
    try {
      const allowed = await authorizeAccess(principal.userId, tenantId, permission, resourceState);
      return allowed ? { ok: true } : { ok: false, status: 403, code: 'forbidden' };
    } catch {
      return { ok: false, status: 403, code: 'forbidden' };
    }
  }

  async function process(
    request,
    authenticateAccessToken,
    authorizeAccess,
    { requiresAuthentication = true } = {}
  ) {
    const requestId = request.requestId ?? randomUUID();
    const origin = request.headers?.origin ?? request.headers?.Origin;
    const responseHeaders = { ...headers(origin), 'x-request-id': requestId };

    if (origin && !origins.has(origin)) {
      return { status: 403, headers: responseHeaders, body: { error: 'origin_not_allowed', requestId } };
    }

    const limit = checkRateLimit(request);
    if (!limit.allowed) {
      return {
        status: 429,
        headers: { ...responseHeaders, 'retry-after': String(Math.ceil(limit.retryAfterMs / 1000)) },
        body: { error: 'rate_limited', requestId }
      };
    }

    if (request.bodyBytes > maxBodyBytes) {
      return { status: 413, headers: responseHeaders, body: { error: 'payload_too_large', requestId } };
    }

    if (!requiresAuthentication) {
      return { status: 200, headers: { ...responseHeaders, 'x-rate-limit-remaining': String(limit.remaining) }, requestId };
    }

    const auth = await authenticate(request, authenticateAccessToken);
    if (!auth.ok) {
      return {
        status: auth.status,
        headers: responseHeaders,
        body: { error: auth.code, requestId }
      };
    }

    const requestTenantId = request.queryTenantId ?? request.headers?.['x-tenant-id'];
    if (requestTenantId) {
      try {
        await audit({
          type: 'security.tenant_request_ignored',
          requestId,
          source: request.queryTenantId ? 'query' : 'header',
          requestedTenantId: requestTenantId,
          actualTenantId: auth.principal.tenantId
        });
      } catch {
        return {
          status: 500,
          headers: responseHeaders,
          body: { error: 'security_audit_failed', requestId }
        };
      }
    }

    let securityContext;
    try {
      securityContext = buildSecurityContext({ principal: auth.principal, requestId });
    } catch {
      return {
        status: 401,
        headers: responseHeaders,
        body: { error: 'invalid_security_context', requestId }
      };
    }

    try {
      Object.defineProperty(request, 'securityContext', {
        value: securityContext,
        writable: false,
        configurable: false,
        enumerable: true
      });
    } catch {
      return {
        status: 500,
        headers: responseHeaders,
        body: { error: 'security_context_propagation_failed', requestId }
      };
    }

    return {
      status: 200,
      headers: { ...responseHeaders, 'x-rate-limit-remaining': String(limit.remaining) },
      requestId,
      securityContext
    };
  }

  return Object.freeze({ process, authenticate, authorize, headers, buildSecurityContext });
}
