const MAX_BODY_BYTES = 16 * 1024;
const TENANT_HEADER = 'x-afx-tenant-id';

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...headers
  });
  res.end(payload);
}

function safeMethod(method) {
  return method === 'GET' || method === 'POST' || method === 'OPTIONS';
}

function bearerToken(req) {
  const value = req.headers.authorization;
  if (typeof value !== 'string') throw new Error('unauthorized');
  const match = /^Bearer ([A-Za-z0-9_-]{20,})$/.exec(value);
  if (!match) throw new Error('unauthorized');
  return match[1];
}

function requestedTenant(req) {
  const value = req.headers[TENANT_HEADER];
  if (Array.isArray(value) || (value !== undefined && !/^[A-Za-z0-9._:-]{1,128}$/.test(value))) {
    throw new Error('invalid_tenant');
  }
  return value;
}

async function readJson(req) {
  let size = 0;
  let data = '';
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('payload_too_large'), { status: 413 });
    data += chunk;
  }
  if (!data) return {};
  try { return JSON.parse(data); } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
}

function publicError(error) {
  if (error?.status) return [error.status, error.message];
  if (error?.message === 'invalid_credentials' || error?.message === 'tenant_access_denied') {
    return [401, 'authentication_failed'];
  }
  if (error?.message === 'unauthorized') return [401, 'unauthorized'];
  return [400, 'request_rejected'];
}

/**
 * Framework-neutral HTTP boundary for AFX-CORE.
 * The boundary authenticates before authorization, binds the request to one tenant,
 * never accepts credentials in URLs, and delegates identity/session truth to AfxCore.
 */
export function createAfxHttpHandler(core, { clock = () => Date.now() } = {}) {
  if (!core || typeof core.authenticateAccessToken !== 'function') throw new TypeError('core_required');

  return async function afxHttpHandler(req, res) {
    const requestId = req.headers['x-request-id'];
    const common = requestId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestId)
      ? { 'x-request-id': requestId }
      : {};

    try {
      if (!safeMethod(req.method)) return json(res, 405, { error: 'method_not_allowed' }, { allow: 'GET, POST, OPTIONS', ...common });
      if (req.method === 'OPTIONS') return json(res, 204, null, { allow: 'GET, POST, OPTIONS', ...common });

      const url = new URL(req.url, 'http://afx-core.invalid');
      // Credentials in query strings are categorically unsupported.
      if ([...url.searchParams.keys()].some(key => /token|auth|session|password|secret/i.test(key))) {
        return json(res, 400, { error: 'credentials_in_url_not_allowed' }, common);
      }

      if (url.pathname === '/v1/health' && req.method === 'GET') {
        return json(res, 200, { status: 'ok', service: 'afx-core', time: clock() }, common);
      }

      if (url.pathname === '/v1/auth/login' && req.method === 'POST') {
        const body = await readJson(req);
        if (typeof body.email !== 'string' || typeof body.password !== 'string' || typeof body.tenantId !== 'string') {
          return json(res, 400, { error: 'invalid_request' }, common);
        }
        try {
          const result = core.authenticatePassword({ email: body.email, password: body.password, tenantId: body.tenantId });
          return json(res, 200, result, common);
        } catch (error) {
          const [status, message] = publicError(error);
          return json(res, status, { error: message }, common);
        }
      }

      if (url.pathname === '/v1/auth/me' && req.method === 'GET') {
        const context = core.authenticateAccessToken(bearerToken(req));
        const tenantId = requestedTenant(req);
        if (tenantId && tenantId !== context.tenantId) return json(res, 403, { error: 'tenant_context_mismatch' }, common);
        return json(res, 200, {
          userId: context.userId,
          tenantId: context.tenantId,
          sessionId: context.sessionId,
          roles: context.roles
        }, common);
      }

      if (url.pathname === '/v1/auth/logout' && req.method === 'POST') {
        const context = core.authenticateAccessToken(bearerToken(req));
        const tenantId = requestedTenant(req);
        if (tenantId && tenantId !== context.tenantId) return json(res, 403, { error: 'tenant_context_mismatch' }, common);
        core.revokeSession(context.sessionId);
        return json(res, 204, null, common);
      }

      return json(res, 404, { error: 'not_found' }, common);
    } catch (error) {
      const [status, message] = publicError(error);
      return json(res, status, { error: message }, common);
    }
  };
}

export { MAX_BODY_BYTES, TENANT_HEADER };
