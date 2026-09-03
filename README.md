# AFAGHX Platform

> The mother repository for the AFAGHX Ecosystem Platform.

AFAGHX is designed as an ecosystem platform for commerce, industry, services, business communication, intelligence, and extensible digital capabilities. It is not designed as a single storefront or a collection of loosely coupled features.

## Architecture

AFAGHX is organized into five architectural layers:

1. **AFX-CORE** — identity, authentication, authorization, organization, membership, tenant context, RBAC, policy, audit, consent, trust, configuration, feature flags, and module registry.
2. **AFX-PLATFORM** — shared platform capabilities such as messaging, notifications, search, files, workflow, billing, observability, and integrations.
3. **DOMAIN** — independently bounded business capabilities.
4. **INTELLIGENCE** — AI, analytics, recommendations, automation, and data intelligence.
5. **EXPERIENCE** — web, administration, partner, and other user-facing applications.

### Canonical security/request flow

`Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State`

Domain modules must not create independent authentication silos.

## Repository map

```text
apps/           User-facing and edge applications
core/           AFX-CORE foundation modules
platform/       Shared platform services
domains/        Bounded business domains
intelligence/   AI, analytics, recommendations, automation
packages/       Reusable engineering packages
contracts/      OpenAPI, events, and schemas
infra/          Docker, Kubernetes, Terraform, environments
docs/           Architecture, ADRs, API, security, operations
.github/        CI, governance, templates, ownership
```

## Engineering principles

- Security and tenant isolation are foundational, not optional features.
- Contracts are explicit and versioned.
- Business domains own business rules; CORE owns cross-cutting identity and trust primitives.
- Prefer asynchronous events for decoupled cross-domain workflows.
- APIs are backward-compatible by default and governed through contracts.
- Infrastructure is reproducible as code.
- Main is protected by review and automated quality/security gates once branch governance is enabled.
- Production deployment requires explicit approval.
- Secrets never belong in source control.
- Architecture decisions are recorded as ADRs.

## Status

This repository is currently the bootstrap point for the AFAGHX mother architecture. The structure is intentionally established before implementation so future services and modules have a stable architectural home.

See `AGENTS.md` for the engineering constitution and `docs/architecture/` for architectural governance.
