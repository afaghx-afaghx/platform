# AFAGHX Contracts

Contract-first boundary for AFX-CORE and all future platform/domain integrations.

## Layout

- `openapi/` — synchronous HTTP API contracts.
- `events/` — asynchronous event contracts and envelopes.
- `schemas/` — reusable JSON Schemas.

## Rules

1. Contracts are versioned and backward-compatible by default.
2. IDs are opaque UUIDs; clients must not infer business meaning from them.
3. Tenant-scoped operations require validated organization/tenant context.
4. Correlation and causation identifiers are propagated across synchronous and asynchronous boundaries.
5. Consumers must be idempotent for at-least-once event delivery.
6. Breaking API/event changes require a new major version and an explicit ADR.
7. Secrets, credentials, access tokens, and personal authentication material never belong in contracts.

The canonical public API endpoint is `https://api.afaghx.com`; deployment topology is intentionally separated from these contracts.
