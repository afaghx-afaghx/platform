# ADR-007: AFAGHX Architecture Constitution Guard

- **Status:** Proposed
- **Date:** 2026-09-29
- **Decision owners:** AFAGHX Architecture Governance

## Context

AFAGHX must preserve a stable architectural spine while allowing implementation to evolve. Lower-level coding standards, framework preferences, microservice decomposition, or local module decisions must not silently replace the canonical architecture.

## Decision

Introduce a machine-enforced **Architecture Constitution Guard**.

The authority hierarchy is:

1. AGENTS.md / AFAGHX Engineering Constitution
2. Approved Master Architecture
3. Accepted ADRs
4. Versioned contracts and bounded-context specifications
5. Implementation and local coding standards

A lower level cannot override a higher level. Any structural exception requires an ADR before implementation.

### Protected invariants

- AFX-CORE remains the single authority for Identity, Authentication, Authorization, Tenant Context, Membership, RBAC, Policy, Audit, Consent and Trust primitives.
- User lifecycle remains under Identity; no parallel user/identity authority may be introduced.
- Experience never accesses Core or domain databases directly.
- Domain persistence ownership remains explicit; direct cross-domain table access is forbidden.
- CORE must not depend on business DOMAIN.
- Public APIs/events remain explicit and versioned.
- Security failures remain fail-closed.
- Structural architecture changes require an ADR.
- Microservice is an implementation/deployment option, not a constitutional requirement. A split is permitted only when its boundary, ownership, contracts, data ownership, security model and operational evidence are documented and approved.
- The API Gateway remains a boundary/control point; it must not become a substitute for domain ownership or a god-controller.

## Consequences

- Architectural drift becomes a machine-detectable failure rather than a review-only concern.
- Framework and deployment choices can evolve without silently changing the constitution.
- Microservice extraction remains possible, but only as an evidence-backed structural decision.
- Teams receive a deterministic failure signal before merge.

## Enforcement

CI executes scripts/architecture-constitution-guard.mjs on pull requests and pushes to main.

The guard checks for forbidden Experience-to-database dependencies, CORE-to-DOMAIN dependency violations, obvious independent identity/authentication authorities outside CORE, obvious direct cross-domain persistence access, unparameterized SQL construction patterns, structural changes without an ADR in the same change set, and non-empty PR descriptions.

Static analysis is an enforcement layer, not proof of all runtime properties. Runtime, integration, security and release evidence remain mandatory.

## Non-goals

This ADR does not mandate microservices, a specific framework, a specific database, or a particular deployment topology.