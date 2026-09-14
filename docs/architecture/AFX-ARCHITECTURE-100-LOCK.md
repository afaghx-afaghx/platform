# AFX-ARCHITECTURE-100 — Architecture Lock

**Status:** LOCKED
**Version:** 2.0.0
**Date:** 2026-09-14
**Authority:** AFAGHX Architecture Governance
**Master reference:** `docs/architecture/AFX-MASTER-ARCH-001-V2.md`

## Decision

The AFAGHX master architecture is governed by `AFX-MASTER-ARCH-001 V2.0`. New functionality must fit an existing layer, bounded context and ownership boundary; structural changes require an ADR.

This lock is an architecture lock, not a production-readiness claim. Runtime/security GREEN requires executable evidence.

## Canonical seven layers

1. AFX-CORE
2. AFX-PLATFORM
3. BUSINESS DOMAIN
4. DATA & INTELLIGENCE
5. EXPERIENCE
6. INFRASTRUCTURE
7. ENGINEERING & GOVERNANCE

## Core is the single trust foundation

AFX-CORE owns Identity, Credentials, Authentication, Sessions, Organization, Membership, Tenant Context, RBAC, Authorization, Policy, Audit, Consent, Trust, Configuration, Feature Flags and Registry.

It does not own business-domain truth.

## Canonical runtime

`HTTP → Gateway → PersistentAfxCore → PostgresAfxCoreRepository → PostgreSQL`

The in-memory `AfxCore` implementation is prohibited from production reachability and may only be used by explicitly classified deterministic unit tests/fixtures.

## Boundary rules

- Experience never accesses persistence directly.
- Domains never access another domain's persistence.
- Core never depends on business domains.
- Intelligence/AI never bypasses approved contracts, events or governed data products.
- Security context is established before resource access.
- Authorization is deny-by-default and tenant-aware.
- Secrets and cryptographic material remain behind the KMS/secrets boundary.
- Public APIs and events are explicit and versioned.
- Security failures fail closed.
- Architecture-controlled changes require ADR.
- GREEN requires reproducible evidence tied to an exact commit and CI/runtime result.

## Exit criteria

Architecture is considered complete only when the V2 master specification, system map, module map, dependency rules, domain ownership model, API/event contracts, security boundary and governance controls agree and are machine-checkable.

Production/security completion is separate and remains governed by G01 and later release gates. No architecture document may be used to falsely mark runtime or security controls complete.
