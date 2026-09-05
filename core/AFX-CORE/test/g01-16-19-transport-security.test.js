import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SlidingWindowRateLimiter,
  credentialRateLimitKey,
  verifyCsrfToken,
  csrfRequired,
  serializeSessionCookie,
  securityHeaders,
  strictCors,
  assertHttps
} from '../src/transport-security.js';

test('G01-17 rate limiter blocks credential bursts and keys do not expose email', () => {
  const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1000 });
  const key = credentialRateLimitKey({ ip: '203.0.113.10', email: 'User@Example.com' });
  assert.equal(key.includes('User'), false);
  assert.equal(limiter.consume(key, 0).allowed, true);
  assert.equal(limiter.consume(key, 1).allowed, true);
  const blocked = limiter.consume(key, 2);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test('G01-18 CSRF comparison is constant-time and required for unsafe cookie requests', () => {
  assert.equal(verifyCsrfToken('abc', 'abc'), true);
  assert.equal(verifyCsrfToken('abc', 'abd'), false);
  assert.equal(csrfRequired('POST'), true);
  assert.equal(csrfRequired('GET'), false);
  assert.equal(csrfRequired('POST', { cookieAuth: false }), false);
});

test('G01-18 session cookie is Secure, HttpOnly, SameSite and __Host scoped', () => {
  const cookie = serializeSessionCookie('opaque', { sameSite: 'Strict' });
  assert.match(cookie, /^__Host-afx_session=/);
  assert.match(cookie, /; Path=\//);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.throws(() => serializeSessionCookie('opaque', { secure: false }), /insecure_session_cookie/);
});

test('G01-19 security headers and strict HTTPS CORS policy', () => {
  const headers = securityHeaders();
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Strict-Transport-Security'], /max-age=31536000/);
  const cors = strictCors({ allowedOrigins: ['https://app.example.com'] });
  assert.equal(cors.isAllowed('https://app.example.com'), true);
  assert.equal(cors.isAllowed('http://app.example.com'), false);
  assert.deepEqual(cors.headers('https://app.example.com')['Access-Control-Allow-Origin'], 'https://app.example.com');
  assert.deepEqual(cors.headers('https://evil.example'), {});
  assert.throws(() => strictCors({ allowedOrigins: ['*'] }), /wildcard_origin_forbidden/);
});

test('G01-19 HTTPS boundary rejects cleartext outside loopback', () => {
  assert.equal(assertHttps({ url: 'https://app.example.com/login' }), true);
  assert.throws(() => assertHttps({ url: 'http://app.example.com/login' }), /https_required/);
  assert.equal(assertHttps({ url: 'http://localhost/login' }, { allowLoopback: true }), true);
});
