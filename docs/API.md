# API

AFAGHX exposes business and platform behavior through explicit versioned API contracts.

## Canonical boundary
Experience clients communicate through the canonical API boundary at `api.afaghx.com`. The API Gateway is responsible for transport routing, security enforcement, rate limiting, versioning, and policy enforcement; it is not a business-logic owner.

## Security context
Protected requests resolve:
`Authentication → Identity → Tenant Context → Membership → RBAC → Policy → Resource State`

API and event contracts are versioned and tested. Breaking changes require an ADR and an explicit migration path.
