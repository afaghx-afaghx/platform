# AFAGHX Architecture

`AFX-MASTER-ARCH-001 V2.0` is the canonical architecture authority for the AFAGHX Ecosystem Platform.

## Source of truth

`afaghx-afaghx/platform` is the canonical mother repository and Source of Truth. No production implementation, architecture decision, security control, contract, infrastructure definition, or operational evidence may be maintained in a parallel AFAGHX repository unless an explicit ADR authorizes it.

## Canonical seven-layer model

```text
1. AFX-CORE
2. AFX-PLATFORM
3. BUSINESS DOMAIN
4. DATA & INTELLIGENCE
5. EXPERIENCE
6. INFRASTRUCTURE
7. ENGINEERING & GOVERNANCE
```

## Canonical runtime

```text
HTTP Request
   ↓
Gateway / HTTP Security Boundary
   ↓
PersistentAfxCore
   ↓
PostgresAfxCoreRepository
   ↓
PostgreSQL
```

The in-memory `AfxCore` implementation is not a production authority. It may only be used by explicitly classified deterministic tests/fixtures.

## Non-negotiable boundaries

1. AFX-CORE is the single trust and security authority.
2. Experience never accesses a database directly and never becomes an alternate identity/token authority.
3. Each bounded context owns its business truth and persistence; cross-domain database access is prohibited.
4. Public APIs and events are explicit and versioned.
5. Intelligence/AI consumes governed contracts, events and data products and cannot bypass authorization or evidence gates.
6. Infrastructure owns KMS/secrets, network/TLS, deployment, observability, backup/recovery and runtime trust controls.
7. Architecture-controlled changes require an ADR and reproducible evidence before GREEN.

## Core ownership

AFX-CORE owns Identity, Authentication, Credentials, Sessions, Organization, Membership, Tenant Context, RBAC, Authorization, Policy, Audit, Consent, Trust, Configuration, Feature Flags and Module Registry.

AFX-CORE does not own business-domain truth such as Product, Commerce, Order, Payment, Supplier, Factory, Procurement, Logistics, Marketing, Advertising, Analytics or AI.

## Status vocabulary

- **LOCKED** — architecture authority is fixed and changes require controlled review.
- **GREEN** — reproducible implementation and CI/runtime evidence satisfy the closure criteria.
- **BLOCKED** — a required control lacks evidence or depends on an external prerequisite.

Production/security completion remains separately governed by the G01 security closure matrix. Architecture GREEN must never be used to imply release security GREEN.

## Historical baseline

`docs/architecture/AFX-MASTER-ARCH-001.md` is retained as **V1 — SUPERSEDED** provenance only. It is not an active authority.
