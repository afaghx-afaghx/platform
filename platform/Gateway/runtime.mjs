import http from 'node:http';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createSecurityBoundary } from './security-boundary.js';

const require = createRequire(import.meta.url);
const { Pool } = require('../../core/AFX-CORE/node_modules/pg');

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readBody(req, maxBodyBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error('payload_too_large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch {
    const error = new Error('invalid_json');
    error.status = 400;
    throw error;
  }
}

export function createGatewayRuntime({
  databaseUrl = process.env.DATABASE_URL,
  host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT || 3000),
  allowedOrigins = [],
  migrate = false,
  audit = async () => {},
  clock = () => Date.now(),
} = {}) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository, audit, clock });
  const boundary = createSecurityBoundary({ allowedOrigins });

  async function ensureDatabase() {
    await pool.query('SELECT 1');
  }

  async function handle(req) {
    const url = new URL(req.url || '/', 'http://afaghx.local');
    const request = {
      method: req.method,
      headers: req.headers,
      ip: req.socket.remoteAddress,
      bodyBytes: Number(req.headers['content-length'] || 0),
    };
    const envelope = boundary.process(request);
    const commonHeaders = envelope.headers;
    if (envelope.status !== 200) return jsonEnvelope(envelope);

    if (req.method === 'OPTIONS') {
      return json({ writeHead: () => {}, end: () => {} }, 204, {});
    }

    try {
      if (url.pathname === '/v1/health/core' && req.method === 'GET') {
        await ensureDatabase();
        return jsonEnvelope({ status: 200, headers: commonHeaders, body: {
          status: 'ok',
          authority: 'AFX-CORE',
          persistence: 'PostgreSQL',
          runtime: 'Gateway -> PersistentAfxCore -> PostgreSQL',
        }});
      }

      if (url.pathname === '/v1/auth/login' && req.method === 'POST') {
        const body = await readBody(req, 1_048_576);
        const tokens = await core.authenticatePassword(body);
        return jsonEnvelope({ status: 200, headers: commonHeaders, body: tokens });
      }

      if (url.pathname === '/v1/auth/refresh' && req.method === 'POST') {
        const body = await readBody(req, 1_048_576);
        const tokens = await core.refresh(body.refreshToken);
        return jsonEnvelope({ status: 200, headers: commonHeaders, body: tokens });
      }

      if (url.pathname === '/v1/auth/context' && req.method === 'GET') {
        const auth = await boundary.authenticate(req, (token) => core.authenticateAccessToken(token));
        if (!auth.ok) {
          return jsonEnvelope({ status: auth.status, headers: commonHeaders, body: { error: auth.code, requestId: envelope.requestId }});
        }
        return jsonEnvelope({ status: 200, headers: commonHeaders, body: {
          authenticated: true,
          userId: auth.principal.userId,
          tenantId: auth.principal.tenantId,
          sessionId: auth.principal.sessionId,
          roles: auth.principal.roles,
        }});
      }

      if (url.pathname === '/v1/auth/authorize' && req.method === 'GET') {
        const auth = await boundary.authenticate(req, (token) => core.authenticateAccessToken(token));
        if (!auth.ok) {
          return jsonEnvelope({ status: auth.status, headers: commonHeaders, body: { error: auth.code, requestId: envelope.requestId }});
        }
        const permission = url.searchParams.get('permission');
        const tenantId = url.searchParams.get('tenantId');
        const decision = await boundary.authorize(
          auth.principal,
          { tenantId, permission },
          (principal, resourceTenantId, requestedPermission) =>
            core.authorize(principal, requestedPermission, resourceTenantId),
        );
        if (!decision.ok) {
          return jsonEnvelope({ status: decision.status, headers: commonHeaders, body: { error: decision.code, requestId: envelope.requestId }});
        }
        return jsonEnvelope({ status: 200, headers: commonHeaders, body: { allowed: true }});
      }

      return jsonEnvelope({ status: 404, headers: commonHeaders, body: { error: 'not_found', requestId: envelope.requestId }});
    } catch (error) {
      const status = error.status || (error.message === 'invalid_credentials' ? 401 : 400);
      return jsonEnvelope({
        status,
        headers: commonHeaders,
        body: { error: error.message || 'internal_error', requestId: envelope.requestId },
      });
    }
  }

  function jsonEnvelope(envelope) {
    const fake = {
      writeHead(status, headers) { this.status = status; this.headers = headers; },
      end(body) { this.body = body; },
    };
    json(fake, envelope.status, envelope.body || {}, envelope.headers || {});
    return fake;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://afaghx.local');
      const request = {
        method: req.method,
        headers: req.headers,
        ip: req.socket.remoteAddress,
        bodyBytes: Number(req.headers['content-length'] || 0),
      };
      const envelope = boundary.process(request);
      if (envelope.status !== 200) return json(res, envelope.status, envelope.body, envelope.headers);
      if (req.method === 'OPTIONS') {
        res.writeHead(204, envelope.headers);
        return res.end();
      }
      if (url.pathname === '/v1/health/core' && req.method === 'GET') {
        await ensureDatabase();
        return json(res, 200, {
          status: 'ok',
          authority: 'AFX-CORE',
          persistence: 'PostgreSQL',
          runtime: 'Gateway -> PersistentAfxCore -> PostgreSQL',
        }, envelope.headers);
      }
      if (url.pathname === '/v1/auth/login' && req.method === 'POST') {
        const body = await readBody(req, 1_048_576);
        const tokens = await core.authenticatePassword(body);
        return json(res, 200, tokens, envelope.headers);
      }
      if (url.pathname === '/v1/auth/refresh' && req.method === 'POST') {
        const body = await readBody(req, 1_048_576);
        const tokens = await core.refresh(body.refreshToken);
        return json(res, 200, tokens, envelope.headers);
      }
      if (url.pathname === '/v1/auth/context' && req.method === 'GET') {
        const auth = await boundary.authenticate(req, (token) => core.authenticateAccessToken(token));
        if (!auth.ok) return json(res, auth.status, { error: auth.code, requestId: envelope.requestId }, envelope.headers);
        return json(res, 200, {
          authenticated: true,
          userId: auth.principal.userId,
          tenantId: auth.principal.tenantId,
          sessionId: auth.principal.sessionId,
          roles: auth.principal.roles,
        }, envelope.headers);
      }
      if (url.pathname === '/v1/auth/authorize' && req.method === 'GET') {
        const auth = await boundary.authenticate(req, (token) => core.authenticateAccessToken(token));
        if (!auth.ok) return json(res, auth.status, { error: auth.code, requestId: envelope.requestId }, envelope.headers);
        const decision = await boundary.authorize(
          auth.principal,
          { tenantId: url.searchParams.get('tenantId'), permission: url.searchParams.get('permission') },
          (principal, resourceTenantId, requestedPermission) =>
            core.authorize(principal, requestedPermission, resourceTenantId),
        );
        if (!decision.ok) return json(res, decision.status, { error: decision.code, requestId: envelope.requestId }, envelope.headers);
        return json(res, 200, { allowed: true }, envelope.headers);
      }
      return json(res, 404, { error: 'not_found', requestId: envelope.requestId }, envelope.headers);
    } catch (error) {
      const status = error.status || (error.message === 'invalid_credentials' ? 401 : 500);
      return json(res, status, { error: error.message || 'internal_error' });
    }
  });

  async function start() {
    await ensureDatabase();
    if (migrate) await core.migrate();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
    return server.address();
  }

  async function stop() {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
  }

  return Object.freeze({ server, pool, core, repository, start, stop, ensureDatabase });
}
