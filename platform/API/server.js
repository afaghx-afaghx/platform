import http from 'node:http';
import { Pool } from 'pg';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createSecurityBoundary } from '../Gateway/security-boundary.js';

const API_PREFIX = '/v1';

function config() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return {
    host: process.env.HOST || '127.0.0.1',
    port: Number(process.env.PORT || 4000),
    defaultTenantId: process.env.AFAGHX_DEFAULT_TENANT_ID,
    allowedOrigins: (process.env.AFAGHX_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean)
  };
}

function headers(boundary, origin) { return boundary.headers(origin); }

function json(res, status, body, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32_768) throw new Error('payload_too_large');
  }
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('invalid_json'); }
}

function parseCookies(req) {
  const value = req.headers.cookie || '';
  const result = {};
  for (const part of value.split(';')) {
    if (!part.trim()) continue;
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    try {
      result[name] = decodeURIComponent(raw);
    } catch {
      continue;
    }
  }
  return result;
}

function cookie(name, value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' || process.env.AFAGHX_SECURE_COOKIES === 'true';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function clearCookie(name) { return cookie(name, '', 0); }

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`;
}

function bearerToken(req) {
  const authorization = req.headers.authorization;
  if (!authorization) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  return match?.[1] || null;
}

function errorResponse(error, requestId) {
  const message = error?.message;
  if (message === 'invalid_credentials' || message === 'invalid_refresh_token' || message === 'refresh_reuse_detected' || message === 'unauthorized') {
    return { status: 401, body: { error: message === 'unauthorized' ? 'unauthorized' : message, requestId } };
  }
  if (message === 'tenant_access_denied' || message === 'tenant_context_denied') {
    return { status: 403, body: { error: 'tenant_context_denied', requestId } };
  }
  if (message === 'weak_password' || message === 'invalid_email' || message === 'invalid_membership' || message === 'invalid_json' || message === 'payload_too_large') {
    return { status: message === 'payload_too_large' ? 413 : 400, body: { error: message, requestId } };
  }
  console.error('canonical API request failure', error?.stack || error);
  return { status: 500, body: { error: 'internal_server_error', requestId } };
}

export function createCanonicalRuntime({ pool = new Pool({ connectionString: process.env.DATABASE_URL }) } = {}) {
  const cfg = config();
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  const boundary = createSecurityBoundary({ allowedOrigins: cfg.allowedOrigins });

  async function start() {
    await core.migrate();
    return http.createServer(async (req, res) => {
      const origin = req.headers.origin;
      const request = { method: req.method, headers: req.headers, ip: req.socket.remoteAddress, bodyBytes: Number(req.headers['content-length'] || 0) };
      const gate = boundary.process(request, () => { throw new Error('gateway_delegation_required'); }, () => false);
      if (gate.status !== 200) return json(res, gate.status, { error: gate.body?.error || 'gateway_rejected', requestId: gate.requestId }, headers(boundary, origin));
      if (req.method === 'OPTIONS') {
        res.writeHead(204, headers(boundary, origin));
        return res.end();
      }
      if (req.method === 'POST' && !sameOrigin(req)) return json(res, 403, { error: 'csrf_origin_rejected', requestId: gate.requestId }, headers(boundary, origin));

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      try {
        if (url.pathname === `${API_PREFIX}/health` && req.method === 'GET') {
          return json(res, 200, { ok: true, runtime: 'canonical-persistent', requestId: gate.requestId }, headers(boundary, origin));
        }

        if (url.pathname === `${API_PREFIX}/auth/login` && req.method === 'POST') {
          const input = await readJson(req);
          const tenantId = input.tenantId || req.headers['x-afaghx-tenant-id'] || cfg.defaultTenantId;
          if (!tenantId) return json(res, 400, { error: 'tenant_context_required', requestId: gate.requestId }, headers(boundary, origin));
          const tokens = await core.authenticatePassword({ email: input.email, password: input.password, tenantId });
          return json(res, 200, { authenticated: true, expiresIn: tokens.expiresIn, requestId: gate.requestId }, {
            ...headers(boundary, origin),
            'Set-Cookie': [cookie('afx_access', tokens.accessToken, tokens.expiresIn), cookie('afx_refresh', tokens.refreshToken, 60 * 60 * 24 * 30)]
          });
        }

        if ((url.pathname === `${API_PREFIX}/auth/context` || url.pathname === `${API_PREFIX}/auth/me`) && req.method === 'GET') {
          const cookies = parseCookies(req);
          const access = bearerToken(req) || cookies.afx_access;
          if (!access) return json(res, 401, { error: 'unauthorized', requestId: gate.requestId }, headers(boundary, origin));
          const context = await core.authenticateAccessToken(access);
          const requestedTenant = req.headers['x-afaghx-tenant-id'];
          if (requestedTenant && requestedTenant !== context.tenantId) return json(res, 403, { error: 'tenant_context_denied', requestId: gate.requestId }, headers(boundary, origin));
          return json(res, 200, { authenticated: true, ...context, requestId: gate.requestId }, headers(boundary, origin));
        }

        if (url.pathname === `${API_PREFIX}/auth/refresh` && req.method === 'POST') {
          const refresh = parseCookies(req).afx_refresh;
          if (!refresh) return json(res, 401, { error: 'invalid_refresh_token', requestId: gate.requestId }, headers(boundary, origin));
          const tokens = await core.refresh(refresh);
          return json(res, 200, { authenticated: true, expiresIn: tokens.expiresIn, requestId: gate.requestId }, {
            ...headers(boundary, origin),
            'Set-Cookie': [cookie('afx_access', tokens.accessToken, tokens.expiresIn), cookie('afx_refresh', tokens.refreshToken, 60 * 60 * 24 * 30)]
          });
        }

        if (url.pathname === `${API_PREFIX}/auth/logout` && req.method === 'POST') {
          const access = bearerToken(req) || parseCookies(req).afx_access;
          if (access) {
            try {
              const context = await core.authenticateAccessToken(access);
              await core.revokeSession(context.sessionId);
            } catch { /* idempotent logout */ }
          }
          return json(res, 200, { authenticated: false, requestId: gate.requestId }, {
            ...headers(boundary, origin),
            'Set-Cookie': [clearCookie('afx_access'), clearCookie('afx_refresh')]
          });
        }

        return json(res, 404, { error: 'not_found', requestId: gate.requestId }, headers(boundary, origin));
      } catch (error) {
        const failure = errorResponse(error, gate.requestId);
        return json(res, failure.status, failure.body, headers(boundary, origin));
      }
    });
  }

  return Object.freeze({ core, repository, boundary, start, pool });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const cfg = config();
  const runtime = createCanonicalRuntime();
  runtime.start().then(server => server.listen(cfg.port, cfg.host, () => console.log(`AFAGHX canonical API listening on http://${cfg.host}:${cfg.port}`))).catch(error => { console.error(error); process.exitCode = 1; });
}