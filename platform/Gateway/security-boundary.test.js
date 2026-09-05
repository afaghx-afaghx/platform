import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecurityBoundary } from './security-boundary.js';

test('rejects untrusted origins and sets security headers', () => {
  const boundary = createSecurityBoundary({ allowedOrigins: ['https://app.afaghx.example'] });
  const response = boundary.process({ ip: '1.2.3.4', bodyBytes: 10, headers: { origin: 'https://evil.example' } }, () => {}, () => false);
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'origin_not_allowed');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.ok(response.headers['x-request-id']);
});

test('enforces body-size limit before application handling', () => {
  const boundary = createSecurityBoundary({ maxBodyBytes: 100 });
  const response = boundary.process({ ip: '1.2.3.4', bodyBytes: 101, headers: {} }, () => {}, () => false);
  assert.equal(response.status, 413);
  assert.equal(response.body.error, 'payload_too_large');
});

test('rate limits by client key', () => {
  let clock = 1_000;
  const boundary = createSecurityBoundary({ rateLimit: { windowMs: 60_000, max: 2 }, now: () => clock });
  const request = { ip: '1.2.3.4', bodyBytes: 0, headers: {} };
  assert.equal(boundary.process(request, () => {}, () => false).status, 200);
  assert.equal(boundary.process(request, () => {}, () => false).status, 200);
  const blocked = boundary.process(request, () => {}, () => false);
  assert.equal(blocked.status, 429);
  clock += 60_001;
  assert.equal(boundary.process(request, () => {}, () => false).status, 200);
});

test('auth boundary requires bearer token and authorization is tenant-bound', () => {
  const boundary = createSecurityBoundary();
  assert.equal(boundary.authenticate({ headers: {} }, () => {}).status, 401);
  const auth = boundary.authenticate({ headers: { authorization: 'Bearer token' } }, token => {
    assert.equal(token, 'token');
    return { userId: 'u1', tenantId: 't1' };
  });
  assert.equal(auth.ok, true);
  assert.equal(boundary.authorize(auth.principal, { tenantId: 't2', permission: 'orders.read' }, () => true).status, 403);
  assert.equal(boundary.authorize(auth.principal, { tenantId: 't1', permission: 'orders.read' }, () => true).ok, true);
  assert.equal(boundary.authorize(auth.principal, { tenantId: 't1', permission: 'orders.write' }, () => false).status, 403);
});
