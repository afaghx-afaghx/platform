# AFX-ARCHITECTURE-100 — Architecture Lock

**Status:** LOCKED
**Version:** 2.0.0
**Date:** 2026-09-24
**Authority:** AFAGHX Architecture Governance

## Decision

The AFAGHX master architecture is frozen at `AFX-MASTER-ARCH-001 v2.0.0`. This lock prevents architecture drift during implementation. New functionality must fit an existing layer, bounded context and ownership boundary; structural changes require an ADR.

## Canonical architecture model

**Modular Monolith + API First + Event Ready + Microservice Ready**

The target infrastructure may evolve to Kubernetes, service mesh and independently deployed services only when evidence and operational need justify it.

## Canonical eleven layers

1. AFX-CORE
2. Stakeholders
3. Business Domains
4. Data & Intelligence
5. AFX-EXPERIENCE
6. Infrastructure
7. Engineering & Governance
8. Integration & Ecosystem
9. Cross-Cutting Concerns
10. Data Governance & Master Data
11. Lifecycle & Evolution

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

## Canonical runtime and API boundary

Production authentication follows: Gateway → PersistentAfxCore → AfxCoreRepository → PostgreSQL.

Experience is presentation-only and uses https://api.afaghx.com. Experience must not create a second authentication authority or access persistence directly.

Authorization follows: Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State → Decision, with DENY as the default.

Implemented is not Proven. Proven is not Production Ready. No GREEN without evidence.

## Next engineering gate

With architecture locked, implementation proceeds through:

`AFX-CORE Specification → ERD/Schema → API Contracts → Event Contracts → Tests → CI → Runtime Evidence → G01 Security Closure → Domain Unfreeze.`
