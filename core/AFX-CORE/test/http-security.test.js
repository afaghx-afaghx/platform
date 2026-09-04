import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';
import { createHttpSecurityBoundary, extractBearerToken, authenticateHttpRequest } from '../src/http-security.js';

function setup() {
  const core = new AfxCore();
  const user = core.createUser({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  return { core, user, tokens };
}

test('Bearer extraction accepts only a single well-formed Authorization value', () => {
  assert.equal(extractBearerToken({ authorization: 'Bearer abc123' }), 'abc123');
  assert.equal(extractBearerToken(new Headers({ Authorization: 'Bearer xyz789' })), 'xyz789');
  assert.throws(() => extractBearerToken({}), /unauthorized/);
  assert.throws(() => extractBearerToken({ authorization: 'Basic abc123' }), /unauthorized/);
  assert.throws(() => extractBearerToken({ authorization: 'Bearer abc,def' }), /unauthorized/);
});

test('HTTP boundary resolves authentication before authorization and preserves tenant isolation', () => {
  const { core, tokens, user } = setup();
  const context = authenticateHttpRequest(core, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    requiredPermission: 'invoice.read',
    resourceTenantId: 'tenant-a'
  });
  assert.equal(context.userId, user.id);
  assert.equal(context.tenantId, 'tenant-a');
  assert.notEqual(context.credentialDigest, tokens.accessToken);
  assert.throws(() => authenticateHttpRequest(core, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    requiredPermission: 'invoice.read',
    resourceTenantId: 'tenant-b'
  }), /forbidden/);
});

test('security boundary returns 401 for missing or invalid credentials and 403 for authorization failure', () => {
  const { core, tokens } = setup();
  const boundary = createHttpSecurityBoundary(core, {
    requiredPermission: 'invoice.read',
    resolveResourceTenantId: request => request.params.tenantId
  });
  const next = context => ({ status: 200, userId: context.userId, tenantId: context.tenantId });

  assert.deepEqual(boundary({ params: { tenantId: 'tenant-a' }, headers: {} }, next), {
    status: 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: '{"error":"unauthorized"}'
  });
  assert.deepEqual(boundary({ params: { tenantId: 'tenant-a' }, headers: { authorization: 'Bearer invalid-token' } }, next), {
    status: 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: '{"error":"unauthorized"}'
  });
  assert.deepEqual(boundary({ params: { tenantId: 'tenant-b' }, headers: { authorization: `Bearer ${tokens.accessToken}` } }, next), {
    status: 403,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: '{"error":"forbidden"}'
  });
  assert.deepEqual(boundary({ params: { tenantId: 'tenant-a' }, headers: { authorization: `Bearer ${tokens.accessToken}` } }, next), {
    status: 200,
    userId: core.authenticateAccessToken(tokens.accessToken).userId,
    tenantId: 'tenant-a'
  });
});
