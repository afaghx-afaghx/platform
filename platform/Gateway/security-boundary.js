import { randomUUID } from 'node:crypto';

function freezeSecurityContext(context) {
  return Object.freeze({
    ...context,
    authn: Object.freeze({ ...context.authn }),
    identity: Object.freeze({ ...context.identity }),
    tenant: Object.freeze({ ...context.tenant }),
    membership: Object.freeze({
      ...context.membership,
      roles: Object.freeze([...context.membership.roles]),
      permissions: Object.freeze([...(context.membership.permissions ?? [])])
    }),
    rbac: Object.freeze({
      ...context.rbac,
      permissions: Object.freeze([...(context.rbac.permissions ?? context.membership.permissions ?? [])])
    }),
    policy: context.policy
      ? Object.freeze({
          ...context.policy,
          inputs: Object.freeze({
            ...context.policy.inputs,
            subject: Object.freeze({
              ...context.policy.inputs.subject,
              roles: Object.freeze([...context.policy.inputs.subject.roles])
            }),
            resource: Object.freeze({ ...context.policy.inputs.resource })
          })
        })
      : null,
    trace: Object.freeze({ ...context.trace })
  });
}

export function buildSecurityContext({
  principal,
  requestId,
  identity = null,
  membership = null,
  rbac = { allowed: null, permissions: [], evaluatedAt: null },
  policy = null
} = {}) {
  if (!principal?.userId || !principal?.tenantId || !principal?.sessionId) {
    throw new Error('invalid_security_principal');
  }
  const resolvedIdentity = identity ?? { userId: principal.userId };
  const resolvedMembership = membership ?? {
    userId: principal.userId,
    tenantId: principal.tenantId,
    roles: principal.roles ?? [],
    permissions: [],
    status: 'active'
  };
  if (resolvedIdentity.userId !== principal.userId) throw new Error('identity_principal_mismatch');
  if (resolvedMembership.userId !== principal.userId || resolvedMembership.tenantId !== principal.tenantId) {
    throw new Error('membership_principal_mismatch');
  }
  return freezeSecurityContext({
    authn: {
      subject: principal.userId,
      method: 'session',
      authenticatedAt: principal.authenticatedAt ?? null,
      expiresAt: principal.expiresAt ?? null,
      sessionId: principal.sessionId
    },
    tenant: { tenantId: principal.tenantId, resolvedFrom: 'session' },
    membership: {
      userId: resolvedMembership.userId,
      tenantId: resolvedMembership.tenantId,
      roles: resolvedMembership.roles ?? principal.roles ?? [],
      permissions: resolvedMembership.permissions ?? [],
      status: resolvedMembership.status
    },
    identity: {
      userId: resolvedIdentity.userId,
      ...(resolvedIdentity.email !== undefined ? { email: resolvedIdentity.email } : {}),
      ...(resolvedIdentity.status !== undefined ? { status: resolvedIdentity.status } : {})
    },
    rbac: {
      allowed: rbac.allowed ?? null,
      permissions: rbac.permissions ?? resolvedMembership.permissions ?? [],
      evaluatedAt: rbac.evaluatedAt ?? null
    },
    policy,
    trace: { requestId: requestId ?? randomUUID(), gatewayVersion: null, coreVersion: null }
  });
}

export function createSecurityBoundary({
  allowedOrigins = Object.freeze([]),
  maxBodyBytes = 1_048_576,
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
    if (!origins.has(origin)) return { 'x-afx-cors-denied': 'true' };
    return { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', vary: 'Origin' };
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
      ...corsHeaders(origin)
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
  async function process(
    request,
    authenticateAccessToken,
    authorizeAccess,
    evaluatePolicy,
    options = {}
  ) {
    if (typeof evaluatePolicy !== 'function') {
      options = evaluatePolicy ?? {};
      evaluatePolicy = null;
    }
    const { requiresAuthentication = true } = options;
    const requestId = request.requestId ?? randomUUID();
    const origin = request.headers?.origin ?? request.headers?.Origin;
    const responseHeaders = { ...headers(origin), 'x-request-id': requestId };

    if (origin && !origins.has(origin)) return { status: 403, headers: responseHeaders, body: { error: 'origin_not_allowed', requestId } };
    const limit = checkRateLimit(request);
    if (!limit.allowed) {
      return { status: 429, headers: { ...responseHeaders, 'retry-after': String(Math.ceil(limit.retryAfterMs / 1000)) }, body: { error: 'rate_limited', requestId } };
    }
    if (request.bodyBytes > maxBodyBytes) return { status: 413, headers: responseHeaders, body: { error: 'payload_too_large', requestId } };
    if (!requiresAuthentication) return { status: 200, headers: { ...responseHeaders, 'x-rate-limit-remaining': String(limit.remaining) }, requestId };

    const auth = await authenticate(request, authenticateAccessToken);
    if (!auth.ok) return { status: auth.status, headers: responseHeaders, body: { error: auth.code, requestId } };

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
        return { status: 500, headers: responseHeaders, body: { error: 'security_audit_failed', requestId } };
      }
    }

    let identity = { userId: auth.principal.userId };
    let membership = {
      userId: auth.principal.userId,
      tenantId: auth.principal.tenantId,
      roles: auth.principal.roles ?? [],
      permissions: [],
      status: 'active'
    };

    try {
      if (typeof options.resolveIdentity === 'function') {
        identity = await options.resolveIdentity(auth.principal.userId);
      }
      if (typeof options.resolveMembershipAggregate === 'function') {
        membership = await options.resolveMembershipAggregate(auth.principal.userId, auth.principal.tenantId);
      }
    } catch {
      return {
        status: 500,
        headers: responseHeaders,
        body: { error: 'security_context_resolution_failed', requestId }
      };
    }

    let securityContext = buildSecurityContext({ principal: auth.principal, requestId, identity, membership });
    const policyRequest = request.policy;

    if (policyRequest) {
      const tenantId = securityContext.tenant.tenantId;
      const permission = policyRequest.permission;
      const resource = Object.freeze({
        ...policyRequest.resource,
        tenantId
      });
      const action = policyRequest.action;

      let rbacAllowed = false;
      try {
        rbacAllowed = await authorizeAccess(auth.principal.userId, tenantId, permission, resource.state);
      } catch {
        rbacAllowed = false;
      }

      securityContext = buildSecurityContext({
        principal: auth.principal,
        requestId,
        identity,
        membership,
        rbac: {
          allowed: rbacAllowed,
          permissions: membership.permissions ?? [],
          evaluatedAt: new Date(now()).toISOString()
        }
      });

      if (!rbacAllowed) {
        await audit({ type: 'security.rbac.denied', requestId, tenantId, permission });
        return {
          status: 403,
          headers: responseHeaders,
          body: { error: 'forbidden', reason: 'RBAC_DENIED', requestId }
        };
      }

      let policyDecision;
      try {
        policyDecision = await evaluatePolicy(securityContext, resource, action);
      } catch {
        return {
          status: 403,
          headers: responseHeaders,
          body: { error: 'POLICY_DENIED', reason: 'POLICY_EVALUATION_FAILED', requestId }
        };
      }

      securityContext = buildSecurityContext({
        principal: auth.principal,
        requestId,
        identity,
        membership,
        rbac: securityContext.rbac,
        policy: policyDecision
      });

      try {
        await audit({
          type: 'policy.decision',
          requestId,
          tenantId,
          policyId: policyDecision.policyId,
          effect: policyDecision.effect,
          reason: policyDecision.reason,
          evaluatedAt: policyDecision.evaluatedAt
        });
      } catch {
        return { status: 500, headers: responseHeaders, body: { error: 'security_audit_failed', requestId } };
      }

      if (policyDecision.effect === 'deny' || policyDecision.effect === 'abstain') {
        return {
          status: 403,
          headers: responseHeaders,
          body: { error: 'POLICY_DENIED', reason: policyDecision.reason, requestId }
        };
      }
    }

    try {
      Object.defineProperty(request, 'securityContext', {
        value: securityContext,
        writable: false,
        configurable: false,
        enumerable: true
      });
    } catch {
      return { status: 500, headers: responseHeaders, body: { error: 'security_context_propagation_failed', requestId } };
    }

    return {
      status: 200,
      headers: { ...responseHeaders, 'x-rate-limit-remaining': String(limit.remaining) },
      requestId,
      securityContext
    };
  }

  return Object.freeze({ process, authenticate, headers, buildSecurityContext });
}
