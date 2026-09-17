import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomainApi, createMemoryIdempotencyStore } from './domain-api.mjs';

function fixture() {
  const records = new Map();
  const permissions = new Set(['domain:product:read', 'domain:product:write']);
  const core = {
    async authenticateAccessToken(token) { if (token !== 'valid-token') throw new Error('unauthorized'); return { userId: 'usr_1', tenantId: 'tenant_1' }; },
    async authorize(_ctx, requested) { return permissions.has(requested); }
  };
  const repository = {
    async insert(domain, record) { records.set(`${domain}:${record.id}`, record); },
    async findById(domain, id) { return records.get(`${domain}:${id}`) ?? null; },
    async updateState(domain, id, state, updatedAt) { const key = `${domain}:${id}`; const record = records.get(key); records.set(key, { ...record, state, updatedAt }); }
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

test('create requires idempotency key and persists tenant context', async () => {
  const { api } = fixture();
  const missing = await api({ method: 'POST', url: '/v1/domains/product', headers, body: { name: 'P' } });
  assert.equal(missing.status, 400);
  const response = await api({ method: 'POST', url: '/v1/domains/product', headers: { ...headers, 'idempotency-key': 'k1' }, body: { name: 'P' } });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.tenantId, 'tenant_1');
});

test('idempotency returns the original response', async () => {
  const { api } = fixture();
  const request = { method: 'POST', url: '/v1/domains/product', headers: { ...headers, 'idempotency-key': 'same' }, body: { name: 'P' } };
  const first = await api(request);
  const second = await api(request);
  assert.equal(first.status, 201);
  assert.deepEqual(second, first);
});

test('read and transition stay inside the authenticated tenant', async () => {
  const { api } = fixture();
  const create = await api({ method: 'POST', url: '/v1/domains/product', headers: { ...headers, 'idempotency-key': 'read-1' }, body: { name: 'P' } });
  const id = create.body.id;
  const read = await api({ method: 'GET', url: `/v1/domains/product/${id}`, headers });
  assert.equal(read.status, 200);
  const transition = await api({ method: 'POST', url: `/v1/domains/product/${id}/transition`, headers, body: { state: 'active' } });
  assert.equal(transition.status, 200);
  assert.equal(transition.body.state, 'active');
});

test('authorization is enforced independently from authentication', async () => {
  const { api } = fixture();
  const response = await api({ method: 'POST', url: '/v1/domains/payment', headers: { ...headers, 'idempotency-key': 'deny' }, body: { amount: 10, currency: 'USD' } });
  assert.equal(response.status, 403);
});
