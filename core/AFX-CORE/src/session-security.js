import { randomBytes, timingSafeEqual } from 'node:crypto';

const CSRF_BYTES = 32;
const DEFAULT_COOKIE = 'afx_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function cookieSerialize(name, value, { maxAge = 0, path = '/', secure = true, httpOnly = true, sameSite = 'Lax' } = {}) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) throw new TypeError('invalid_cookie_name');
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (secure) parts.push('Secure');
  if (httpOnly) parts.push('HttpOnly');
  if (Number.isInteger(maxAge)) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

function parseCookies(header = '') {
  const result = Object.create(null);
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    result[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return result;
}

export function issueCsrfToken(random = randomBytes) {
  return random(CSRF_BYTES).toString('base64url');
}

export function verifyCsrfToken(expected, supplied) {
  if (typeof expected !== 'string' || typeof supplied !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionCookie(value, options = {}) {
  return cookieSerialize(options.name ?? DEFAULT_COOKIE, value, {
    maxAge: options.maxAge ?? 1800,
    path: options.path ?? '/',
    secure: options.secure ?? true,
    httpOnly: true,
    sameSite: options.sameSite ?? 'Lax'
  });
}

export function clearSessionCookie(options = {}) {
  return cookieSerialize(options.name ?? DEFAULT_COOKIE, '', {
    maxAge: 0,
    path: options.path ?? '/',
    secure: options.secure ?? true,
    httpOnly: true,
    sameSite: options.sameSite ?? 'Lax'
  });
}

export function enforceCsrf(req, { csrfCookie = 'afx_csrf', header = 'x-afx-csrf-token', origin } = {}) {
  if (SAFE_METHODS.has(req.method)) return { ok: true };
  const cookies = parseCookies(req.headers.cookie);
  const supplied = req.headers[header];
  if (!verifyCsrfToken(cookies[csrfCookie], supplied)) return { ok: false, status: 403, error: 'csrf_failed' };
  if (origin) {
    const requestOrigin = req.headers.origin;
    if (requestOrigin !== origin) return { ok: false, status: 403, error: 'origin_rejected' };
  }
  return { ok: true };
}

export { parseCookies, cookieSerialize, SAFE_METHODS };
