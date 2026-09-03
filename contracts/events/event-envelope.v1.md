# Event Envelope

Reference shape for AFAGHX asynchronous events:

```json
{
  "id": "event-uuid",
  "type": "resource.action.v1",
  "version": 1,
  "occurredAt": "2026-01-01T00:00:00Z",
  "tenantId": "tenant-id",
  "actorId": "actor-id",
  "correlationId": "request-id",
  "causationId": "parent-event-id",
  "data": {}
}
```

`tenantId`, `actorId`, and causation metadata are included when applicable. Consumers must be idempotent for delivery paths that can duplicate messages.
