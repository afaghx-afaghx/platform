# AFAGHX Phase, Gate & Mission Execution Model

**Document ID:** AFX-PHASE-GATE-MISSION-MODEL-001  
**Version:** 1.0.1  
**Status:** PROPOSED — PENDING ARCHITECTURE GOVERNANCE REVIEW

## 1. Execution model

Phase, Gate and Mission are distinct control units. Team ownership is an overlay across all three; it is not a serial execution level.

```text
STRATEGY
  ↓
GOVERNANCE / CONTROL PLANES
  ↓
PHASE / CAPABILITY
  ↓
GATE
  ↓
MISSION
  ↓
TASK
  ↓
IMPLEMENTATION
  ↓
TEST / SECURITY / QA
  ↓
EVIDENCE
  ↓
REVIEW
  ↓
RELEASE DECISION
  ↓
OBSERVABILITY
  ↓
FEEDBACK / EVOLUTION
```

Across this flow:

```text
TEAM 01  ───────────────────────────────┐
TEAM 02  ───────────────────────────────┤
TEAM 03  ───────────────────────────────┤→ ownership / DRI / co-review
TEAM 04  ───────────────────────────────┘
```

A lower execution level cannot override an acceptance rule imposed by a higher control level. Team assignment cannot override architecture, security, gate or release policy.

## 2. Phase model

### Phase 0 — Foundation & Governance

Repository governance, branch protection, CI/CD, evidence contract, architecture baseline, ownership, quality controls and delivery standards.

### Phase 1 — AFX-CORE / Identity / Security

Identity, authentication, sessions, authorization, organization, membership, tenant context, RBAC, policy, audit, consent, trust and security hardening.

**Current focus:** G01-10 through G01-26 and required foundation controls.

### Phase 2 — AFX-PLATFORM

Gateway, API management, events, queues, workflows, search, cache, storage, notifications, webhooks, scheduler, integrations, localization, currency and documents.

### Phase 3 — Domain / Commerce / Industry / Services

Product, commerce, order, factory, supplier, service, procurement, logistics, payment, partner, marketing, advertising, certification, contract, tender, trade and additional approved bounded contexts.

### Phase 4 — Data & Intelligence

Data platform, data governance, analytics, BI, recommendation, forecasting, risk/fraud, pricing intelligence and decision intelligence.

### Phase 5 — AI / Decision Intelligence

AI integration, governed model access, agent execution, evaluation, recommendations, forecasting and AI-assisted decision systems.

### Phase 6 — Experience / Scale / Distributed Evolution

Web/mobile and portal experiences, global operating capabilities, reliability at scale, multi-region evolution and selective distributed-service decomposition where justified.

## 3. Gate model

Each Gate defines scope, acceptance criteria, primary owner, required reviewers, implementation path, deterministic test, named CI job, evidence artifact/trace and explicit PASS/FAIL/BLOCKED outcome.

**GREEN is earned only by evidence.**

## 4. Mission model

A Mission is the smallest governed unit that produces a measurable engineering outcome. Each Mission identifies objective, owner, dependencies, implementation tasks, tests, evidence, Gate linkage and rollback/remediation path.

## 5. Quality & release control

QA is a control plane, not merely a final manual check. Verification is risk-based and may include unit, integration, API, browser, concurrency, security, performance, resilience, data and regression testing.

Release Management verifies relevant gates, evidence, security requirements and operational readiness. A missing or failed required control blocks release.

## 6. Risk & exception control

Exceptions must be explicit, time-bounded and reviewable, with rationale, risk owner, compensating control, expiry/review date and approval authority. Silent bypass is prohibited.

## 7. Architecture evolution

Architecture-controlled changes require an ADR before implementation. The master architecture remains the authoritative baseline.

## 8. Team overlay rule

Every Phase, Gate and Mission has a primary owner selected from the four operating teams. Cross-team work adds named co-reviewers without changing the execution hierarchy.

## 9. Current status

Phase 1 remains active. Gate 01 is RED/OPEN and the repository domain freeze remains active. This execution model does not override the Gate-01 closure matrix.
