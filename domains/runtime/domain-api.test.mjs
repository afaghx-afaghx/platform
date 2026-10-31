import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomainApi, createMemoryIdempotencyStore } from './domain-api.mjs';

const tenantA = Object.freeze({ userId: 'usr_1', tenantId: 'tenant_1', roles: Object.freeze(['buyer']) });
const tenantB = Object.freeze({ userId: 'usr_2', tenantId: 'tenant_2', roles: Object.freeze(['buyer']) });

function fixture({ withIdempotency = true } = {}) {
  const records = new Map();
  const auditEvents = [];
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
    },
    async appendAudit(_transaction, event) { auditEvents.push(event); },
    async withTransaction(operation) { return operation({ memoryTransaction: true }); }
  };
  const idempotency = withIdempotency ? createMemoryIdempotencyStore() : undefined;
  return { api: createDomainApi({ repository, idempotency }), records, auditEvents };
}

test('Domain API refuses requests without a Gateway-verified SecurityContext', async () => {
  const { api } = fixture();
  const missing = await api({ method: 'GET', url: '/v1/domains/product/p1' });
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error, 'verified_security_context_required');

  const incomplete = await api({
    method: 'GET',
    url: '/v1/domains/product/p1',
    securityContext: { userId: 'usr_1' }
  });
  assert.equal(incomplete.status, 401);
});

test('create requires a valid idempotency key and derives tenant from SecurityContext', async () => {
  const { api } = fixture();
  const missing = await api({
    method: 'POST', url: '/v1/domains/product', securityContext: tenantA, body: { name: 'P' }
  });
  assert.equal(missing.status, 400);

  const malformed = await api({
    method: 'POST', url: '/v1/domains/product',
    headers: { 'idempotency-key': 'short' }, securityContext: tenantA, body: { name: 'P' }
  });
  assert.equal(malformed.status, 400);

  const response = await api({
    method: 'POST', url: '/v1/domains/product',
    headers: { 'idempotency-key': 'create-0001' },
    securityContext: tenantA,
    body: { name: 'P' }
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.tenantId, tenantA.tenantId);
});

test('a caller-supplied tenant cannot override Gateway SecurityContext', async () => {
  const { api } = fixture();
  const mismatch = await api({
    method: 'POST',
    url: '/v1/domains/product',
    headers: { 'idempotency-key': 'tenant-spoof-01' },
    securityContext: tenantA,
    body: { name: 'P', tenantId: tenantB.tenantId }
  });
  assert.equal(mismatch.status, 403);
});

test('idempotency replays the original response and rejects key reuse with a different payload', async () => {
  const { api, records, auditEvents } = fixture();
  const request = {
    method: 'POST',
    url: '/v1/domains/product',
    headers: { 'idempotency-key': 'same-key-001' },
    securityContext: tenantA,
    body: { name: 'P' }
  };
  const first = await api(request);
  const second = await api(request);
  assert.equal(first.status, 201);
  assert.deepEqual(second, first);
  assert.equal(records.size, 1);
  assert.equal(auditEvents.filter((event) => event.type === 'domain.record.created').length, 1);

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
    headers: { 'idempotency-key': 'concurrent-001' },
    securityContext: tenantA,
    body: { name: 'Concurrent product' }
  };
  const [first, second] = await Promise.all([api(request), api(request)]);
  assert.equal(first.status, 201);
  assert.deepEqual(second, first);
  assert.equal(records.size, 1);
});

test('the Authorization header is not an authority inside Domain; Gateway SecurityContext is authoritative', async () => {
  const { api, records } = fixture();
  const response = await api({
    method: 'POST',
    url: '/v1/domains/product',
    headers: { authorization: 'Bearer token-for-another-tenant', 'idempotency-key': 'context-only-001' },
    securityContext: tenantA,
    body: { name: 'Security-context product' }
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.tenantId, tenantA.tenantId);
  assert.equal(records.size, 1);
});

test('reads and transitions are scoped to the verified tenant context', async () => {
  const { api } = fixture();
  const create = await api({
    method: 'POST',
    url: '/v1/domains/product',
    headers: { 'idempotency-key': 'read-record-01' },
    securityContext: tenantA,
    body: { name: 'P' }
  });
  const id = create.body.id;

  const read = await api({
    method: 'GET',
    url: `/v1/domains/product/${id}`,
    securityContext: tenantA
  });
  assert.equal(read.status, 200);

  const crossTenantRead = await api({
    method: 'GET',
    url: `/v1/domains/product/${id}`,
    securityContext: tenantB
  });
  assert.equal(crossTenantRead.status, 404);

  const transition = await api({
    method: 'POST',
    url: `/v1/domains/product/${id}/transition`,
    securityContext: tenantA,
    body: { state: 'active' }
  });
  assert.equal(transition.status, 200);
  assert.equal(transition.body.state, 'active');

  const crossTenantTransition = await api({
    method: 'POST',
    url: `/v1/domains/product/${id}/transition`,
    securityContext: tenantB,
    body: { state: 'archived' }
  });
  assert.equal(crossTenantTransition.status, 404);
});

test('creation fails closed when atomic idempotency is unavailable', async () => {
  const { api } = fixture({ withIdempotency: false });
  const response = await api({
    method: 'POST',
    url: '/v1/domains/product',
    headers: { 'idempotency-key': 'missing-store-01' },
    securityContext: tenantA,
    body: { name: 'P' }
  });
  assert.equal(response.status, 503);
});

test('unknown domains and unsupported methods stay outside business writes', async () => {
  const { api, records } = fixture();
  const unknown = await api({
    method: 'GET',
    url: '/v1/domains/unknown/id',
    securityContext: tenantA
  });
  assert.equal(unknown.status, 404);

  const unsupported = await api({
    method: 'DELETE',
    url: '/v1/domains/product/id',
    securityContext: tenantA
  });
  assert.equal(unsupported.status, 405);
  assert.equal(records.size, 0);
});
