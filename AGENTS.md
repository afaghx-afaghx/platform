# AFAGHX Engineering Constitution

## Mission

Build AFAGHX as a secure, multi-tenant, extensible Ecosystem Platform with clear architectural boundaries and long-term operational stability.

## Non-negotiable rules

1. AFX-CORE is the single foundation for identity, authentication, authorization, tenant context, membership, policy, audit, consent, trust, configuration, feature flags, and module registration.
2. No domain service may introduce an independent authentication authority.
3. Every request must resolve and validate security context before protected resource access.
4. Tenant isolation is mandatory at API, application, data, cache, messaging, search, file, and observability boundaries where applicable.
5. Domain ownership is explicit. Shared code must not become an accidental distributed domain layer.
6. Public contracts are versioned and compatibility is deliberate.
7. Events are treated as contracts and must be idempotent where consumers can receive duplicates.
8. Secrets, credentials, tokens, private keys, and production configuration values must never be committed.
9. Infrastructure must be reproducible and environment-specific configuration must be separated from application code.
10. Architecture decisions are documented as ADRs before irreversible structural choices.
11. Production changes require automated validation and an explicit approval gate.
12. Destructive migrations require a rollback strategy and explicit review.

## Dependency direction

`EXPERIENCE → DOMAIN/PLATFORM → CORE`

`INTELLIGENCE → approved contracts/events/data products`

CORE must not depend on business domains. Domains may depend on CORE contracts and approved platform capabilities, but must not bypass authorization or tenant context.

## Canonical request flow

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

## Repository policy

The mother repository is the canonical implementation home during bootstrap. Companion repositories may be introduced only when there is a concrete ownership, release, security, or operational reason.

## Quality gates

Expected gates include formatting, linting, unit/integration tests, contract validation, dependency/security scanning, secret detection, container/IaC validation, and migration safety checks as the implementation matures.
