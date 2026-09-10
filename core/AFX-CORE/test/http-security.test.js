import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
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

test('Bearer extraction accepts only one well-formed Authorization value', () => {
  assert.equal(extractBearerToken({ authorization: 'Bearer abc123' }), 'abc123');
  assert.equal(extractBearerToken(new Headers({ Authorization: 'Bearer xyz789' })), 'xyz789');
  assert.throws(() => extractBearerToken({}), /unauthorized/);
  assert.throws(() => extractBearerToken({ authorization: 'Basic abc123' }), /unauthorized/);
  assert.throws(() => extractBearerToken({ authorization: 'Bearer abc,def' }), /unauthorized/);
});

test('HTTP security context contains identity/tenant only and never raw credentials', () => {
  const { core, tokens, user } = setup();
  const context = authenticateHttpRequest(core, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    requiredPermission: 'invoice.read',
    resourceTenantId: 'tenant-a'
  });
  assert.equal(context.userId, user.id);
  assert.equal(context.tenantId, 'tenant-a');
  assert.equal(Object.hasOwn(context, 'accessToken'), false);
  assert.equal(Object.hasOwn(context, 'refreshToken'), false);
});

test('real HTTP request crosses authentication, tenant authorization and handler boundary', async t => {
  const { core, tokens } = setup();
  const boundary = createHttpSecurityBoundary(core, {
    requiredPermission: 'invoice.read',
    resolveResourceTenantId: request => request.url.split('/')[2]
  });

  const server = http.createServer((req, res) => {
    const result = boundary(
      {
        headers: req.headers,
        url: req.url,
        tenantId: undefined
      },
      (context) => ({ status: 200, body: JSON.stringify({ userId: context.userId, tenantId: context.tenantId }) })
    );
    res.writeHead(result.status, result.headers);
    res.end(result.body ?? '');
  });

  t.after(() => server.close());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  const request = async (tenantId, authorization) => fetch(`http://127.0.0.1:${port}/tenants/${tenantId}/invoices`, {
    headers: authorization ? { Authorization: authorization } : undefined
  });

  const missing = await request('tenant-a');
  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), { error: 'unauthorized' });

  const crossTenant = await request('tenant-b', `Bearer ${tokens.accessToken}`);
  assert.equal(crossTenant.status, 403);
  assert.deepEqual(await crossTenant.json(), { error: 'forbidden' });

  const valid = await request('tenant-a', `Bearer ${tokens.accessToken}`);
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), {
    userId: core.authenticateAccessToken(tokens.accessToken).userId,
    tenantId: 'tenant-a'
  });

  const invalid = await request('tenant-a', 'Bearer invalid-token');
  assert.equal(invalid.status, 401);
  assert.deepEqual(await invalid.json(), { error: 'unauthorized' });
});
