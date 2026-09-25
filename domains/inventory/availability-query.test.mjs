import test from 'node:test';
import assert from 'node:assert/strict';
import { createAvailabilityQuery } from './availability-query.mjs';

test('availability query requires permission and tenant isolation', async () => {
  const core = {
    async authenticateAccessToken(token) { if (token !== 'valid-token') throw new Error('unauthorized'); return { userId:'u1', tenantId:'t1' }; },
    async authorize() { return false; }
  };
  const query = createAvailabilityQuery({ core, repository:{ async findByOfferId(){ throw new Error('must not call'); } } });
  assert.equal((await query({ offerId:'o1' })).status, 401);
  assert.equal((await query({ authorization:'Bearer valid-token', offerId:'o1' })).status, 403);
});

test('availability returns persisted inventory projection', async () => {
  const core = { async authenticateAccessToken() { return { userId:'u1', tenantId:'t1' }; }, async authorize() { return true; } };
  const query = createAvailabilityQuery({ core, repository:{ async findByOfferId(){ return { offerId:'o1',tenantId:'t1',status:'available',availableQuantity:42,updatedAt:'2026-09-26T00:00:00.000Z' }; } } });
  const response = await query({ authorization:'Bearer valid-token', offerId:'o1' });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body,{offerId:'o1',status:'available',availableQuantity:42,updatedAt:'2026-09-26T00:00:00.000Z'});
});