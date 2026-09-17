import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { createServer } from 'node:http';
import { createSecurityBoundary } from './security-boundary.js';

const SEARCH_DEFAULT_LIMIT = 20;
const SEARCH_MAX_LIMIT = 100;
const MAX_BODY_BYTES = 1_048_576;

function json(response, status, body, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  response.end(JSON.stringify(body));
}

async function readBody(request, maxBodyBytes = MAX_BODY_BYTES) {
  const declared = Number(request.headers?.['content-length'] ?? 0);
  if (Number.isFinite(declared) && declared > maxBodyBytes) throw new Error('payload_too_large');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('invalid_json'); }
}

function bearer(request) {
  const value = request.headers?.authorization ?? request.headers?.Authorization;
  if (!value || !/^Bearer\s+\S+$/i.test(value)) return null;
  return value.replace(/^Bearer\s+/i, '').trim();
}

function parseSearch(url) {
  const q = url.searchParams.get('q')?.trim() ?? '';
  const category = url.searchParams.get('category')?.trim() || undefined;
  const type = url.searchParams.get('type')?.trim() || undefined;
  const availability = url.searchParams.get('availability')?.trim() || undefined;
  const location = url.searchParams.get('location')?.trim() || undefined;
  const sort = url.searchParams.get('sort')?.trim() || 'relevance';
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Number(url.searchParams.get('limit') ?? SEARCH_DEFAULT_LIMIT);
  if (!q || q.length > 200) throw new Error('invalid_query');
  if (!Number.isInteger(page) || page < 1) throw new Error('invalid_page');
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_LIMIT) throw new Error('invalid_limit');
  return { q, category, type, availability, location, sort, page, limit };
}

function parseLocationLimit(url) {
  const limit = Number(url.searchParams.get('limit') ?? SEARCH_DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_LIMIT) throw new Error('invalid_limit');
  return limit;
}

export function createCanonicalRuntime({ core, searchProvider, security = {} } = {}) {
  if (!core) throw new Error('core_required');
  if (!searchProvider || typeof searchProvider.search !== 'function') throw new Error('search_provider_required');
  const boundary = createSecurityBoundary(security);

  async function authenticate(request) {
    const token = bearer(request);
    if (!token) return { ok: false, status: 401, code: 'missing_or_invalid_bearer_token' };
    try {
      const principal = await core.authenticateAccessToken(token);
      return { ok: true, principal };
    } catch {
      return { ok: false, status: 401, code: 'invalid_access_token' };
    }
  }

  async function handle(request) {
    const requestId = request.headers?.['x-request-id'] || randomUUID();
    const url = new URL(request.url, 'http://afx.local');
    const baseHeaders = { ...boundary.headers(request.headers?.origin), 'x-request-id': requestId };
    if (request.method === 'OPTIONS') return { status: 204, headers: baseHeaders, body: null };

    if (request.method === 'POST' && url.pathname === '/v1/auth/login') {
      try {
        const body = await readBody(request);
        const tokens = await core.authenticatePassword({ email: body.email, password: body.password, tenantId: body.tenantId });
        return { status: 200, headers: baseHeaders, body: tokens };
      } catch (error) {
        const status = ['invalid_credentials'].includes(error.message) ? 401 : error.message === 'tenant_access_denied' ? 403 : 400;
        return { status, headers: baseHeaders, body: { error: status === 401 ? 'invalid_credentials' : error.message, requestId } };
      }
    }

    if (request.method === 'GET' && url.pathname === '/v1/auth/context') {
      const auth = await authenticate(request);
      if (!auth.ok) return { status: auth.status, headers: baseHeaders, body: { error: auth.code, requestId } };
      const requestedTenant = url.searchParams.get('tenantId');
      if (requestedTenant && requestedTenant !== auth.principal.tenantId) {
        return { status: 403, headers: baseHeaders, body: { error: 'tenant_context_denied', requestId } };
      }
      return { status: 200, headers: baseHeaders, body: auth.principal };
    }

    if (request.method === 'POST' && url.pathname === '/v1/auth/refresh') {
      try {
        const body = await readBody(request);
        if (!body.refreshToken) throw new Error('invalid_refresh_token');
        const tokens = await core.refresh(body.refreshToken);
        return { status: 200, headers: baseHeaders, body: tokens };
      } catch (error) {
        return { status: 401, headers: baseHeaders, body: { error: error.message === 'refresh_reuse_detected' ? error.message : 'invalid_refresh_token', requestId } };
      }
    }

    if (request.method === 'POST' && url.pathname === '/v1/auth/logout') {
      const auth = await authenticate(request);
      if (!auth.ok) return { status: auth.status, headers: baseHeaders, body: { error: auth.code, requestId } };
      await core.revokeSession(auth.principal.sessionId);
      return { status: 200, headers: baseHeaders, body: { authenticated: false } };
    }

    if (request.method === 'GET' && url.pathname === '/v1/search') {
      let params;
      try { params = parseSearch(url); }
      catch (error) { return { status: 400, headers: baseHeaders, body: { error: error.message, requestId } }; }
      try {
        const result = await searchProvider.search(params);
        return { status: 200, headers: baseHeaders, body: {
          items: Array.isArray(result?.items) ? result.items : [],
          total: Number(result?.total ?? 0), page: params.page, limit: params.limit, query: params.q,
          filters: { category: params.category, type: params.type, availability: params.availability, location: params.location },
          sort: params.sort,
        }};
      } catch {
        return { status: 503, headers: baseHeaders, body: { error: 'search_unavailable', requestId } };
      }
    }

    if (request.method === 'GET' && url.pathname === '/v1/location') {
      const auth = await authenticate(request);
      if (!auth.ok) return { status: auth.status, headers: baseHeaders, body: { error: auth.code, requestId } };
      try {
        const limit = parseLocationLimit(url);
        const sessionId = url.searchParams.get('sessionId') || undefined;
        const events = await core.listLocationEvents({ context: auth.principal, sessionId, limit });
        return { status: 200, headers: baseHeaders, body: { items: events, count: events.length, requestId } };
      } catch (error) {
        const status = ['unauthorized'].includes(error.message) ? 401 : ['forbidden'].includes(error.message) ? 403 : 400;
        return { status, headers: baseHeaders, body: { error: error.message, requestId } };
      }
    }

    if (request.method === 'POST' && url.pathname === '/v1/location') {
      const auth = await authenticate(request);
      if (!auth.ok) return { status: auth.status, headers: baseHeaders, body: { error: auth.code, requestId } };
      let location;
      try { location = await readBody(request); }
      catch (error) { return { status: 400, headers: baseHeaders, body: { error: error.message, requestId } }; }
      try {
        const result = await core.recordLocation({ context: auth.principal, location });
        return { status: 201, headers: baseHeaders, body: { ...result, requestId } };
      } catch (error) {
        const status = error.message === 'unauthorized' ? 401 : error.message === 'forbidden' ? 403 : 400;
        return { status, headers: baseHeaders, body: { error: error.message, requestId } };
      }
    }

    return { status: 404, headers: baseHeaders, body: { error: 'not_found', requestId } };
  }

  function listen({ port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0' } = {}) {
    const server = createServer(async (request, response) => {
      try {
        const bodyBytes = Number(request.headers['content-length'] || 0);
        const securityResult = boundary.process({ method: request.method, headers: request.headers, bodyBytes, ip: request.socket.remoteAddress });
        if (securityResult.status !== 200) return json(response, securityResult.status, securityResult.body, securityResult.headers);
        const result = await handle(request);
        if (result.body === null) return response.writeHead(result.status, result.headers).end();
        return json(response, result.status, result.body, result.headers);
      } catch (error) {
        const status = error.message === 'payload_too_large' ? 413 : error.message === 'invalid_json' ? 400 : 500;
        return json(response, status, { error: status === 500 ? 'internal_error' : error.message });
      }
    });
    return new Promise(resolve => server.listen(port, host, () => resolve(server)));
  }

  return Object.freeze({ handle, listen });
}
