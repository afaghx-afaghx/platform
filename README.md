# AFAGHX Platform

> The mother repository for the AFAGHX Ecosystem Platform.

AFAGHX is an ecosystem platform for commerce, industry, services, business communication, intelligence, and extensible digital capabilities. It is not a storefront with modules bolted on; it is a governed platform with explicit architectural boundaries.

## Mother architecture

```text
EXPERIENCE
    ↓
DOMAIN / PLATFORM
    ↓
AFX-CORE
    ↓
Infrastructure

INTELLIGENCE → approved contracts / events / data products
```

### Five layers

1. **AFX-CORE** — identity, authentication, authorization, organization, membership, tenant context, RBAC, policy, audit, consent, trust, configuration, feature flags, module registry.
2. **AFX-PLATFORM** — gateway, messaging, notifications, search, files, workflow, billing, observability, integrations.
3. **DOMAIN** — independently owned business capabilities with explicit bounded contexts.
4. **INTELLIGENCE** — AI, analytics, recommendations, automation, and data products consuming approved contracts/events.
5. **EXPERIENCE** — web, administration, partner, and future mobile experiences.

## Canonical security flow

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

No domain may establish an independent authentication authority or bypass tenant/security context.

## Repository map

```text
apps/           User-facing and edge applications
core/           AFX-CORE foundation
platform/       Shared platform capabilities
domains/        Bounded business domains
intelligence/   AI, analytics, recommendations, automation
packages/       Reusable engineering packages
contracts/      OpenAPI, events, schemas
infra/          Docker, Kubernetes, Terraform, environment definitions
docs/            Architecture, ADRs, security, operations
.github/        CI, ownership, governance, templates
```

## Status

This branch establishes the executable mother-repository foundation. Production domain implementations are intentionally introduced behind explicit contracts, ADRs, tests, and security gates.

See `AGENTS.md` and `docs/architecture/overview.md`.