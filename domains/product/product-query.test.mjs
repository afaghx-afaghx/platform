import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductQuery } from './product-query.mjs';

function fixture() {
  const records = new Map([
    ['p1', {
      id: 'p1',
      state: 'active',
      data: {
        tenantId: 'tenant-a',
        name: 'Copper Cable',
        slug: 'copper-cable',
        category: 'electrical-equipment',
        description: 'Real product record',
        price: 999,
        stock: 17,
        paymentState: 'captured',
        orderState: 'fulfilled'
      },
      createdAt: '2026-09-26T00:00:00.000Z',
      updatedAt: '2026-09-26T00:00:00.000Z'
    }],
    ['p-draft', {
      id: 'p-draft',
      state: 'draft',
      data: { tenantId: 'tenant-a', name: 'Draft Product' },
      createdAt: '2026-09-26T00:00:00.000Z',
      updatedAt: '2026-09-26T00:00:00.000Z'
    }],
    ['p2', {
      id: 'p2',
      state: 'active',
      data: { tenantId: 'tenant-b', name: 'Other Tenant Product' },
      createdAt: '2026-09-26T00:00:00.000Z',
      updatedAt: '2026-09-26T00:00:00.000Z'
    }]
  ]);
  const repository = {
    async findById(_domain, id) {
      return records.get(id) || null;
    }
  };
  return createProductQuery({ repository });
}

test('requires immutable SecurityContext', async () => {
  const query = fixture();
  assert.equal((await query({ id: 'p1' })).status, 401);
  assert.equal((await query({ securityContext: { userId: 'u1' }, id: 'p1' })).status, 401);
});

test('enforces tenant isolation using only Gateway SecurityContext', async () => {
  const query = fixture();
  assert.equal((await query({
    securityContext: Object.freeze({ userId: 'u1', tenantId: 'tenant-a', roles: Object.freeze([]) }),
    id: 'p2'
  })).status, 404);
});

test('enforces active resource state', async () => {
  const query = fixture();
  assert.equal((await query({
    securityContext: Object.freeze({ userId: 'u1', tenantId: 'tenant-a', roles: Object.freeze([]) }),
    id: 'p-draft'
  })).status, 404);
});

test('returns a safe Product projection without commercial transaction fields', async () => {
  const query = fixture();
  const response = await query({
    securityContext: Object.freeze({ userId: 'u1', tenantId: 'tenant-a', roles: Object.freeze([]) }),
    id: 'p1'
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    id: 'p1',
    status: 'active',
    name: 'Copper Cable',
    slug: 'copper-cable',
    category: 'electrical-equipment',
    description: 'Real product record',
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z'
  });
  assert.equal('price' in response.body, false);
  assert.equal('stock' in response.body, false);
  assert.equal('paymentState' in response.body, false);
  assert.equal('orderState' in response.body, false);
});
