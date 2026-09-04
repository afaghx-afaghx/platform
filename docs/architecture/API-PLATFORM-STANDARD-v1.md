# AFAGHX API Platform Standard v1

## URL

External HTTP APIs use `/api/v1/...`. Breaking changes require a new major API version.

## Request security

Protected routes require a validated SecurityContext. Authentication, tenant membership and authorization are evaluated server-side. A client-provided tenant identifier is only a requested context.

## Headers

- `Authorization: Bearer <access-token>` for access-token clients.
- `X-AFX-Tenant-Id` to request tenant context when the identity has multiple memberships.
- `X-Request-Id` accepted for tracing and replaced/generated when absent.
- `Idempotency-Key` required for retry-sensitive commands where documented by the endpoint.

## Error envelope

```json
{
  "code": "AUTHORIZATION_DENIED",
  "message": "Request denied",
  "traceId": "uuid",
  "details": {}
}
```

Clients MUST use `code` for machine behavior and MUST NOT parse human-readable messages.

## Resource rules

- Pagination, filtering and sorting use explicit documented parameters.
- Resource identifiers are opaque identifiers; authorization is checked before revealing protected state.
- Commands must be safe against retries when marked idempotent.
- Sensitive values are never returned unless explicitly required by the contract.
- OpenAPI is the source of truth for public HTTP contracts.
