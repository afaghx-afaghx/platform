# AFX-ARCHITECTURE-100 — Architecture Lock

**Status:** LOCKED
**Version:** 1.0.0
**Date:** 2026-09-07
**Authority:** AFAGHX Architecture Governance

## Decision

The AFAGHX master architecture is frozen at `AFX-MASTER-ARCH-001 v1.0.0`. This lock prevents architecture drift during implementation. New functionality must fit an existing layer and ownership boundary; structural changes require an ADR.

## Canonical seven layers

1. AFX-CORE
2. AFX-PLATFORM
3. BUSINESS DOMAIN
4. DATA & INTELLIGENCE
5. EXPERIENCE
6. INFRASTRUCTURE
7. ENGINEERING & GOVERNANCE

## Core is frozen as the single trust foundation

AFX-CORE owns:

`Identity, User Lifecycle, Credentials, Authentication, Sessions, Organization, Membership, Tenant Context, RBAC, Authorization, Policy, Audit, Consent, Trust, Configuration, Feature Flags, Registry.`

It does not own product, commerce, order, payment, supplier, factory, procurement, logistics, marketing, advertising, analytics, AI, SEO, or other business-domain truth.

## Boundary rules

- Experience never accesses persistence directly.
- Domains never access another domain's persistence.
- Core never depends on business domains.
- AI/analytics never bypass approved contracts, events, or governed data products.
- Security context is established before resource access.
- Authorization is deny-by-default and tenant-aware.
- Secrets and cryptographic material remain behind the KMS/secrets boundary.
- Public APIs and events are explicit and versioned.
- Security failures fail closed.

## Architecture artifacts that constitute the lock

- `AGENTS.md` — engineering constitution
- `docs/architecture/AFX-MASTER-ARCH-001.md` — master architecture
- `docs/architecture/AFX-CORE-001-SPEC.md` — executable Core boundary/specification
- `docs/architecture/dependency-rules.md` — dependency constraints
- `docs/architecture/system-context.md` — system context
- `docs/architecture/adr/ADR-001-canonical-architecture-baseline.md` — baseline decision
- `.ai/architecture/system-map.yaml` — governed system map
- `.ai/architecture/module-map.yaml` — governed module registry

## Exit criteria

Architecture is considered 100% complete when:

- the seven-layer model is consistent across governance artifacts;
- AFX-CORE ownership and exclusions are explicit;
- actor, tenant, authorization, policy and persistence boundaries are explicit;
- dependency direction is explicit;
- API/event/versioning rules are explicit;
- security and cryptographic trust boundaries are explicit;
- architecture-controlled changes require ADR;
- implementation can proceed without reopening the master architecture for ordinary features.

## Important separation

**Architecture 100% is not the same claim as production security 100%.** Production security remains governed by the G01 security closure matrix and requires executable tests, CI, runtime evidence, infrastructure controls and environment-dependent acceptance. No architecture lock may be used to falsely mark those controls complete.

## Next engineering gate

With architecture locked, implementation proceeds through:

`AFX-CORE Specification → ERD/Schema → API Contracts → Event Contracts → Tests → CI → Runtime Evidence → G01 Security Closure → Domain Unfreeze.`
