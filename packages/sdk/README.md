# @afaghx/sdk

Typed consumer SDK for the canonical AFAGHX API boundary.

## Boundary
- Consumes versioned types from `@afaghx/contracts`.
- Provides transport, authentication-context, and tenant-context helpers.
- Does not own identity, authentication, authorization, tenant policy, persistence, business rules, or secrets.
- Does not connect to PostgreSQL or any other database.
- Does not invent domain endpoints.

## Usage
Construct `AfxClient` with the canonical API origin and a fetch implementation. Use `auth.getContext()` for the known `/v1/auth/context` contract. Tenant helpers validate or extract tenant context returned by AFX-CORE-backed API responses; they do not create tenant authority.

## Versioning
SDK versioning follows Semantic Versioning. Breaking contract changes require an architecture/contract decision and migration path.
