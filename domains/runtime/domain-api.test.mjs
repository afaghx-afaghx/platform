import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomainApi, createMemoryIdempotencyStore } from './domain-api.mjs';

function context(tenantId = 'tenant_1', allowed = true) {
  return Object.freeze({
    userId: 'usr_1',
    tenant: Object.freeze({ tenantId }),
    identity: Object.freeze({ userId: 'usr_1' }),
    rbac: Object.freeze({ allowed }),
    policy: Object.freeze({ effect: 'allow' })
  });
}

function fixture() {
  const records = new Map();
  const repository = {
    async insert(domain, record) { records.set(`${domain}:${record.id}`, record); },
    async findById(domain, id) { return records.get(`${domain}:${id}`) ?? null; },
    async updateState(domain, id, state, updatedAt) {
      const key = `${domain}:${id}`;
      const record = records.get(key);
      records.set(key, { ...record, state, updatedAt });
    }
  };
  const idempotency = createMemoryIdempotencyStore();
  return { api: createDomainApi({ repository, idempotency }), records };
}

test('protected domain requests require SecurityContext', async () => {
  const { api } = fixture();
  const response = await api({ method: 'POST', url: '/v1/domains/product', headers: {}, body: { name: 'P' } });
  assert.equal(response.status, 401);
});

test('domain rejects a denied policy context', async () => {
  const { api } = fixture();
  const response = await api({ method: 'POST', url: '/v1/domains/product', headers: {}, securityContext: context('tenant_1', false), body: { name: 'P' } });
  assert.equal(response.status, 403);
});

test('create persists the tenant from SecurityContext', async () => {
  const { api } = fixture();
  const response = await api({ method: 'POST', url: '/v1/domains/product', headers: { 'idempotency-key': 'k1' }, securityContext: context(), body: { name: 'P' } });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.tenantId, 'tenant_1');
});

test('request tenant field cannot override SecurityContext tenant', async () => {
  const { api } = fixture();
  const response = await api({ method: 'POST', url: '/v1/domains/product', headers: { 'idempotency-key': 'k2' }, securityContext: context('tenant_1'), body: { name: 'P', tenantId: 'tenant_2' } });
  assert.equal(response.status, 403);
});

test('idempotency returns original response inside the SecurityContext tenant', async () => {
  const { api } = fixture();
  const request = { method: 'POST', url: '/v1/domains/product', headers: { 'idempotency-key': 'same' }, securityContext: context(), body: { name: 'P' } };
  const first = await api(request);
  const second = await api(request);
  assert.equal(first.status, 201);
  assert.deepEqual(second, first);
});

test('read and transition remain inside SecurityContext tenant', async () => {
  const { api } = fixture();
  const created = await api({ method: 'POST', url: '/v1/domains/product', headers: { 'idempotency-key': 'read-1' }, securityContext: context(), body: { name: 'P' } });
  const id = created.body.id;
  const read = await api({ method: 'GET', url: `/v1/domains/product/${id}`, headers: {}, securityContext: context() });
  assert.equal(read.status, 200);
  const transition = await api({ method: 'POST', url: `/v1/domains/product/${id}/transition`, headers: {}, securityContext: context(), body: { state: 'active' } });
  assert.equal(transition.status, 200);
  assert.equal(transition.body.state, 'active');
});

test('cross-tenant read is denied by data boundary', async () => {
  const { api } = fixture();
  const created = await api({ method: 'POST', url: '/v1/domains/product', headers: { 'idempotency-key': 'tenant-a' }, securityContext: context('tenant_1'), body: { name: 'P' } });
  const response = await api({ method: 'GET', url: `/v1/domains/product/${created.body.id}`, headers: {}, securityContext: context('tenant_2') });
  assert.equal(response.status, 404);
});
