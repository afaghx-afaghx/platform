const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const API_VERSION = /^v\d+$/;

/**
 * Normalize the transport-level request shape used by AFX-PLATFORM Gateway.
 * This function deliberately does not authenticate or authorize a principal.
 */
export function normalizeRequest(request = {}) {
  const method = String(request.method ?? '').toUpperCase();
  const path = String(request.path ?? '');
  const version = String(request.apiVersion ?? '');
  const requestId = String(request.requestId ?? '');

  if (!METHODS.has(method)) {
    return { ok: false, status: 400, code: 'unsupported_method' };
  }
  if (!path.startsWith('/')) {
    return { ok: false, status: 400, code: 'invalid_path' };
  }
  if (!API_VERSION.test(version)) {
    return { ok: false, status: 400, code: 'invalid_api_version' };
  }
  if (requestId && requestId.length > 128) {
    return { ok: false, status: 400, code: 'request_id_too_long' };
  }

  return Object.freeze({
    ok: true,
    request: Object.freeze({
      method,
      path,
      apiVersion: version,
      requestId: requestId || undefined,
      tenantId: request.tenantId ?? undefined,
      organizationId: request.organizationId ?? undefined,
    }),
  });
}
