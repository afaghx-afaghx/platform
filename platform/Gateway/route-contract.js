const ROUTE_ID = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;
const API_VERSION = /^v\d+$/;
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

function freeze(value) {
  return Object.freeze(value);
}

/**
 * Register transport metadata for a Gateway route.
 * This is deliberately limited to routing/contract metadata; authorization
 * decisions remain outside this module and in AFX-CORE.
 */
export function defineRoute({ id, method, path, apiVersion = 'v1', auth = 'required', permission = undefined, tenantContext = 'required' } = {}) {
  const normalizedMethod = String(method ?? '').toUpperCase();
  const normalizedId = String(id ?? '');
  const normalizedPath = String(path ?? '');
  const normalizedVersion = String(apiVersion ?? '');

  if (!ROUTE_ID.test(normalizedId)) throw new TypeError('invalid_route_id');
  if (!METHODS.has(normalizedMethod)) throw new TypeError('unsupported_method');
  if (!normalizedPath.startsWith('/')) throw new TypeError('invalid_route_path');
  if (!API_VERSION.test(normalizedVersion)) throw new TypeError('invalid_api_version');
  if (!['required', 'optional', 'none'].includes(auth)) throw new TypeError('invalid_auth_mode');
  if (!['required', 'optional', 'none'].includes(tenantContext)) throw new TypeError('invalid_tenant_context');
  if (auth === 'none' && permission) throw new TypeError('permission_requires_auth');

  return freeze({
    id: normalizedId,
    method: normalizedMethod,
    path: normalizedPath,
    apiVersion: normalizedVersion,
    auth,
    permission: permission ? String(permission) : undefined,
    tenantContext,
  });
}

export function createRouteRegistry(routes = []) {
  const registry = new Map();
  for (const route of routes) {
    if (registry.has(route.id)) throw new TypeError('duplicate_route_id');
    const key = `${route.apiVersion}:${route.method}:${route.path}`;
    if ([...registry.values()].some(existing => `${existing.apiVersion}:${existing.method}:${existing.path}` === key)) {
      throw new TypeError('duplicate_route_signature');
    }
    registry.set(route.id, route);
  }
  return freeze({
    size: registry.size,
    get: id => registry.get(id),
    list: () => freeze([...registry.values()]),
  });
}
