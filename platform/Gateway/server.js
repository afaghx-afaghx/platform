import http from 'node:http';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createSecurityBoundary } from './security-boundary.js';

const { Pool } = pg;

const MAX_BODY_BYTES = 64 * 1024;

function requireDatabaseUrl(value = process.env.DATABASE_URL) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('DATABASE_URL_REQUIRED');
  return value;
}

function parseAllowedOrigins(value = process.env.AFAGHX_ALLOWED_ORIGINS) {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function securityHeaders(boundary, origin) {
  return boundary.headers(origin);
}

function writeJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) throw new Error('payload_too_large');
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new Error('invalid_json');
  }
}

function bearerToken(req) {
  const value = req.headers.authorization;
  if (!value || !/^Bearer\s+\S+$/i.test(value)) throw new Error('unauthorized');
  return value.replace(/^Bearer\s+/i, '').trim();
}

export function createCanonicalRuntime({
  databaseUrl = process.env.DATABASE_URL,
  pool,
  allowedOrigins = parseAllowedOrigins(),
  security = {},
  clock,
} = {}) {
  const ownsPool = !pool;
  const dbPool = pool ?? new Pool({ connectionString: requireDatabaseUrl(databaseUrl), max: 10 });
  const repository = new PostgresAfxCoreRepository(dbPool);
  const core = new PersistentAfxCore({ repository, ...(clock ? { clock } : {}) });
  const boundary = createSecurityBoundary({ allowedOrigins, ...security });

  async function close() {
    if (ownsPool) await dbPool.end();
  }

  return Object.freeze({ pool: dbPool, repository, core, boundary, close });
}

export function createServer({ runtime = createCanonicalRuntime() } = {}) {
  const { core, boundary } = runtime;

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const commonHeaders = securityHeaders(boundary, origin);

    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const processed = boundary.process({
        ip: req.socket.remoteAddress || 'unknown',
        bodyBytes: Number(req.headers['content-length'] || 0),
        headers: req.headers,
      }, () => {}, () => false);

      if (processed.status !== 200) {
        return writeJson(res, processed.status, processed.body, processed.headers);
      }

      if (req.method === 'GET' && url.pathname === '/health/live') {
        return writeJson(res, 200, { status: 'ok', runtime: 'canonical' }, { ...processed.headers });
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
        const input = await readJsonBody(req);
        try {
          const tokens = await core.authenticatePassword({
            email: input.email,
            password: input.password,
            tenantId: input.tenantId,
          });
          return writeJson(res, 200, {
            authenticated: true,
            tokenType: tokens.tokenType,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            sessionId: tokens.sessionId,
          }, { ...processed.headers });
        } catch (error) {
          const code = ['invalid_credentials', 'tenant_access_denied'].includes(error.message)
            ? 'invalid_credentials'
            : 'authentication_failed';
          return writeJson(res, 401, { error: code }, { ...processed.headers });
        }
      }

      if (req.method === 'GET' && url.pathname === '/v1/auth/context') {
        let context;
        try {
          context = await core.authenticateAccessToken(bearerToken(req));
        } catch {
          return writeJson(res, 401, { error: 'unauthorized' }, { ...processed.headers });
        }

        const resourceTenant = req.headers['x-afx-tenant-id'];
        if (resourceTenant && resourceTenant !== context.tenantId) {
          return writeJson(res, 403, { error: 'tenant_context_denied' }, { ...processed.headers });
        }
        return writeJson(res, 200, context, { ...processed.headers });
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/refresh') {
        const input = await readJsonBody(req);
        try {
          if (typeof input.refreshToken !== 'string' || input.refreshToken.length < 20) throw new Error('invalid_refresh_token');
          const tokens = await core.refresh(input.refreshToken);
          return writeJson(res, 200, {
            authenticated: true,
            tokenType: tokens.tokenType,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          }, { ...processed.headers });
        } catch {
          return writeJson(res, 401, { error: 'invalid_refresh_token' }, { ...processed.headers });
        }
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/logout') {
        try {
          const context = await core.authenticateAccessToken(bearerToken(req));
          await core.revokeSession(context.sessionId);
        } catch {
          return writeJson(res, 401, { error: 'unauthorized' }, { ...processed.headers });
        }
        return writeJson(res, 200, { authenticated: false }, { ...processed.headers });
      }

      return writeJson(res, 404, { error: 'not_found' }, { ...commonHeaders, ...processed.headers });
    } catch (error) {
      const status = error.message === 'payload_too_large' ? 413 : error.message === 'invalid_json' ? 400 : 500;
      return writeJson(res, status, { error: status === 500 ? 'internal_error' : error.message }, commonHeaders);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '127.0.0.1';
  const runtime = createCanonicalRuntime();
  const server = createServer({ runtime });
  const shutdown = async () => {
    server.close(async () => {
      await runtime.close();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.listen(port, host, () => {
    console.log(`AFAGHX canonical gateway listening on http://${host}:${port}`);
  });
}
