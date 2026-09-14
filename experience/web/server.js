import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');

function config() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookies = process.env.AFAGHX_SECURE_COOKIES === 'true' || isProduction;
  if (isProduction && !secureCookies) throw new Error('secure_cookies_required');
  const apiOrigin = process.env.AFAGHX_API_ORIGIN || 'https://api.afaghx.com';
  if (!/^https?:\/\/$/.test(apiOrigin.endsWith('/') ? apiOrigin : `${apiOrigin}/`)) throw new Error('invalid_api_origin');
  return {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '127.0.0.1',
    apiOrigin: apiOrigin.replace(/\/$/, ''),
    secureCookies
  };
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const attempts = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT_MAX;
}

function securityHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(body));
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  const cfg = config();
  return origin === `${cfg.secureCookies ? 'https' : 'http'}://${host}`;
}

function forwardHeaders(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (!value || ['host', 'connection', 'content-length'].includes(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('x-afaghx-experience-boundary', 'experience-web');
  return headers;
}

function copyResponseHeaders(res, upstream) {
  const headers = {};
  for (const [name, value] of upstream.headers) {
    if (name.toLowerCase() === 'set-cookie') continue;
    headers[name] = value;
  }
  const setCookies = upstream.headers.getSetCookie?.() || [];
  if (setCookies.length) headers['Set-Cookie'] = setCookies;
  Object.assign(headers, securityHeaders());
  res.writeHead(upstream.status, headers);
}

async function canonicalRequest(req, path, init = {}) {
  const cfg = config();
  const target = new URL(path, `${cfg.apiOrigin}/`);
  const headers = new Headers(init.headers || {});
  if (req?.headers?.cookie) headers.set('cookie', req.headers.cookie);
  return fetch(target, { ...init, headers, redirect: 'manual' });
}

async function proxyToCanonicalApi(req, res, url) {
  const upstreamPath = url.pathname.replace(/^\/api\//, '/v1/');
  const init = { method: req.method, headers: forwardHeaders(req), redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = req;
  const upstream = await canonicalRequest(req, `${upstreamPath}${url.search}`, init);
  copyResponseHeaders(res, upstream);
  if (req.method === 'HEAD') return res.end();
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

async function hasCanonicalSession(req) {
  if (!req.headers.cookie) return false;
  const upstream = await canonicalRequest(req, '/v1/auth/me', { method: 'GET' });
  return upstream.status === 200;
}

async function api(req, res, url) {
  if (req.method === 'POST' && !sameOrigin(req)) return json(res, 403, { error: 'csrf_origin_rejected' }, securityHeaders());
  if (req.method === 'POST' && url.pathname === '/api/auth/login' && !rateLimit(req.socket.remoteAddress || 'unknown')) {
    return json(res, 429, { error: 'too_many_attempts' }, { 'Retry-After': '60', ...securityHeaders() });
  }
  try {
    return await proxyToCanonicalApi(req, res, url);
  } catch {
    return json(res, 502, { error: 'canonical_api_unavailable' }, securityHeaders());
  }
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
    res.end(data);
    return true;
  } catch { return false; }
}

export function createServer() {
  config();
  return http.createServer(async (req, res) => {
    try {
      const cfg = config();
      const url = new URL(req.url, `${cfg.secureCookies ? 'https' : 'http'}://${req.headers.host || 'localhost'}`);
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (url.pathname === '/dashboard') {
        try {
          if (!(await hasCanonicalSession(req))) throw new Error('unauthorized');
        } catch {
          res.writeHead(302, { Location: '/' });
          return res.end();
        }
      }
      if (!(await staticFile(res, url.pathname))) json(res, 404, { error: 'not_found' }, securityHeaders());
    } catch (error) {
      json(res, 400, { error: error.message }, securityHeaders());
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = config();
  createServer().listen(cfg.port, cfg.host, () => console.log(`AFAGHX experience listening on http://${cfg.host}:${cfg.port}; canonical API=${cfg.apiOrigin}`));
}
