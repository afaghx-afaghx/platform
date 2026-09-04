const MAX_REQUEST_BYTES = 1_048_576;

function securityError(status, code) {
  const error = new Error(code);
  error.status = status;
  error.code = code;
  return error;
}

function parseAuthorization(value) {
  if (typeof value !== 'string') throw securityError(401, 'unauthorized');
  const trimmed = value.trim();
  if (!/^Bearer\s+/i.test(trimmed)) throw securityError(401, 'unauthorized');
  const token = trimmed.slice(7).trim();
  if (!token || /\s/.test(token) || token.length < 20) throw securityError(401, 'unauthorized');
  return token;
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) ?? headers.get(name.toLowerCase());
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function publicSecurityError(error) {
  if (error?.status === 403 || error?.code === 'forbidden') return { status: 403, body: { error: 'forbidden' } };
  if (error?.status === 400 || error?.code === 'bad_request') return { status: 400, body: { error: 'bad_request' } };
  return { status: 401, body: { error: 'unauthorized' } };
}

export function createHttpSecurityBoundary({ core, maxRequestBytes = MAX_REQUEST_BYTES } = {}) {
  if (!core?.authenticateAccessToken || !core?.authorize) throw new TypeError('core_security_api_required');

  return async function securityBoundary(request, handler) {
    try {
      if (!request || typeof request !== 'object' || typeof handler !== 'function') throw securityError(400, 'bad_request');
      const method = String(request.method ?? '').toUpperCase();
      if (!method || method === 'TRACE' || method === 'CONNECT') throw securityError(400, 'bad_request');

      const contentLength = getHeader(request.headers, 'content-length');
      if (contentLength !== undefined && (!/^\d+$/.test(String(contentLength)) || Number(contentLength) > maxRequestBytes)) {
        throw securityError(400, 'bad_request');
      }
      const contentType = getHeader(request.headers, 'content-type');
      if (contentType !== undefined && !/^(application\/json)(?:\s*;|$)/i.test(String(contentType))) {
        throw securityError(400, 'bad_request');
      }

      const token = parseAuthorization(getHeader(request.headers, 'authorization'));
      let context;
      try {
        context = await core.authenticateAccessToken(token);
      } catch {
        throw securityError(401, 'unauthorized');
      }

      const permission = request.requiredPermission;
      if (permission !== undefined) {
        if (typeof permission !== 'string' || !permission || !context.tenantId || request.resourceTenantId === undefined) {
          throw securityError(403, 'forbidden');
        }
        const allowed = await core.authorize(context, permission, request.resourceTenantId);
        if (!allowed) throw securityError(403, 'forbidden');
      }

      return await handler({ ...request, security: Object.freeze({ ...context }) });
    } catch (error) {
      if (error?.status === 400 || error?.status === 401 || error?.status === 403) return publicSecurityError(error);
      return { status: 500, body: { error: 'internal_error' } };
    }
  };
}
