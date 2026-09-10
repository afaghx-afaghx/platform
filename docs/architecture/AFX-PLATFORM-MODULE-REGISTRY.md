# AFX-PLATFORM Module Registry

**Phase:** 2 — AFX-PLATFORM Foundation
**Status:** Baseline registry
**Date:** 2026-09-10

## Ownership and authority

| ID | Module | Team | Owns | Must not own | First evidence gate |
|---|---|---|---|---|---|
| PLAT-API | API Contracts & Management | Team 1 | platform API metadata, versions, compatibility policy | business authorization rules | contract/schema CI |
| PLAT-GW | Gateway | Team 1 | routing, transport controls, request normalization | identity/authorization authority | boundary + integration tests |
| PLAT-EVT | Event Bus | Team 2 | event envelopes, delivery semantics, consumer contracts | business truth/persistence | publish/consume tests |
| PLAT-QUE | Queue | Team 2 | async transport, retry/DLQ semantics | domain workflow truth | retry/idempotency tests |
| PLAT-WF | Workflow | Team 2 | technical orchestration/execution runtime | domain-owned state models | replay/idempotency tests |
| PLAT-SRCH | Search | Team 3 | indexing/query abstraction | canonical business data | tenant-isolation tests |
| PLAT-CACHE | Cache | Team 3 | caching/invalidation abstraction | authoritative state | isolation/invalidation tests |
| PLAT-STOR | Storage | Team 3 | object/file abstraction and metadata boundary | domain persistence truth | tenant/path ACL tests |
| PLAT-DOC | Documents | Team 3 | technical document handling primitives | domain document semantics | content/metadata tests |
| PLAT-NOTIF | Notification | Team 4 | delivery abstraction/provider adapters | business messaging policy | provider/failure tests |
| PLAT-WEBHOOK | Webhooks | Team 4 | signed outbound delivery, retries, replay | domain event authority | signature/retry tests |
| PLAT-SCHED | Scheduler | Team 4 | durable scheduling/execution trigger | business calendar truth | duplicate-fire tests |
| PLAT-INT | Integration | Team 4 | external adapter boundary | external source as AFAGHX truth | contract/timeout tests |
| PLAT-I18N | Localization | Team 4 | locale/resource resolution | domain content authority | locale fallback tests |
| PLAT-FX | Currency | Team 4 | currency/reference-data technical APIs | pricing/order truth | reference-data tests |

## Cross-cutting invariants

- Every stateful module is tenant-aware.
- Sensitive operations emit auditable operational/security events through approved interfaces.
- Public contracts are versioned.
- Duplicate delivery must be safe where the transport semantics permit duplicates.
- Retry behavior is bounded and observable.
- No module may introduce a competing identity or authorization authority.
- Domain-specific decisions stay in Domain layers.
- Platform dependencies remain explicit and reviewable.

## Initial implementation rule

Only the smallest executable slice of a module may be implemented on this foundation branch. Large provider-specific builds, business workflows and cross-domain shortcuts are rejected until their contracts and ownership boundaries are reviewed.
