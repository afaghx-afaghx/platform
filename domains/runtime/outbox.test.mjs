import test from 'node:test';
import assert from 'node:assert/strict';
import { createOutboxDispatcher } from './outbox.mjs';

function fakeStore(items) {
  const state = new Map(items.map(item => [item.eventId, { ...item, status: 'pending', attempts: 0 }]));
  return {
    state,
    async claimBatch({ workerId, batchSize }) {
      const claimed = [];
      for (const item of state.values()) {
        if (item.status === 'pending' && claimed.length < batchSize) {
          item.status = 'processing';
          item.workerId = workerId;
          item.attempts += 1;
          claimed.push({ ...item });
        }
      }
      return claimed;
    },
    async markPublished(eventId, workerId) {
      const item = state.get(eventId);
      if (!item || item.status !== 'processing' || item.workerId !== workerId) throw new Error('outbox_lease_lost');
      item.status = 'published';
    },
    async markFailed(eventId, workerId, { attempts, maxAttempts }) {
      const item = state.get(eventId);
      if (!item || item.status !== 'processing' || item.workerId !== workerId) throw new Error('outbox_lease_lost');
      item.status = attempts >= maxAttempts ? 'dead_letter' : 'pending';
      return item.status;
    }
  };
}

test('dispatcher publishes and marks successful events', async () => {
  const store = fakeStore([{ eventId: 'e1', event: { metadata: { eventId: 'e1' } }, attempts: 0 }]);
  const seen = [];
  const worker = createOutboxDispatcher({ store, publish: async event => seen.push(event.metadata.eventId) });
  const result = await worker.dispatchOnce();
  assert.deepEqual(result, { claimed: 1, published: 1, retried: 0, deadLettered: 0 });
  assert.deepEqual(seen, ['e1']);
  assert.equal(store.state.get('e1').status, 'published');
});

test('publisher failures are retried and eventually dead-lettered', async () => {
  const store = fakeStore([{ eventId: 'e2', event: { metadata: { eventId: 'e2' } }, attempts: 0 }]);
  const worker = createOutboxDispatcher({
    store,
    publish: async () => { throw Object.assign(new Error('network failure'), { code: 'redis_unavailable' }); },
    maxAttempts: 1
  });
  const result = await worker.dispatchOnce();
  assert.deepEqual(result, { claimed: 1, published: 0, retried: 0, deadLettered: 1 });
  assert.equal(store.state.get('e2').status, 'dead_letter');
});

test('dispatcher validates publisher and store contracts', () => {
  assert.throws(() => createOutboxDispatcher({ store: {}, publish: async () => {} }), /outbox_store_required/);
  assert.throws(() => createOutboxDispatcher({ store: fakeStore([]) }), /outbox_publisher_required/);
});
