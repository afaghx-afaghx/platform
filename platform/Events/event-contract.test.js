import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEventContract, createEvent } from './event-contract.js';

test('creates an immutable tenant-scoped versioned event envelope', () => {
  const event = createEvent({
    eventId: 'evt-01',
    eventType: 'order.created',
    schemaVersion: 'v1',
    occurredAt: '2026-09-10T20:00:00Z',
    producer: 'order-service',
    tenantId: 'tenant-a',
    organizationId: 'org-a',
    correlationId: 'corr-01',
    causationId: 'cmd-01',
    payload: { orderId: 'order-1' },
    metadata: { traceId: 'trace-1' },
  });

  assert.deepEqual(event, {
    eventId: 'evt-01',
    eventType: 'order.created',
    schemaVersion: 'v1',
    occurredAt: '2026-09-10T20:00:00.000Z',
    producer: 'order-service',
    tenantId: 'tenant-a',
    organizationId: 'org-a',
    correlationId: 'corr-01',
    causationId: 'cmd-01',
    payload: { orderId: 'order-1' },
    metadata: { traceId: 'trace-1' },
  });
  assert.throws(() => { event.eventType = 'tampered'; }, TypeError);
  assert.throws(() => { event.metadata.traceId = 'tampered'; }, TypeError);
});

test('defaults schema version and correlation id without weakening tenancy', () => {
  const event = createEvent({
    eventId: 'evt-02',
    eventType: 'inventory.updated',
    producer: 'inventory-service',
    tenantId: 'tenant-a',
    payload: { sku: 'sku-1' },
  });
  assert.equal(event.schemaVersion, 'v1');
  assert.equal(event.correlationId, 'evt-02');
  assert.equal(event.tenantId, 'tenant-a');
});

test('rejects missing or malformed contract fields', () => {
  assert.throws(() => createEvent({ eventId: 'e1', eventType: 'Order.Created', producer: 'p', tenantId: 't', payload: {} }), /invalid_event_type/);
  assert.throws(() => createEvent({ eventId: 'e1', eventType: 'order.created', schemaVersion: '1', producer: 'p', tenantId: 't', payload: {} }), /invalid_schema_version/);
  assert.throws(() => createEvent({ eventType: 'order.created', producer: 'p', tenantId: 't', payload: {} }), /invalid_event_id/);
  assert.throws(() => createEvent({ eventId: 'e1', eventType: 'order.created', producer: 'p', tenantId: 't', occurredAt: 'not-a-date', payload: {} }), /invalid_occurred_at/);
  assert.throws(() => createEvent({ eventId: 'e1', eventType: 'order.created', producer: 'p', payload: {} }), /invalid_tenant_id/);
});

test('validates an existing event through the same contract', () => {
  const event = {
    eventId: 'evt-03',
    eventType: 'payment.authorized',
    schemaVersion: 'v1',
    occurredAt: '2026-09-10T20:01:00Z',
    producer: 'payment-service',
    tenantId: 'tenant-b',
    payload: { paymentId: 'pay-1' },
    metadata: {},
  };
  assert.equal(assertEventContract(event).eventId, 'evt-03');
});
