# AFAGHX Execution Control Plan v1

## Status

This document is the execution control baseline for completing AFAGHX without premature domain expansion or architectural drift.

## Non-negotiable invariants

1. AFX-CORE is the single trust authority.
2. EXPERIENCE -> DOMAIN/PLATFORM -> CORE; CORE never depends on domains.
3. Tenant context is untrusted until server-side membership validation succeeds.
4. Protected request flow is Authentication -> Identity -> Tenant Context -> Membership -> Authorization -> Policy -> Resource State -> Audit.
5. Authorization is deny-by-default.
6. Domain data is owned by its bounded context; no direct cross-domain database access.
7. Public APIs and events are explicit and versioned.
8. Secrets, credentials, private keys and production configuration never enter source control.
9. Security, audit, observability and tenant isolation are release gates.
10. No production-ready claim is permitted without automated evidence.

## Execution gates

### Gate 01 — Trust Foundation

- SecurityContext guard and request propagation
- Authentication assurance validation
- RBAC and policy evaluation
- Tenant isolation tests
- Audit reliability and redaction
- Password/credential lifecycle
- MFA/TOTP, WebAuthn/passkeys and recovery
- Session/device lifecycle
- JWKS, key rotation and KMS/HSM-ready provider boundary

**Exit evidence:** integration tests for authentication, authorization, tenant isolation, session/replay behavior and audit.

### Gate 02 — Platform Foundation

- API versioning and canonical error envelope
- correlation/request IDs
- idempotency
- rate limiting
- transactional outbox
- inbox/idempotency processing
- publisher abstraction
- retry/backoff/DLQ/replay
- notification, search, files, workflow and integration boundaries

**Exit evidence:** contract and integration tests proving delivery, duplicate handling and failure recovery.

### Gate 03 — Data Foundation

- ownership matrix
- transaction/consistency rules
- read models
- cache ownership/invalidation
- search projections
- classification/retention
- backup/restore
- analytics/data-product boundary

**Exit evidence:** tenant-scoped data tests, migration safety and restore verification.

### Gate 04 — Domain Foundation

Every domain must have a bounded-context specification before implementation:

- responsibility/non-responsibility
- aggregates and invariants
- commands/queries
- events
- APIs
- data ownership
- authorization policies
- tenant semantics
- consistency/failure model

### Gate 05 — Intelligence & Experience

- governed data products
- AI/model gateway
- AI policy and auditability
- human approval for high-impact automation
- web/admin/partner/mobile boundaries
- design system
- localization/accessibility
- authorization-aware UX

### Gate 06 — Production Readiness

- OpenTelemetry logs/metrics/traces
- SLI/SLO
- CI/CD release controls
- dependency/secret/container/IaC scanning
- migration gates
- incident response
- backup/restore tests
- DR/BCP
- RPO/RTO
- security and operational sign-off

## Branch and merge discipline

- `main` is the protected production baseline.
- Architecture changes land before dependent implementation changes.
- Foundation work is merged in small, reviewable vertical slices.
- Large mixed-purpose PRs are not merged merely because they contain useful work.
- Temporary experimental branches are not canonical architecture branches.
- CI evidence is required before a foundation PR is considered merge-ready.

## Current execution priority

1. Harden and test the Trust Foundation.
2. Complete authorization policy semantics.
3. Implement MFA/recovery and key lifecycle boundaries.
4. Build API conventions.
5. Implement the transactional event backbone.
6. Establish data ownership and operational foundations.
7. Only then begin domain implementation.

## Completion criterion

AFAGHX Foundation is complete only when Gates 01–03 have implementation and automated evidence, and Gates 04–06 have approved architecture and executable release controls. Product/domain expansion must not bypass these gates.
