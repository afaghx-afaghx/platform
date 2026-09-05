# ADR-001: AFAGHX Canonical Architecture Baseline

- **Status:** Accepted
- **Date:** 2026-09-05
- **Decision owners:** AFAGHX Architecture Governance

## Context

AFAGHX requires a stable mother architecture for a long-lived multi-tenant ecosystem. The repository already contains an AFX-CORE security foundation, and future capabilities must not create parallel security or data authorities.

## Decision

Adopt the five-layer AFAGHX architecture as the canonical baseline:

`AFX-CORE → AFX-PLATFORM → DOMAIN → INTELLIGENCE → EXPERIENCE`

with dependency direction enforced as:

`EXPERIENCE → PLATFORM/DOMAIN → CORE`

and `INTELLIGENCE → approved contracts/events/data products`.

Identity is the single authority for user lifecycle and credentials. Authentication, authorization, tenant context, membership, policy and trust remain under AFX-CORE. Domain modules cannot create independent authentication silos.

All protected requests resolve the canonical security flow:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`.

Persistence is owned by bounded contexts and accessed through explicit repository/application boundaries. Experience never accesses databases directly. Shared-kernel remains minimal and domain-neutral.

## Consequences

- Architectural drift becomes reviewable instead of implicit.
- New modules can be added without changing the foundation.
- Security and tenant isolation remain centralized and testable.
- Some early implementation work requires adapters/boundaries before feature development; this is intentional.
- Structural exceptions require a new ADR.

## Rejected alternatives

- A flat feature repository with duplicated authentication.
- A single shared database accessed directly by every domain.
- Treating frontend/experience code as a trusted security boundary.
- Making shared-kernel the home for business logic.
