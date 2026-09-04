const PUBLIC_CREDENTIAL_ERROR = 'Invalid authentication credentials';
const FORBIDDEN_ERROR = 'Forbidden';

function readHeader(request, name) {
  const headers = request?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) ?? undefined;
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}

function bearerToken(request) {
  const authorization = readHeader(request, 'authorization');
  if (typeof authorization !== 'string') return null;
  const match = /^Bearer[ \t]+([^ \t]+)[ \t]*$/i.exec(authorization);
  return match?.[1] ?? null;
}

/**
 * Framework-neutral HTTP/API security adapter for the AFX-CORE authority.
 *
 * The adapter deliberately delegates authentication and authorization to the
 * existing AfxCore/PersistentAfxCore contracts instead of creating another
 * token/session/permission authority.
 */
export function createHttpSecurityBoundary({ core, authenticateAccessToken, authorize } = {}) {
  const authenticate = authenticateAccessToken ?? core?.authenticateAccessToken?.bind(core);
  const authorizeRequest = authorize ?? core?.authorize?.bind(core);

  if (typeof authenticate !== 'function') {
    throw new TypeError('authenticateAccessToken must be a function');
  }
  if (typeof authorizeRequest !== 'function') {
    throw new TypeError('authorize must be a function');
  }

  return async function authenticateAndAuthorize(request, { permission, resourceTenantId } = {}) {
    const token = bearerToken(request);
    if (!token) return { ok: false, status: 401, error: PUBLIC_CREDENTIAL_ERROR };
    if (typeof permission !== 'string' || permission.length === 0 || typeof resourceTenantId !== 'string' || resourceTenantId.length === 0) {
      return { ok: false, status: 403, error: FORBIDDEN_ERROR };
    }

    let securityContext;
    try {
      securityContext = await authenticate(token);
    } catch {
      return { ok: false, status: 401, error: PUBLIC_CREDENTIAL_ERROR };
    }

    let allowed = false;
    try {
      allowed = await authorizeRequest(securityContext, permission, resourceTenantId);
    } catch {
      return { ok: false, status: 403, error: FORBIDDEN_ERROR };
    }

    if (!allowed) return { ok: false, status: 403, error: FORBIDDEN_ERROR };

    return {
      ok: true,
      status: 200,
      securityContext: {
        userId: securityContext.userId,
        tenantId: securityContext.tenantId,
        sessionId: securityContext.sessionId,
        roles: [...(securityContext.roles ?? [])],
      },
    };
  };
}

export function redactCredential() {
  return '[REDACTED]';
}
