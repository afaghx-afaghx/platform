function readHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) ?? undefined;
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(value) ? value.join(',') : value;
}

export function extractBearerToken(headers) {
  const value = readHeader(headers, 'authorization');
  if (typeof value !== 'string') throw new Error('unauthorized');
  const matches = value.match(/^Bearer[ \t]+([^ \t,]+)$/i);
  if (!matches) throw new Error('unauthorized');
  return matches[1];
}

export function authenticateHttpRequest(core, { headers, requiredPermission, resourceTenantId }) {
  const token = extractBearerToken(headers);
  const context = core.authenticateAccessToken(token);
  if (requiredPermission && !core.authorize(context, requiredPermission, resourceTenantId)) {
    throw new Error('forbidden');
  }
  return Object.freeze({ ...context });
}

export function createHttpSecurityBoundary(core, { requiredPermission, resolveResourceTenantId = request => request.tenantId } = {}) {
  if (!core) throw new Error('core_required');
  return function securityBoundary(request, next) {
    try {
      const resourceTenantId = resolveResourceTenantId(request);
      const context = authenticateHttpRequest(core, {
        headers: request?.headers,
        requiredPermission,
        resourceTenantId
      });
      return next(context, request);
    } catch (error) {
      const status = error?.message === 'forbidden' ? 403 : 401;
      return {
        status,
        headers: Object.freeze({ 'content-type': 'application/json', 'cache-control': 'no-store' }),
        body: JSON.stringify({ error: status === 403 ? 'forbidden' : 'unauthorized' })
      };
    }
  };
}
