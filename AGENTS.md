# AFAGHX Engineering Constitution

## Mission
Build AFAGHX as a secure, multi-tenant, extensible Ecosystem Platform with explicit ownership, contract-first integration, and long-term operational stability.

## Non-negotiable rules

1. AFX-CORE is the single foundation for identity, authentication, authorization, tenant context, membership, policy, audit, consent, trust, configuration, feature flags, and module registration.
2. No domain service may introduce an independent authentication authority.
3. Every protected request resolves and validates security context before resource access.
4. Tenant isolation is enforced at every applicable API, application, data, cache, messaging, search, file, and observability boundary.
5. Domain ownership is explicit. Shared code must not become an accidental distributed domain layer.
6. Public contracts are versioned and compatibility is deliberate.
7. Events are contracts and consumers must tolerate duplicate delivery where applicable.
8. Secrets, credentials, tokens, private keys, and production configuration values never enter source control.
9. Infrastructure is reproducible and environment-specific configuration is separated from application code.
10. Architecture decisions are documented as ADRs before irreversible structural choices.
11. Production changes require automated validation and explicit approval.
12. Destructive migrations require rollback planning and explicit review.

## Dependency direction

`EXPERIENCE → DOMAIN/PLATFORM → CORE`

`INTELLIGENCE → approved contracts/events/data products`

CORE must never depend on business domains. Domains may consume approved CORE and PLATFORM contracts but may not bypass authorization or tenant context.

## Canonical request flow

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

## Quality gates

Formatting, linting, unit/integration tests, contract validation, dependency/security scanning, secret detection, container/IaC validation, and migration-safety checks are mandatory as implementation matures.
