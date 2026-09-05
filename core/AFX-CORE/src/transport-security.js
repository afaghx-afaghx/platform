import { createHash, timingSafeEqual } from 'node:crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'];

export class SlidingWindowRateLimiter {
  constructor({ limit = 10, windowMs = 60_000, maxKeys = 10_000 } = {}) {
    if (!Number.isInteger(limit) || limit < 1) throw new TypeError('invalid_limit');
    if (!Number.isInteger(windowMs) || windowMs < 1) throw new TypeError('invalid_window');
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
    this.buckets = new Map();
  }

  consume(key, now = Date.now()) {
    const normalized = String(key);
    const cutoff = now - this.windowMs;
    const previous = this.buckets.get(normalized) ?? [];
    const active = previous.filter((timestamp) => timestamp > cutoff);
    const allowed = active.length < this.limit;
    if (allowed) active.push(now);
    if (active.length > 0) this.buckets.set(normalized, active);
    else this.buckets.delete(normalized);
    if (this.buckets.size > this.maxKeys) {
      const oldest = [...this.buckets.entries()].sort((a, b) => (a[1][0] ?? 0) - (b[1][0] ?? 0))[0];
      if (oldest) this.buckets.delete(oldest[0]);
    }
    return { allowed, remaining: Math.max(0, this.limit - active.length), retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(((active[0] ?? now) + this.windowMs - now) / 1000)) };
  }
}

export function credentialRateLimitKey({ ip = '', email = '', userId = '' } = {}) {
  return createHash('sha256').update(`${ip}|${String(email).trim().toLowerCase()}|${userId}`, 'utf8').digest('base64url');
}

export function verifyCsrfToken(expected, presented) {
  if (typeof expected !== 'string' || typeof presented !== 'string') return false;
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(presented, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function csrfRequired(method, { cookieAuth = true } = {}) {
  return cookieAuth && !SAFE_METHODS.has(String(method).toUpperCase());
}

export function serializeSessionCookie(value, { maxAgeSeconds = 300, secure = true, sameSite = 'Lax', path = '/' } = {}) {
  if (typeof value !== 'string' || !value) throw new TypeError('invalid_cookie_value');
  if (!secure) throw new Error('insecure_session_cookie');
  return `__Host-afx_session=${encodeURIComponent(value)}; Max-Age=${Math.floor(maxAgeSeconds)}; Path=${path}; HttpOnly; Secure; SameSite=${sameSite}`;
}

export function securityHeaders({ hsts = true } = {}) {
  const headers = {
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store'
  };
  if (hsts) headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return headers;
}

export function strictCors({ allowedOrigins = [], allowCredentials = true } = {}) {
  if (allowedOrigins.some((origin) => origin === '*')) throw new Error('wildcard_origin_forbidden');
  const origins = new Set(allowedOrigins.filter((origin) => typeof origin === 'string' && /^https:\/\//i.test(origin)));
  return {
    allowedOrigins: [...origins],
    allowCredentials,
    isAllowed(origin) { return typeof origin === 'string' && origins.has(origin); },
    headers(origin) {
      if (!this.isAllowed(origin)) return {};
      return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': allowCredentials ? 'true' : 'false',
        'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS.join(', '),
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-CSRF-Token',
        'Vary': 'Origin'
      };
    }
  };
}

export function assertHttps(request, { allowLoopback = false } = {}) {
  const url = typeof request?.url === 'string' ? new URL(request.url, 'https://invalid.local') : null;
  if (!url) throw new Error('invalid_request_url');
  if (url.protocol === 'https:') return true;
  if (allowLoopback && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return true;
  throw new Error('https_required');
}
