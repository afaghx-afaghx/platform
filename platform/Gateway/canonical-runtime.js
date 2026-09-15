import { createServer } from 'node:http';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { createPostgresPool, PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createSecurityBoundary } from './security-boundary.js';

function jsonResponse(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

async function readJson(req, maxBodyBytes) {
  const declared = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(declared) && declared > maxBodyBytes) throw new Error('payload_too_large');

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('invalid_json');
  }
}

function bearer(req) {
  const value = req.headers.authorization;
  if (!value || !/^Bearer\s+\S+$/i.test(value)) return null;
  return value.replace(/^Bearer\s+/i, '').trim();
}

export function createCanonicalRuntime({
  databaseUrl = process.env.DATABASE_URL,
  allowedOrigins = [],
  maxBodyBytes = 1_048_576,
  rateLimit = { windowMs: 60_000, max: 120 },
  poolOptions = {},
} = {}) {
  const pool = createPostgresPool(databaseUrl, poolOptions);
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  const boundary = createSecurityBoundary({ allowedOrigins, maxBodyBytes, rateLimit });

  async function initialize() {
    await core.migrate();
  }

  async function handle(req, res) {
    const request = {
      headers: req.headers,
      ip: req.socket.remoteAddress,
      bodyBytes: Number(req.headers['content-length'] ?? 0),
    };
    const boundaryResult = boundary.process(request);
    const commonHeaders = boundaryResult.headers;

    if (boundaryResult.status !== 200) {
      return jsonResponse(res, boundaryResult.status, boundaryResult.body, commonHeaders);
    }

    try {
      const url = new URL(req.url, 'http://afx.local');

      if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
        const body = await readJson(req, maxBodyBytes);
        const tokens = await core.authenticatePassword({
          email: body.email,
          password: body.password,
          tenantId: body.tenantId,
        });
        return jsonResponse(res, 200, tokens, commonHeaders);
      }

      if (req.method === 'GET' && url.pathname === '/v1/auth/context') {
        const token = bearer(req);
        if (!token) return jsonResponse(res, 401, { error: 'missing_or_invalid_bearer_token' }, commonHeaders);
        let context;
        try {
          context = await core.authenticateAccessToken(token);
        } catch {
          return jsonResponse(res, 401, { error: 'invalid_access_token' }, commonHeaders);
        }
        const requestedTenant = url.searchParams.get('tenantId');
        if (requestedTenant && requestedTenant !== context.tenantId) {
          return jsonResponse(res, 403, { error: 'tenant_context_denied' }, commonHeaders);
        }
        return jsonResponse(res, 200, context, commonHeaders);
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/refresh') {
        const body = await readJson(req, maxBodyBytes);
        if (!body.refreshToken) return jsonResponse(res, 401, { error: 'invalid_refresh_token' }, commonHeaders);
        try {
          const tokens = await core.refresh(body.refreshToken);
          return jsonResponse(res, 200, tokens, commonHeaders);
        } catch (error) {
          return jsonResponse(res, 401, { error: error.message }, commonHeaders);
        }
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/logout') {
        const token = bearer(req);
        if (!token) return jsonResponse(res, 401, { error: 'missing_or_invalid_bearer_token' }, commonHeaders);
        try {
          const context = await core.authenticateAccessToken(token);
          await core.revokeSession(context.sessionId);
          return jsonResponse(res, 204, {}, commonHeaders);
        } catch {
          return jsonResponse(res, 401, { error: 'invalid_access_token' }, commonHeaders);
        }
      }

      return jsonResponse(res, 404, { error: 'not_found' }, commonHeaders);
    } catch (error) {
      if (error.message === 'payload_too_large') return jsonResponse(res, 413, { error: error.message }, commonHeaders);
      if (error.message === 'invalid_json') return jsonResponse(res, 400, { error: error.message }, commonHeaders);
      if (error.message === 'invalid_credentials') return jsonResponse(res, 401, { error: error.message }, commonHeaders);
      if (error.message === 'tenant_access_denied') return jsonResponse(res, 403, { error: error.message }, commonHeaders);
      return jsonResponse(res, 500, { error: 'internal_error' }, commonHeaders);
    }
  }

  async function start(port = 0, host = '127.0.0.1') {
    await initialize();
    const server = createServer((req, res) => {
      void handle(req, res);
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
    return server;
  }

  async function close(server) {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
  }

  return Object.freeze({ core, repository, boundary, initialize, handle, start, close });
}
