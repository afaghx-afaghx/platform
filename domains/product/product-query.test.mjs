import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductQuery } from './product-query.mjs';

function fixture() {
  const records = new Map([
    ['p1', {
      id: 'p1', state: 'active',
      data: { tenantId: 'tenant-a', name: 'Copper Cable', slug: 'copper-cable', category: 'electrical-equipment', description: 'Real product record', price: 999, stock: 17 },
      createdAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z'
    }],
    ['p2', {
      id: 'p2', state: 'active',
      data: { tenantId: 'tenant-b', name: 'Other Tenant Product' },
      createdAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z'
    }]
  ]);
  return createProductQuery({ repository: { findById: async (_domain, id) => records.get(id) || null } });
}

test('requires canonical SecurityContext', async () => {
  const query = fixture();
  const response = await query({ id: 'p1' });
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'missing_security_context');
});

test('tenant isolation is derived from SecurityContext', async () => {
  const query = fixture();
  const response = await query({ securityContext: { userId: 'u1', tenantId: 'tenant-b' }, id: 'p1' });
  assert.equal(response.status, 404);
});

test('canonical context can read an active product in its tenant', async () => {
  const query = fixture();
  const response = await query({ securityContext: Object.freeze({ userId: 'u1', tenantId: 'tenant-a' }), id: 'p1' });
  assert.equal(response.status, 200);
  assert.equal(response.body.id, 'p1');
  assert.equal('price' in response.body, false);
  assert.equal('stock' in response.body, false);
});
