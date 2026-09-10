# ADR-002 — AFX-PLATFORM Boundary and Dependency Direction

- **Status:** Accepted for Phase 2 foundation
- **Date:** 2026-09-10
- **Scope:** AFX-PLATFORM

## Context

AFAGHX requires a shared technical platform between Experience/Domain consumers and AFX-CORE. Existing `platform/` content is limited to a Gateway security-boundary foundation. Phase 2 must add shared capabilities without becoming a business-rule owner or a second security authority.

## Decision

AFX-PLATFORM is the technical capability layer for:

- API and Gateway
- Events, Queue and Workflow
- Search and Cache
- Object/File Storage
- Notification
- Webhooks
- Scheduler
- Integration
- Localization and Currency
- Documents

Platform components expose explicit, versioned interfaces. They may call AFX-CORE contracts for identity/security context and may serve Domain/Experience callers, but they must not own business-domain truth.

### Dependency rules

1. `EXPERIENCE → PLATFORM / DOMAIN → CORE` remains the canonical direction.
2. Platform must not depend on business-domain persistence or domain-private tables.
3. Cross-domain data access occurs only through explicit application interfaces, APIs or versioned events/contracts.
4. Authentication/authorization authority remains in AFX-CORE. Platform may enforce transport and infrastructure policy but may not create a competing identity authority.
5. Tenant isolation is mandatory wherever platform state is stored, cached, indexed, queued, scheduled, emitted or observed.
6. Public APIs and events are explicit and versioned from the first implementation.
7. Delivery semantics must be documented (idempotency, retry, ordering, DLQ where applicable).
8. Security and operational failures fail closed where unsafe continuation could cross a trust boundary.
9. Every production-relevant capability requires tests, CI evidence and reviewable documentation before being marked complete.

## Non-goals

AFX-PLATFORM does not own Product, Order, Payment, Factory, Supplier, Service, Organization business truth, Marketing, Advertising, Logistics policy, Analytics truth or AI decision authority.

## Consequences

- Phase 2 can evolve technical capabilities independently of business domains.
- Platform contracts become stable integration seams for later distributed deployment.
- Some capabilities will initially be modular-monolith implementations but must preserve service-ready contracts.
- Domain Freeze remains governed by the Gate 01 policy; this ADR does not authorize domain unfreeze.

## Evidence required

Before Phase 2 foundation is considered complete, CI must demonstrate at minimum:

- architecture/boundary checks
- contract/schema validation
- deterministic unit/integration tests for implemented platform capabilities
- tenant-isolation tests for stateful shared services
- evidence manifest with exact commit and workflow/run provenance
