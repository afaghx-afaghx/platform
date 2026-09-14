# AFX-MASTER-ARCH-001 V2.0 — AFAGHX Master Architecture

**Status:** IMPLEMENTATION BASELINE — ARCHITECTURE CLOSURE CANDIDATE
**Version:** 2.0.0
**Authority:** AFAGHX Architecture Governance
**Parent:** #55
**Effective target:** 2026-09-14

## 1. Purpose

This specification is the master implementation reference for AFAGHX. All code, infrastructure, APIs, events, data stores, intelligence components, experience applications, CI/CD controls and evidence must conform to this architecture.

V2.0 does not authorize architecture drift. It strengthens the existing v1 baseline by making ownership, canonical runtime, enforcement, evidence and closure requirements explicit and machine-checkable.

No implementation may declare GREEN merely because a document exists. GREEN requires reproducible implementation and CI/runtime evidence.

## 2. AFAGHX architectural model

AFAGHX is a governed intelligent business ecosystem platform, not a collection of websites, dashboards, plugins or an isolated marketplace.

The system is organized by business capability and bounded context, then implemented through explicit contracts and owned persistence.

```text
BUSINESS ECOSYSTEM
        ↓
BOUNDED CONTEXTS / BUSINESS CAPABILITIES
        ↓
AFX-CORE GOVERNANCE + TRUST
        ↓
CANONICAL API / PLATFORM BOUNDARIES
        ↓
OWNED DOMAIN APPLICATIONS + PERSISTENCE
        ↓
EVENTS / GOVERNED DATA PRODUCTS
        ↓
INTELLIGENCE / AI
        ↓
EXPERIENCE
```

## 3. Seven architectural layers

1. **AFX-CORE** — identity, authentication, authorization, tenant/organization context, trust and governance primitives.
2. **AFX-PLATFORM** — gateway, API contracts, events, workflow, search, storage, notifications, integrations, scheduler and shared runtime capabilities.
3. **BUSINESS DOMAIN** — bounded contexts owning business truth and their persistence.
4. **DATA & INTELLIGENCE** — governed data products, analytics, BI, AI, recommendation, forecasting, risk and decision intelligence.
5. **EXPERIENCE** — web/mobile/portal experiences consuming canonical application APIs.
6. **INFRASTRUCTURE** — PostgreSQL, network, KMS/secrets, deployment, observability and runtime operations.
7. **ENGINEERING & GOVERNANCE** — ADRs, contracts, tests, CI/CD, security gates, evidence and release controls.

## 4. Canonical dependency direction

```text
EXPERIENCE
    ↓
PLATFORM / APPLICATION BOUNDARIES
    ↓
DOMAIN
    ↓
AFX-CORE
    ↓
OWNED PERSISTENCE / INFRASTRUCTURE
```

Intelligence consumes approved contracts, events and governed data products. It does not bypass security or become an owner of transactional domain truth.

AFX-CORE has no dependency on business domains.

Forbidden:

```text
Experience → Database
Domain A → Domain B database
Domain → private identity/session store
AI → transactional database bypass
Client claim → authorization decision
Core → business-domain dependency
```

## 5. Canonical authentication/runtime

The production authentication path is singular:

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

The in-memory `AfxCore` implementation is not a production authority. It may exist only for explicitly classified deterministic unit tests/fixtures. Any production-reachable import or instantiation is an architecture defect and blocks GREEN.

The runtime must prove:

- authenticated request → 200;
- unauthenticated request → 401;
- authenticated but unauthorized request → 403;
- tenant mismatch → 403;
- persistence across process/service restart;
- persistence across multiple application instances;
- atomic refresh rotation;
- replay/reuse detection and refresh-family/session revocation;
- no raw credential/token persistence or leakage;
- canonical API path reaches the persistent Core runtime.

## 6. AFX-CORE boundary

AFX-CORE is the single trust and security authority.

It owns:

- Identity and User lifecycle
- Credentials
- Authentication
- Sessions and refresh-token lifecycle
- Organization and Membership
- Tenant Context
- RBAC and Permission
- Policy and Access Decision
- Audit
- Consent
- Trust
- Configuration / Feature Flags / Registry

It does not own Product, Commerce, Order, Payment, Supplier, Factory, Procurement, Logistics, Marketing, Advertising, Analytics or AI business truth.

Authorization is deny-by-default and evaluates at minimum:

`Identity + TenantContext + Membership + RBAC/Permission + Policy + ResourceState`.

## 7. Domain ownership

Every bounded context must have:

- one explicit business owner;
- one explicit persistence owner;
- explicit entities/value objects;
- explicit commands/queries where applicable;
- explicit API contracts;
- explicit event contracts;
- explicit dependencies;
- explicit authorization rules;
- deterministic tests;
- observable operational behavior;
- machine-readable evidence.

Every entity has exactly one authoritative owner.

Cross-context persistence access is prohibited.

## 8. Platform boundary

AFX-PLATFORM owns shared technical capabilities and contracts, including:

API/Gateway, Events, Queue, Workflow, Search, Cache, Storage, Notification, Webhooks, Scheduler, Integration, Localization, Currency and Documents.

Platform must not absorb business-domain policy or create a competing security authority.

## 9. Data ownership

Each bounded context owns its persistence model. Repositories/adapters hide storage details behind application boundaries.

Cross-context information exchange occurs through:

- versioned APIs;
- explicit application interfaces;
- versioned events;
- governed data products.

Shared database shortcuts are architecture violations.

## 10. Event architecture

Events are versioned, tenant-aware and traceable. Event envelopes carry producer, schema version, correlation and causation metadata. Business meaning remains owned by the producing context.

Delivery mechanisms may evolve from modular-monolith in-process dispatch to durable queue/broker implementations without changing domain ownership.

## 11. Intelligence and AI

Intelligence is downstream of governed operational truth.

```text
Domain State / Events
        ↓
Governed Data Products
        ↓
Analytics / BI
        ↓
AI / Decision Intelligence
```

AI may recommend, forecast, classify, analyze or assist implementation. AI does not silently mutate authoritative transactional state, bypass authorization, bypass evidence gates, or acquire merge/release authority.

AI engineering remains Mission → Inspect → Plan → Implement → Test → Diagnose → Remediate → Evidence → Gate → Human Review.

## 12. Experience boundary

Experience applications are presentation and interaction surfaces. They never connect directly to databases and never become an alternate authentication/authorization authority.

All production experience traffic uses the canonical API boundary.

GitHub Pages prototypes must be explicitly identified as prototypes and must not imply production runtime readiness.

## 13. Infrastructure trust boundary

Infrastructure owns runtime and operational trust foundations:

- PostgreSQL and connection/pooling configuration;
- KMS/HSM and secret boundaries;
- network/TLS/ingress controls;
- deployment environments;
- observability;
- backups/recovery;
- runtime health/readiness;
- scaling and operational policies.

Production cryptographic material must not be embedded in source code or application persistence.

## 14. Engineering and governance

No direct `main` remediation writes are permitted for architecture closure.

Every controlled change follows:

```text
Architecture Decision
    ↓
Implementation Branch
    ↓
Tests
    ↓
CI
    ↓
Evidence
    ↓
Independent Review
    ↓
Human Approval
    ↓
Merge
```

Architecture-controlled changes require ADRs.

## 15. Four-team operating model

### Team 1 — Architecture & Core
Owns architecture, security authority, boundaries, contracts, ADRs and architecture gates.

### Team 2 — Platform / Reliability / DevSecOps
Owns runtime wiring, infrastructure, CI/CD, observability, deployment and operational evidence.

### Team 3 — Domain / Product Engineering
Owns bounded contexts, domain behavior, entity ownership, persistence and domain contracts.

### Team 4 — Data / Intelligence / AI
Owns governed data products, analytics, AI boundaries and intelligence evidence.

Teams form one closed loop; no team may bypass another team's authority boundary.

## 16. Evidence standard

A claim is not GREEN unless the evidence identifies:

- requirement/control;
- exact commit SHA;
- test/command;
- workflow/run;
- artifact where applicable;
- expected result;
- observed result;
- reviewer/approval boundary;
- environment-dependent prerequisites.

Unknown, missing, stale or non-reproducible evidence is not GREEN.

## 17. Architecture compliance gates

V2 closure requires all of the following:

1. architecture artifacts agree on V2.0;
2. bounded-context and entity ownership are complete;
3. forbidden dependencies are machine-checked;
4. canonical runtime wiring is proven;
5. persistence and restart behavior are proven;
6. API/event contracts are versioned and tested;
7. tenant isolation is executable and evidenced;
8. security controls are governed by the G01 closure matrix;
9. infrastructure trust boundaries are explicit and executable;
10. CI/CD blocks invalid architecture and security claims;
11. intelligence/AI boundaries are enforced;
12. experience/API boundary is proven;
13. observability and operational evidence exist;
14. no unresolved architecture-critical blocker remains.

## 18. Definition of architectural GREEN

Architecture GREEN means the repository can be shown, with reproducible evidence, to implement this specification without hidden alternate foundations, contradictory ownership, unauthorized dependencies, or unproven critical runtime claims.

Architecture GREEN does not mean that every future business feature has already been implemented.

## 19. Change control

Changes to security authority, dependency direction, tenant isolation, persistence ownership, public contracts, authentication mechanisms, authorization semantics, cryptographic trust boundaries, or deployment trust boundaries require an ADR and re-validation against this master specification.

---

**Canonical reference:** `AFX-MASTER-ARCH-001 V2.0`
