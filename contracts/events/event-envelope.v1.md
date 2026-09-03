# AFAGHX Event Envelope v1

Every cross-boundary event MUST use this envelope.

```json
{
  "id": "uuid",
  "type": "product.published",
  "version": 1,
  "occurredAt": "2026-09-04T00:00:00Z",
  "producer": "domain.product",
  "tenantId": "uuid",
  "organizationId": "uuid",
  "subjectId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "data": {}
}
```

## Rules

- `id` is globally unique and is the idempotency key for the event.
- `type` and `version` are part of the public contract.
- `tenantId` is mandatory for tenant-scoped events and MUST NOT be inferred by consumers from payload data.
- Consumers MUST be idempotent.
- Producers MUST NOT publish passwords, tokens, secrets, private keys or sensitive credentials.
- Schema changes that break consumers require a new version.
- Retryable failures use bounded retry with dead-letter handling; poison messages MUST NOT loop forever.
- Correlation and causation identifiers must be preserved across asynchronous boundaries.
