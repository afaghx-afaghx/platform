# AFAGHX Platform

> The mother repository for the AFAGHX Ecosystem Platform.

AFAGHX is an ecosystem platform for commerce, industry, services, business communication, intelligence, and extensible digital capabilities. It is not a storefront and not a set of loosely coupled modules.

## Architectural layers

1. **AFX-CORE** — identity, authentication, authorization, organization, membership, tenant context, RBAC, policy, audit, consent, trust, configuration, feature flags, module registry.
2. **AFX-PLATFORM** — API gateway/management, messaging, notifications, search, files, workflow, billing, observability, integrations.
3. **DOMAIN** — independently bounded business capabilities.
4. **INTELLIGENCE** — AI, analytics, recommendations, automation, data intelligence.
5. **EXPERIENCE** — web, administration, partner, and other user-facing applications.

## Security authority

AFX-CORE is the single security authority. The canonical request pipeline is:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State → Audit`

Cross-tenant access is rejected before business policy evaluation. Domains cannot create independent authentication authorities or bypass tenant/security context.

## Current implementation

The repository now contains the first executable AFX-CORE Identity/Security kernel, versioned security contracts, tenant/session persistence schema, security tests, and a CI quality gate. Concrete HTTP adapters, persistence repositories, external IdP integration, JWKS/key rotation, and production deployment are intentionally layered on top of these stable contracts.

## Dependency direction

`EXPERIENCE → DOMAIN/PLATFORM → CORE`

`INTELLIGENCE → approved contracts/events/data products`

CORE must never depend on business domains.

See `AGENTS.md`, `core/identity/README.md`, and `docs/adr/` for the engineering constitution and architectural decisions.
