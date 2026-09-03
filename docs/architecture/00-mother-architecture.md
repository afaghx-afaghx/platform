# AFAGHX Mother Architecture v1

## Status
Approved baseline. This document is the architectural source of truth for the bootstrap phase.

## Mission
AFAGHX is an Ecosystem Platform for commerce, industry, services, business communication, intelligence, and extensible digital capabilities. It is not a storefront with loosely coupled modules.

## Five layers

1. **AFX-CORE** — identity, authentication, authorization, organization, membership, tenant context, RBAC, policy, audit, consent, trust, configuration, feature flags, module registry.
2. **AFX-PLATFORM** — API gateway/management, messaging, notifications, search, files, workflow, billing, observability, integrations and shared platform capabilities.
3. **DOMAIN** — independently bounded business capabilities with explicit ownership.
4. **INTELLIGENCE** — AI, analytics, recommendations, automation and data intelligence consuming approved contracts/events/data products.
5. **EXPERIENCE** — web, administration, partner and other user-facing applications.

## Dependency direction

`EXPERIENCE → DOMAIN/PLATFORM → CORE`

`INTELLIGENCE → approved contracts/events/data products`

CORE never depends on business domains.

## Security boundary

Every protected request follows:

`Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State`

No domain may create an independent authentication authority.

## Multi-tenancy

Tenant isolation is enforced wherever applicable across API, application, database, cache, messaging, search, files and observability. Client-supplied tenant identifiers are never trusted without membership/context validation.

## Contract governance

APIs and events are explicit, versioned contracts. Consumers must tolerate duplicate event delivery where applicable. Breaking changes require an ADR and migration plan.

## Architecture rule

During bootstrap, prefer a modular implementation with hard boundaries over premature service proliferation. Extraction into independently deployable services is allowed only when ownership, scaling, release, security or operational isolation justifies it.

## Required foundation sequence

1. Architecture governance and ADRs
2. AFX-CORE identity/authentication/authorization/tenant context
3. Contract system and event conventions
4. Platform primitives
5. Domain boundaries
6. Experience applications
7. Intelligence and data products
8. Infrastructure, observability and production governance
