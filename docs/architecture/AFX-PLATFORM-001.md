# AFX-PLATFORM-001 — Platform Foundation Specification

**Status:** Phase 2 foundation
**Version:** 1.0-draft
**Date:** 2026-09-10

## 1. Purpose

AFX-PLATFORM provides shared technical capabilities used by Experience and Domain layers while preserving AFX-CORE as the authority for identity, authentication, authorization, tenant context and trust primitives.

## 2. Capability map

| Capability | Platform responsibility | Initial owner |
|---|---|---|
| API / Gateway | routing, version negotiation, transport policy hooks, request normalization | Team 1 — Platform Edge |
| Events | durable event publication/consumption contracts, delivery semantics | Team 2 — Messaging & Workflow |
| Queue | asynchronous delivery abstraction, retry and dead-letter semantics | Team 2 — Messaging & Workflow |
| Workflow | technical workflow execution and state transitions, not domain truth | Team 2 — Messaging & Workflow |
| Search | indexing/query abstraction, tenant-aware isolation | Team 3 — Platform Data Services |
| Cache | tenant-aware caching abstraction and invalidation contract | Team 3 — Platform Data Services |
| Storage | object/file storage abstraction, metadata and isolation | Team 3 — Platform Data Services |
| Notification | delivery abstraction and provider adapters | Team 4 — Reliability & Integration |
| Webhooks | outbound event delivery, signing, retries and replay controls | Team 4 — Reliability & Integration |
| Scheduler | durable job scheduling and execution contracts | Team 4 — Reliability & Integration |
| Integration | external-system adapters and contract boundaries | Team 4 — Reliability & Integration |
| Localization | locale/resource resolution | Team 4 — Reliability & Integration |
| Currency | currency/reference-data technical service | Team 4 — Reliability & Integration |
| Documents | document metadata/rendering/storage integration primitives | Team 3 — Platform Data Services |

## 3. Security boundary

AFX-PLATFORM consumes a validated security context rather than issuing an independent identity. Gateway enforcement may reject invalid transport/authentication inputs, but authorization truth remains in AFX-CORE.

Stateful Platform services must carry tenant and, where required, organization context through every persistence/index/cache/message boundary.

## 4. Contract baseline

All externally observable interfaces must define:

- owner and authority boundary
- version
- request/response or event schema
- authentication/security-context requirements
- tenant/organization isolation requirements
- idempotency and retry behavior
- error model
- observability fields
- compatibility/deprecation policy

## 5. Execution order

1. Foundation contracts and ADRs
2. API/Gateway contract surface
3. Events/Queue/Workflow primitives
4. Search/Cache/Storage primitives
5. Notification/Webhooks/Scheduler/Integration primitives
6. Localization/Currency/Documents
7. Cross-capability integration tests
8. CI and evidence publication
9. Architecture review and Phase 2 gate decision

## 6. Completion rule

No capability is GREEN solely because implementation exists. A capability is complete only when code, deterministic tests, CI result, security/boundary validation, and machine-readable evidence are all present and reviewable.
