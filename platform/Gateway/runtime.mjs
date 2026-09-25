import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createSecurityBoundary } from './security-boundary.js';
import { createMeilisearchSearch } from '../Search/meilisearch.mjs';

function readJson(req, maxBytes = 1_048_576) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('payload_too_large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('invalid_json'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    ...headers
  });
  res.end(JSON.stringify(body));
}

function bearer(req) {
  const value = req.headers.authorization || '';
  const match = /^Bearer\s+(\S+)$/i.exec(value);
  return match?.[1] || null;
}

export function createCanonicalRuntime({
  pool,
  core,
  allowedOrigins = [],
  audit = async () => {},
  maxBodyBytes = 1_048_576,
  search = null
} = {}) {
  if (!pool && !core) throw new Error('pool_or_core_required');
  const runtimeCore = core || new PersistentAfxCore({
    repository: new PostgresAfxCoreRepository(pool),
    audit
  });
  const security = createSecurityBoundary({ allowedOrigins, maxBodyBytes });
  const searchService = search || createMeilisearchSearch();

  async function handle(req, res) {
    const requestId = randomUUID();
    const origin = req.headers.origin;
    const gate = security.process(
      { headers: req.headers, bodyBytes: Number(req.headers['content-length'] || 0), ip: req.socket.remoteAddress, requestId },
      token => runtimeCore.authenticateAccessToken(token),
      (userId, tenantId, permission) => runtimeCore.authorize({ userId, tenantId }, permission, tenantId)
    );
    const common = { ...(gate.headers || {}), 'x-request-id': requestId };
    if (gate.status !== 200) return sendJson(res, gate.status, { error: gate.body?.error || 'request_denied', requestId }, common);

    const url = new URL(req.url || '/', 'http://localhost');

    try {
      if (req.method === 'OPTIONS') return sendJson(res, 204, {}, common);

      if (req.method === 'GET' && url.pathname === '/v1/search') {
        const q = url.searchParams.get('q') || '';
        const category = url.searchParams.get('category') || 'all';
        if (!q.trim() && category === 'all') return sendJson(res, 400, { error: 'query_or_category_required', requestId }, common);
        try {
          const result = await searchService.search({ q, category, limit: url.searchParams.get('limit') || 20 });
          return sendJson(res, 200, { ...result, requestId }, common);
        } catch (error) {
          return sendJson(res, 503, { error: 'search_unavailable', requestId }, common);
        }
      }

      if (req.method === 'GET' && url.pathname === '/v1/health/core') {
        return sendJson(res, 200, {
          status: 'ok',
          runtime: 'Gateway -> PersistentAfxCore -> PostgreSQL',
          requestId
        }, common);
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
        const body = await readJson(req, maxBodyBytes);
        try {
          const tokens = await runtimeCore.authenticatePassword({
            email: body.email,
            password: body.password,
            tenantId: body.tenantId
          });
          return sendJson(res, 200, { ...tokens, requestId }, common);
        } catch (error) {
          const status = error.message === 'tenant_access_denied' ? 403 : 401;
          return sendJson(res, status, { error: status === 403 ? 'tenant_access_denied' : 'invalid_credentials', requestId }, common);
        }
      }

      if (req.method === 'GET' && url.pathname === '/v1/auth/context') {
        const token = bearer(req);
        if (!token) return sendJson(res, 401, { error: 'missing_or_invalid_bearer_token', requestId }, common);
        let context;
        try { context = await runtimeCore.authenticateAccessToken(token); }
        catch { return sendJson(res, 401, { error: 'invalid_access_token', requestId }, common); }
        return sendJson(res, 200, { ...context, requestId }, common);
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/refresh') {
        const body = await readJson(req, maxBodyBytes);
        try {
          const tokens = await runtimeCore.refresh(body.refreshToken);
          return sendJson(res, 200, { ...tokens, requestId }, common);
        } catch {
          return sendJson(res, 401, { error: 'invalid_refresh_token', requestId }, common);
        }
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/logout') {
        const token = bearer(req);
        if (!token) return sendJson(res, 401, { error: 'missing_or_invalid_bearer_token', requestId }, common);
        let context;
        try { context = await runtimeCore.authenticateAccessToken(token); }
        catch { return sendJson(res, 401, { error: 'invalid_access_token', requestId }, common); }
        await runtimeCore.revokeSession(context.sessionId);
        return sendJson(res, 200, { status: 'revoked', requestId }, common);
      }

      return sendJson(res, 404, { error: 'not_found', requestId }, common);
    } catch (error) {
      const status = error.statusCode || 500;
      return sendJson(res, status, { error: status === 413 ? 'payload_too_large' : 'internal_error', requestId }, common);
    }
  }

  return Object.freeze({
    core: runtimeCore,
    handle,
    createServer: () => http.createServer(handle)
  });
}
