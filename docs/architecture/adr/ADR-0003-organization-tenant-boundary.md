# ADR-0003 — Organization and Tenant Boundary

- Status: Accepted
- Date: 2026-09-04

## Decision

AFAGHX distinguishes **Organization** from **Tenant**.

- **Organization** is the business, legal, or operational actor.
- **Tenant** is the security and data-isolation boundary.
- An organization may own multiple tenants.
- A membership connects an identity to an organization and a tenant.
- A client-supplied tenant identifier is only a requested context; it becomes trusted only after server-side membership validation.

## Consequences

This separation allows one organization to operate multiple isolated business contexts without weakening the trust model. Tenant scope must be preserved through API, database, cache, messaging, search, files, and observability.

Cross-tenant administration is an explicit privileged capability, never an implicit consequence of organization ownership, and must be audited.
