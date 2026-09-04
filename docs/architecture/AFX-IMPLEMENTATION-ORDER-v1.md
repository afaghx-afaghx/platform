# AFAGHX Implementation Order v1

AFAGHX development is executed as controlled architectural gates rather than feature accumulation.

## Gate 01 — Trust Foundation

Security context, secure-by-default protection, authorization policy engine, tenant isolation, credential lifecycle, MFA/recovery, step-up authentication, key lifecycle/JWKS, audit taxonomy and security tests.

## Gate 02 — Platform Foundation

API versioning and conventions, canonical errors, correlation/idempotency, rate limiting, event envelope, transactional outbox, inbox, broker abstraction, retry/backoff, DLQ/replay, notifications, search, files, workflow, configuration and integration boundaries.

## Gate 03 — Data Foundation

Data ownership, consistency boundaries, read models, cache ownership/invalidation, search projections, classification/retention, backup/restore and analytics/data-product contracts.

## Gate 04 — Domain Foundation

Each domain receives an explicit bounded context, responsibilities/non-responsibilities, aggregates, commands/queries, events, API contract, data ownership, authorization policies, tenant semantics and failure/consistency model before production implementation.

## Gate 05 — Intelligence & Experience

Governed data products, AI/model gateway and policy, recommendation interfaces, web/admin/partner/mobile boundaries, design system, localization, accessibility and authorization-aware UX.

## Gate 06 — Production Readiness

OpenTelemetry, structured logs, metrics/traces, SLI/SLO, incident response, CI/CD security gates, dependency/secret/container/IaC scanning, migration safety, backup restore tests, DR/BCP and RPO/RTO validation.

## Rule

A downstream gate cannot override an incomplete upstream trust or data boundary. Production readiness is a release decision backed by automated evidence, not a documentation status.
