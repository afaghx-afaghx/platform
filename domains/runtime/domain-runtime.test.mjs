import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN_DEFINITIONS, DomainRepository, createDomainRecord, transitionDomainRecord } from './domain-runtime.mjs';

const tenantId = 'tenant-runtime-tests';

test('all eleven canonical domains have executable definitions', () => {
  assert.deepEqual(Object.keys(DOMAIN_DEFINITIONS), [
    'product','commerce','order','factory','supplier','service','partner','marketing','advertising','logistics','payment'
  ]);
});

test('product lifecycle is enforced', () => {
  const product = createDomainRecord('product', { tenantId, name: 'Steel Coil' });
  assert.equal(product.state, 'draft');
  const active = transitionDomainRecord(product, 'active');
  assert.equal(active.state, 'active');
  assert.throws(() => transitionDomainRecord(active, 'draft'), /invalid_transition/);
});

test('tenant context is mandatory when creating a domain record', () => {
  assert.throws(() => createDomainRecord('product', { name: 'Unscoped product' }), /tenant_context_required/);
});

test('order lifecycle prevents invalid completion', () => {
  const order = createDomainRecord('order', { tenantId, customerId: 'customer-1' });
  assert.equal(order.state, 'pending');
  const confirmed = transitionDomainRecord(order, 'confirmed');
  const fulfilled = transitionDomainRecord(confirmed, 'fulfilled');
  assert.equal(fulfilled.state, 'fulfilled');
  assert.throws(() => transitionDomainRecord(fulfilled, 'cancelled'), /invalid_transition/);
});

test('payment validates amount and currency and follows capture/refund lifecycle', () => {
  assert.throws(() => createDomainRecord('payment', { tenantId, amount: 0, currency: 'USD' }), /invalid_payment_amount/);
  assert.throws(() => createDomainRecord('payment', { tenantId, amount: 10, currency: 'usd' }), /invalid_payment_currency/);
  const payment = createDomainRecord('payment', { tenantId, amount: 10, currency: 'USD' });
  const authorized = transitionDomainRecord(payment, 'authorized');
  const captured = transitionDomainRecord(authorized, 'captured');
  const refunded = transitionDomainRecord(captured, 'refunded');
  assert.equal(refunded.state, 'refunded');
});

test('repository delegates tenant-scoped persistence without taking domain ownership', async () => {
  const rows = new Map();
  const adapter = {
    async insert(table, record) { rows.set(`${table}:${record.data.tenantId}:${record.id}`, record); },
    async findById(table, id, requestedTenantId) { return rows.get(`${table}:${requestedTenantId}:${id}`) ?? null; },
    async updateState(table, id, state, updatedAt, requestedTenantId, expectedState) {
      const key = `${table}:${requestedTenantId}:${id}`;
      const current = rows.get(key);
      if (!current || current.state !== expectedState) throw new Error('domain_record_changed_or_not_found');
      rows.set(key, { ...current, state, updatedAt });
    }
  };
  const repository = new DomainRepository(adapter);
  const service = await repository.create('service', { name: 'Inspection' }, tenantId);
  const active = await repository.transition('service', service.id, 'active', tenantId);
  assert.equal((await repository.get('service', service.id, tenantId)).state, 'active');
  assert.equal(await repository.get('service', service.id, 'tenant-other'), null);
  assert.equal(active.state, 'active');
  await assert.rejects(repository.create('service', { name: 'Spoofed', tenantId: 'tenant-other' }, tenantId), /tenant_mismatch/);
});

test('every domain rejects unknown state transitions', () => {
  for (const domain of Object.keys(DOMAIN_DEFINITIONS)) {
    const definition = DOMAIN_DEFINITIONS[domain];
    const seed = { tenantId };
    for (const field of definition.required) seed[field] = field === 'amount' ? 1 : field === 'currency' ? 'USD' : 'x';
    const record = createDomainRecord(domain, seed);
    assert.throws(() => transitionDomainRecord(record, '__invalid__'), /invalid_transition/);
  }
});
