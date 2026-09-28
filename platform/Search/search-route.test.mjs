import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchRoute } from './search-route.mjs';

const allowedContext = Object.freeze({
  identity: Object.freeze({ userId: 'u1' }),
  tenant: Object.freeze({ tenantId: 'tenant-a', resolvedFrom: 'session' }),
  membership: Object.freeze({ userId: 'u1', tenantId: 'tenant-a', roles: Object.freeze(['agent-admin']), status: 'active' }),
  rbac: Object.freeze({ allowed: true, evaluatedAt: new Date().toISOString() }),
  policy: Object.freeze({ effect: 'allow', reason: 'SEARCH_ALLOWED', policyId: 'p-search', evaluatedAt: new Date().toISOString(), inputs: { subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 'tenant-a' }, resource: { type: 'search', id: null, tenantId: 'tenant-a' }, action: 'read' } })
});

test('search route delegates only with governed SecurityContext', async () => {
  const calls = [];
  const route = createSearchRoute({
    search: async input => {
      calls.push(input);
      return { items: [{ id: 'p1', title: 'Steel', tenant_id: 'tenant-a' }], source: 'meilisearch' };
    }
  });
  let response;
  await route(new URL('http://localhost/v1/search?q=steel&category=metals'), allowedContext, 'req-1', (status, body) => {
    response = { status, body };
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.source, 'meilisearch');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].q, 'steel');
  assert.equal(calls[0].category, 'metals');
  assert.equal(calls[0].securityContext, allowedContext);
});

test('search route rejects missing SecurityContext', async () => {
  const route = createSearchRoute({ search: async () => { throw new Error('must_not_call_search'); } });
  let response;
  await route(new URL('http://localhost/v1/search?q=steel'), null, 'req-2', (status, body) => {
    response = { status, body };
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'missing_security_context');
});

test('search route rejects without RBAC allow', async () => {
  const route = createSearchRoute({ search: async () => { throw new Error('must_not_call_search'); } });
  let response;
  await route(new URL('http://localhost/v1/search?q=steel'), { ...allowedContext, rbac: { allowed: false } }, 'req-3', (status, body) => {
    response = { status, body };
  });
  assert.equal(response.status, 403);
  assert.equal(response.body.reason, 'RBAC_DENIED');
});

test('search route rejects without explicit Policy allow', async () => {
  const route = createSearchRoute({ search: async () => { throw new Error('must_not_call_search'); } });
  for (const effect of [undefined, 'deny', 'abstain']) {
    let response;
    await route(new URL('http://localhost/v1/search?q=steel'), { ...allowedContext, policy: effect ? { effect, reason: 'NO' } : null }, 'req-4', (status, body) => {
      response = { status, body };
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'POLICY_DENIED');
  }
});

test('search route rejects empty query without fabricating results', async () => {
  const route = createSearchRoute({ search: async () => { throw new Error('must_not_call_search'); } });
  let response;
  await route(new URL('http://localhost/v1/search?q=&category=all'), allowedContext, 'req-5', (status, body) => {
    response = { status, body };
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'query_or_category_required');
});
