import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfferQuery } from './offer-query.mjs';

test('offer query requires authentication and authorization', async () => {
  const core = {
    async authenticateAccessToken(token) { if (token !== 'valid-token') throw new Error('unauthorized'); return { userId:'u1', tenantId:'t1' }; },
    async authorize() { return false; },
    async getOrganization() { return null; }
  };
  const query = createOfferQuery({ core, repository: { async findActiveByProduct() { throw new Error('must not call'); } } });
  assert.equal((await query({ productId:'p1' })).status, 401);
  assert.equal((await query({ authorization:'Bearer valid-token', productId:'p1' })).status, 403);
});

test('offer query filters cross-tenant or inactive organizations', async () => {
  const core = {
    async authenticateAccessToken() { return { userId:'u1', tenantId:'t1' }; },
    async authorize() { return true; },
    async getOrganization(id) { if (id === 'org-a') return { id:'org-a', tenantId:'t1', status:'active' }; if (id === 'org-b') return { id:'org-b', tenantId:'t2', status:'active' }; return null; }
  };
  const query = createOfferQuery({ core, repository: { async findActiveByProduct() { return [{id:'o-a',productId:'p1',organizationId:'org-a',status:'active',currency:'USD',price:12.5},{id:'o-b',productId:'p1',organizationId:'org-b',status:'active',currency:'USD',price:13.5}]; } } });
  const response = await query({ authorization:'Bearer valid-token', productId:'p1' });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items.map(x=>x.id), ['o-a']);
  assert.equal(response.body.items[0].price, 12.5);
});