import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomainApi, createMemoryIdempotencyStore } from './domain-api.mjs';

function fixture() {
  const records = new Map();
  const permissions = new Set(['domain:product:read', 'domain:product:write']);
  const core = {
    async authenticateAccessToken(token) {
      if (token === 'valid-token') return { userId: 'usr_1', tenantId: 'tenant_1' };
      if (token === 'other-token') return { userId: 'usr_2', tenantId: 'tenant_2' };
      throw new Error('unauthorized');
    },
    async authorize(_ctx, requested) { return permissions.has(requested); }
  };
  const repository = {
    async insert(domain, record) {
      records.set(`${domain}:${record.data.tenantId}:${record.id}`, record);
    },
    async findById(domain, id, tenantId) {
      return records.get(`${domain}:${tenantId}:${id}`) ?? null;
    },
    async updateState(domain, id, state, updatedAt, tenantId, expectedState) {
      const key = `${domain}:${tenantId}:${id}`;
      const record = records.get(key);
      if (!record || record.state !== expectedState) throw new Error('domain_record_changed_or_not_found');
      records.set(key, { ...record, state, updatedAt });
    }
  };
  const idempotency = createMemoryIdempotencyStore();
  return { api: createDomainApi({ core, repository, idempotency }), records };
}

const headers = { authorization: 'Bearer valid-token' };

test('unauthenticated requests return 401', async () => {
  const { api } = fixture();
  const response = await api({ method: 'POST', url: '/v1/domains/product', headers: {}, body: { name: 'P' } });
  assert.equal(response.status, 401);
});

test('create requires a valid idempotency key and derives tenant from security context', async () => {
  const { api } = fixture();
  const missing = await api({ method: 'POST', url: '/v1/domains/product', headers, body: { name: 'P' } });
  assert.equal(missing.status, 400);

  const malformed = await api({
    method: 'POST', url: '/v1/domains/product',
    headers: { ...headers, 'idempotency-key': 'short' }, body: { name: 'P' }
  });
  assert.equal(malformed.status, 400);

  const response = await api({
    method: 'POST', url: '/v1/domains/product',
    headers: { ...headers, 'idempotency-key': 'create-0001' }, body: { name: 'P' }
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.tenantId, 'tenant_1');
});

test('idempotency returns the original response and rejects key reuse with a different payload', async () => {
  const { api, records } = fixture();
  const request = {
    method: 'POST',
    url: '/v1/domains/product',
    headers: { ...headers, 'idempotency-key': 'same-key-001' },
    body: { name: 'P' }
  };
  const first = await api(request);
  const second = await api(request);
  assert.equal(first.status, 201);
  assert.deepEqual(second, first);
  assert.equal(records.size, 1);

  const conflict = await api({ ...request, body: { name: 'Different product' } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error, 'idempotency_key_reused');
  assert.equal(records.size, 1);
});

test('concurrent duplicate creates produce exactly one record', async () => {
  const { api, records } = fixture();
  const request = {
    method: 'POST',
    url: '/v1/domains/product',
    headers: { ...headers, 'idempotency-key': 'concurrent-001' },
    body: { name: 'Concurrent product' }
  };
  const [first, second] = await Promise.all([api(request), api(request)]);
  assert.equal(first.status, 201);
  assert.deepEqual(second, first);
  assert.equal(records.size, 1);
});

test('tenant context is mandatory and caller cannot select another tenant', async () => {
  const { api } = fixture();
  const mismatch = await api({
    method: 'POST',
    url: '/v1/domains/product',
    headers: { ...headers, 'idempotency-key': 'tenant-spoof-01' },
    body: { name: 'P', tenantId: 'tenant_2' }
  });
  assert.equal(mismatch.status, 403);
});

test('reads and transitions are scoped to the authenticated tenant', async () => {
  const { api } = fixture();
  const create = await api({
    method: 'POST',
    url: '/v1/domains/product',
    headers: { ...headers, 'idempotency-key': 'read-record-01' },
    body: { name: 'P' }
  });
  const id = create.body.id;

  const read = await api({ method: 'GET', url: `/v1/domains/product/${id}`, headers });
  assert.equal(read.status, 200);

  const crossTenantRead = await api({
    method: 'GET',
    url: `/v1/domains/product/${id}`,
    headers: { authorization: 'Bearer other-token' }
  });
  assert.equal(crossTenantRead.status, 404);

  const transition = await api({
    method: 'POST',
    url: `/v1/domains/product/${id}/transition`,
    headers,
    body: { state: 'active' }
  });
  assert.equal(transition.status, 200);
  assert.equal(transition.body.state, 'active');

  const crossTenantTransition = await api({
    method: 'POST',
    url: `/v1/domains/product/${id}/transition`,
    headers: { authorization: 'Bearer other-token' },
    body: { state: 'archived' }
  });
  assert.equal(crossTenantTransition.status, 404);
});

test('creation fails closed when atomic idempotency is unavailable', async () => {
  const { api: workingApi } = fixture();
  const { api } = createApiWithoutIdempotency();
  void workingApi;
  const response = await api({
    method: 'POST',
    url: '/v1/domains/product',
    headers: { ...headers, 'idempotency-key': 'missing-store-01' },
    body: { name: 'P' }
  });
  assert.equal(response.status, 503);
});

function createApiWithoutIdempotency() {
  const core = {
    async authenticateAccessToken() { return { userId: 'usr_1', tenantId: 'tenant_1' }; },
    async authorize() { return true; }
  };
  return { api: createDomainApi({ core, repository: { async insert() {}, async findById() { return null; }, async updateState() {} } }) };
}

test('authorization is enforced independently from authentication', async () => {
  const { api } = fixture();
  const noPermissionCore = {
    async authenticateAccessToken() { return { userId: 'usr_1', tenantId: 'tenant_1' }; },
    async authorize() { return false; }
  };
  const restricted = createDomainApi({
    core: noPermissionCore,
    repository: { async insert() {}, async findById() { return null; }, async updateState() {} },
    idempotency: createMemoryIdempotencyStore()
  });
  const response = await restricted({
    method: 'POST',
    url: '/v1/domains/payment',
    headers: { ...headers, 'idempotency-key': 'permission-deny-01' },
    body: { amount: 10, currency: 'USD' }
  });
  assert.equal(response.status, 403);
  void api;
});
