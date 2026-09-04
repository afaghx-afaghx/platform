import test from 'node:test';
import assert from 'node:assert/strict';
import {
  issueCsrfToken,
  verifyCsrfToken,
  sessionCookie,
  clearSessionCookie,
  enforceCsrf,
  parseCookies
} from '../src/session-security.js';

test('session cookie is Secure, HttpOnly, SameSite and bounded by Max-Age', () => {
  const cookie = sessionCookie('opaque-session', { maxAge: 900, sameSite: 'Strict' });
  assert.match(cookie, /^opaque-session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=900/);
});

test('session cookie is explicitly cleared on logout', () => {
  const cookie = clearSessionCookie();
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
});

test('csrf token is random and constant-time verified', () => {
  const token = issueCsrfToken();
  assert.match(token, /^[A-Za-z0-9_-]{40,50}$/);
  assert.equal(verifyCsrfToken(token, token), true);
  assert.equal(verifyCsrfToken(token, `${token}x`), false);
});

test('state-changing request requires csrf token', () => {
  const token = issueCsrfToken();
  const req = { method: 'POST', headers: { cookie: `afx_csrf=${token}`, 'x-afx-csrf-token': token } };
  assert.deepEqual(enforceCsrf(req), { ok: true });
});

test('state-changing request without csrf token is denied', () => {
  const req = { method: 'POST', headers: {} };
  assert.deepEqual(enforceCsrf(req), { ok: false, status: 403, error: 'csrf_failed' });
});

test('csrf origin is allowlisted when configured', () => {
  const token = issueCsrfToken();
  const req = { method: 'POST', headers: { cookie: `afx_csrf=${token}`, 'x-afx-csrf-token': token, origin: 'https://app.afaghx.example' } };
  assert.deepEqual(enforceCsrf(req, { origin: 'https://app.afaghx.example' }), { ok: true });
  assert.deepEqual(enforceCsrf({ ...req, headers: { ...req.headers, origin: 'https://evil.example' } }, { origin: 'https://app.afaghx.example' }), { ok: false, status: 403, error: 'origin_rejected' });
});

test('safe methods do not require csrf', () => {
  assert.deepEqual(enforceCsrf({ method: 'GET', headers: {} }), { ok: true });
});

test('cookie parser never merges cookie names', () => {
  assert.deepEqual(parseCookies('a=1; afx_csrf=token; b=2').afx_csrf, 'token');
});
