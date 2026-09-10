const EVENT_NAME = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)*$/;
const VERSION = /^v\d+$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const freeze = Object.freeze;

function requiredId(value, field) {
  const normalized = String(value ?? '');
  if (!ID.test(normalized)) throw new TypeError(`invalid_${field}`);
  return normalized;
}

function requiredIso(value) {
  const normalized = String(value ?? '');
  if (Number.isNaN(Date.parse(normalized))) throw new TypeError('invalid_occurred_at');
  return new Date(normalized).toISOString();
}

/**
 * Build the platform event envelope. Business meaning stays in the payload;
 * the envelope only carries transport, tenancy, tracing and compatibility data.
 */
export function createEvent({
  eventId,
  eventType,
  schemaVersion = 'v1',
  occurredAt = new Date().toISOString(),
  producer,
  tenantId,
  organizationId,
  correlationId,
  causationId,
  payload,
  metadata = {},
} = {}) {
  if (!EVENT_NAME.test(String(eventType ?? ''))) throw new TypeError('invalid_event_type');
  if (!VERSION.test(String(schemaVersion ?? ''))) throw new TypeError('invalid_schema_version');
  const normalizedProducer = requiredId(producer, 'producer');
  const normalizedTenant = requiredId(tenantId, 'tenant_id');
  const normalizedEventId = requiredId(eventId, 'event_id');
  const normalizedCorrelation = requiredId(correlationId ?? normalizedEventId, 'correlation_id');

  return freeze({
    eventId: normalizedEventId,
    eventType: String(eventType),
    schemaVersion: String(schemaVersion),
    occurredAt: requiredIso(occurredAt),
    producer: normalizedProducer,
    tenantId: normalizedTenant,
    organizationId: organizationId === undefined ? undefined : requiredId(organizationId, 'organization_id'),
    correlationId: normalizedCorrelation,
    causationId: causationId === undefined ? undefined : requiredId(causationId, 'causation_id'),
    payload,
    metadata: freeze({ ...metadata }),
  });
}

export function assertEventContract(event) {
  return createEvent(event);
}
