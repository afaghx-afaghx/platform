import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
let core;
let initialization;

function config() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookies = process.env.AFAGHX_SECURE_COOKIES === 'true' || isProduction;
  if (isProduction && !secureCookies) throw new Error('secure_cookies_required');
  if (isProduction && !process.env.DATABASE_URL) throw new Error('DATABASE_URL_required');
  return { port: Number(process.env.PORT || 3000), host: process.env.HOST || '127.0.0.1', tenantId: process.env.AFAGHX_TENANT_ID || 'tenant_default', email: process.env.AFAGHX_BOOTSTRAP_EMAIL, password: process.env.AFAGHX_BOOTSTRAP_PASSWORD, databaseUrl: process.env.DATABASE_URL, secureCookies };
}

export function validateRuntimeConfiguration() { config(); }

async function bootstrap() {
  const cfg = config();
  if (!cfg.email || !cfg.password) throw new Error('AFAGHX_BOOTSTRAP_EMAIL and AFAGHX_BOOTSTRAP_PASSWORD are required');
  if (cfg.databaseUrl) {
    const pool = new Pool({ connectionString: cfg.databaseUrl, max: 10, ssl: process.env.PGSSL === 'disable' ? false : undefined });
    const repository = new PostgresAfxCoreRepository(pool);
    const persistentCore = new PersistentAfxCore({ repository });
    await persistentCore.migrate();
    const existing = await repository.findUserByEmail(cfg.email.trim().toLowerCase());
    if (!existing) {
      const user = await persistentCore.createUser({ email: cfg.email, password: cfg.password });
      await persistentCore.addMembership({ userId: user.id, tenantId: cfg.tenantId, roles: ['user'] });
    }
    core = persistentCore;
    return async () => pool.end();
  }
  if (process.env.NODE_ENV === 'production') throw new Error('persistent_core_required');
  const memoryCore = new AfxCore();
  const user = memoryCore.createUser({ email: cfg.email, password: cfg.password });
  memoryCore.addMembership({ userId: user.id, tenantId: cfg.tenantId, roles: ['user'] });
  core = memoryCore;
  return async () => {};
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const attempts = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt <= now) { attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return true; }
  current.count += 1;
  return current.count <= RATE_LIMIT_MAX;
}

function cookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map(part => { const i = part.indexOf('='); return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())]; }));
}

function cookie(name, value, maxAge) {
  const flags = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (config().secureCookies) flags.push('Secure');
  return flags.join('; ');
}

function clearCookie(name) {
  const flags = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (config().secureCookies) flags.push('Secure');
  return flags.join('; ');
}

function securityHeaders() {
  return { 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
}

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(body));
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 32_768) throw new Error('payload_too_large'); }
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('invalid_json'); }
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  return origin === `${config().secureCookies ? 'https' : 'http'}://${host}`;
}

async function authContext(req) {
  const token = cookies(req).afx_access;
  if (!token) throw new Error('unauthorized');
  return core.authenticateAccessToken(token);
}

function authResponse(res, tokens) {
  json(res, 200, { authenticated: true, expiresIn: tokens.expiresIn }, { 'Set-Cookie': [cookie('afx_access', tokens.accessToken, tokens.expiresIn), cookie('afx_refresh', tokens.refreshToken, 60 * 60 * 24 * 30)], ...securityHeaders() });
}

async function api(req, res, url) {
  if (req.method === 'POST' && !sameOrigin(req)) return json(res, 403, { error: 'csrf_origin_rejected' }, securityHeaders());
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    if (!rateLimit(req.socket.remoteAddress || 'unknown')) return json(res, 429, { error: 'too_many_attempts' }, { 'Retry-After': '60', ...securityHeaders() });
    try {
      const input = await body(req);
      return authResponse(res, await core.authenticatePassword({ email: input.email, password: input.password, tenantId: input.tenantId || config().tenantId }));
    } catch (error) {
      const invalid = ['invalid_credentials', 'tenant_access_denied'].includes(error.message);
      return json(res, invalid ? 401 : 400, { error: invalid ? 'invalid_credentials' : error.message }, securityHeaders());
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/refresh') {
    try { const refresh = cookies(req).afx_refresh; if (!refresh) throw new Error('invalid_refresh_token'); return authResponse(res, await core.refresh(refresh)); }
    catch { return json(res, 401, { error: 'invalid_refresh_token' }, { 'Set-Cookie': [clearCookie('afx_access'), clearCookie('afx_refresh')], ...securityHeaders() }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    try { const context = await authContext(req); await core.revokeSession(context.sessionId); } catch { /* idempotent logout */ }
    return json(res, 200, { authenticated: false }, { 'Set-Cookie': [clearCookie('afx_access'), clearCookie('afx_refresh')], ...securityHeaders() });
  }
  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    try { return json(res, 200, { authenticated: true, ...(await authContext(req)) }, securityHeaders()); }
    catch { return json(res, 401, { error: 'unauthorized' }, securityHeaders()); }
  }
  return json(res, 404, { error: 'not_found' }, securityHeaders());
}

async function staticFile(res, pathname) {
  const requested = pathname === '/' ? '/login.html' : pathname === '/dashboard' ? '/dashboard.html' : pathname;
  const safePath = normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = join(PUBLIC, safePath);
  if (!file.startsWith(PUBLIC)) return false;
  try {
    const data = await readFile(file);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', ...securityHeaders() });
    res.end(data); return true;
  } catch { return false; }
}

export function createServer() {
  initialization = bootstrap();
  return http.createServer(async (req, res) => {
    try {
      await initialization;
      const url = new URL(req.url, `${config().secureCookies ? 'https' : 'http'}://${req.headers.host || 'localhost'}`);
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (url.pathname === '/dashboard') { try { await authContext(req); } catch { res.writeHead(302, { Location: '/' }); return res.end(); } }
      if (!(await staticFile(res, url.pathname))) json(res, 404, { error: 'not_found' }, securityHeaders());
    } catch (error) { json(res, error.message === 'payload_too_large' ? 413 : 500, { error: error.message }, securityHeaders()); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = config(); const server = createServer();
  initialization.then(() => server.listen(cfg.port, cfg.host, () => console.log(`AFAGHX web listening on http://${cfg.host}:${cfg.port}`))).catch(error => { console.error(error); process.exitCode = 1; });
}
