# AFX-MASTER-ARCH-001 v2.0

## AFAGHX Master Architecture & Engineering Constitution

**Status:** FINAL / CONSTITUTIONAL  
**System:** AFA GLOBAL HORIZON X (AFAGHX)  
**Repository:** `afaghx-afaghx/platform`  
**API boundary:** `https://api.afaghx.com`  
**Effective:** 2026-09-14

> Architecture defines what may exist. Engineering defines how it is built. Runtime proves how it executes. Governance controls how it evolves. Evidence proves that claims are true.

## 1. Constitutional authority

This document is the binding architecture, engineering, runtime, security, governance and evidence constitution of AFAGHX. It supersedes conflicting lower-level design notes. A change to a constitutional rule requires an explicit Architecture Decision Record and review by the four-team engineering control model.

## 2. System identity

AFAGHX is an Intelligent Digital Ecosystem / Business & Trade Ecosystem. It is not a simple marketplace, shop, dashboard collection or plugin collection. Marketplace capabilities are one part of a wider network connecting producers, factories, companies, suppliers, service providers, B2B buyers, B2C consumers, marketers and partners.

## 3. Architecture

AFAGHX uses **Modular Monolith + API First + Event Ready + Microservice Ready**.

### Layers

1. **AFX-CORE** — identity, authentication, authorization, organization, membership, tenant context, RBAC, policy, audit, consent, trust foundation, configuration, feature flags and module registry.
2. **AFX-PLATFORM** — gateway, events, search, notifications, storage, observability, integrations, webhooks, scheduler, cache.
3. **AFX-DOMAIN** — product, shop, order, factory, organization, service, supplier, partner, marketing, advertising, logistics, payment.
4. **AFX-INTELLIGENCE** — analytics, data, AI, recommendations, forecasting, risk and BI.
5. **AFX-EXPERIENCE** — web, mobile, customer, business, supplier, factory, partner and administration experiences.

Experience code is never a business-logic owner and never accesses a domain database directly.

## 4. Identity and authorization

The canonical identity relation is:

`User -> Membership -> Organization`

Tenant context is distinct from organization identity. Authorization evaluates identity, tenant/organization context, membership, role, permission, policy and resource state. Default is deny. Decisions are `ALLOW`, `DENY` or `CHALLENGE`.

There is one production authentication foundation. No domain may create a parallel authentication system.

## 5. Bounded contexts and ownership

Every bounded context has exactly one owner. Every important entity has exactly one authoritative owner. Cross-context database reads and writes are forbidden. Cross-context interaction uses explicit APIs, application contracts or events.

No hidden bounded context is permitted. No domain may bypass AFX-CORE identity and authorization.

## 6. Canonical API

`api.afaghx.com` is the canonical application boundary. API versioning starts on day one. The gateway performs routing, transport security, rate limiting, version selection and policy enforcement; it is not a business-domain god controller.

Frontend and Experience code must communicate through the canonical API. `frontend -> database` is forbidden.

## 7. Canonical runtime

The only production authentication/runtime path is:

`Gateway -> PersistentAfxCore -> AfxCoreRepository -> PostgreSQL`

An in-memory `AfxCore` implementation may exist only as explicitly isolated test infrastructure if a test requires it. It must never be reachable from a production HTTP path, Experience server, deployment target or production bootstrap.

Persistent state must survive process restart and be shared across service instances.

## 8. Database constitution

PostgreSQL is the authoritative persistence layer for production AFX-CORE state. Migrations are versioned and reproducible. Repository code is the only persistence boundary for its context. Raw credentials, access tokens and refresh tokens are never persisted; only appropriate one-way digests may be stored.

Sensitive operations are audited without logging secrets.

## 9. Authentication security

Authentication must provide:

- secure password hashing with a production-approved password hashing algorithm;
- short-lived access credentials;
- refresh-token rotation;
- refresh-family reuse detection;
- transactional concurrency control;
- session revocation;
- secure cookie attributes where cookies are used;
- CSRF/origin protection for state-changing browser requests;
- no credential storage in browser local/session storage;
- explicit issuer, audience, algorithm and signature validation for signed tokens where JWT is introduced;
- rate limiting and abuse controls;
- security headers and safe error responses.

No security claim is GREEN without executable evidence.

## 10. Events

Events are explicit versioned contracts. They are replayable where required, have clear producers and consumers, and do not become an uncontrolled substitute for synchronous APIs.

## 11. Code creation rule

Before creating code, engineering must:

1. inspect the repository;
2. search for existing capability;
3. identify ownership;
4. identify the existing contract;
5. determine whether the capability can be reused or extended;
6. refactor before duplicating;
7. create new code only when justified.

Every candidate implementation is classified as **KEEP / REFACTOR / REMOVE / FREEZE** when architecture review finds duplication or drift.

## 12. Forbidden patterns

The following are constitutional violations:

- duplicate production authentication;
- duplicate production runtime;
- frontend-to-database access;
- cross-context database access;
- domain logic in the gateway;
- business logic hidden in Experience code;
- unversioned public API contracts;
- secret/token/password logging;
- silent fallback from persistent production state to memory;
- fake API success presented as live production data;
- disabled tests used to manufacture GREEN;
- merge without required evidence;
- direct main-branch changes that bypass governance.

## 13. Four-team control model

**Team 1 — Architecture/Core:** architecture, boundaries, security, contracts and gates.  
**Team 2 — Engineering/GitHub:** implementation, database, API, tests, CI/CD and repository evidence.  
**Team 3 — AI Engineering:** inspect, plan, implement, test, diagnose, remediate and produce evidence under the same rules as human engineering.  
**Team 4 — Governance/Evidence:** release controls, evidence validation, compliance and prevention of artificial GREEN.

No team may unilaterally redefine another team's constitutional boundary.

## 14. GitHub source of truth

GitHub is the engineering source of truth for source code, migrations, contracts, tests, workflows, pull requests, artifacts and evidence. `main` is protected. Changes are reviewed through the governed workflow.

## 15. Evidence constitution

Implemented is not proven. A claim is GREEN only when the required executable evidence exists and is traceable to the exact commit under review.

For the Canonical Runtime gate, evidence must prove at minimum:

- authenticated `200`;
- unauthenticated `401`;
- authenticated-but-unauthorized `403`;
- PostgreSQL persistence;
- persistence after process restart;
- shared state across instances;
- refresh rotation;
- concurrent refresh race with exactly one winner;
- refresh reuse detection and family/session revocation;
- absence of an alternate production in-memory runtime;
- Browser/API boundary;
- CI success;
- deployment evidence where deployment is claimed.

Missing evidence means **NOT GREEN**.

## 16. Architecture gates

### Gate 0 — Canonical Runtime

`Gateway -> PersistentAfxCore -> PostgreSQL -> Evidence GREEN`

Until Gate 0 is GREEN, production Domain implementation is blocked.

### Gate 1 — Organization

After Gate 0, Organization is the first production-grade Domain. Its implementation must preserve the identity relation:

`User -> Membership -> Organization -> Role / Permission / Policy`

Organization may not create a second authentication or authorization foundation.

## 17. Definition of Done

A change is DONE only when:

- architecture ownership is clear;
- implementation is complete;
- tests exist for the changed behavior;
- failure paths are tested;
- security behavior is tested where relevant;
- CI is green;
- required artifacts/evidence exist;
- no forbidden dependency was introduced;
- documentation/contracts are updated;
- the exact commit is traceable;
- deployment is proven if deployment is part of the claim.

## 18. No artificial GREEN

The following do not constitute evidence: manual screenshots without reproducible test context, self-declared success, skipped critical tests, mocked persistence used to claim PostgreSQL persistence, fallback memory state, or a green job that did not execute the required test.

A blocked or unknown state remains blocked or unknown until evidence changes it.

## 19. AI engineering constitution

AI-generated code is subject to exactly the same architecture, security, test, review and evidence requirements as human-written code. AI may not bypass gates, invent missing evidence, downgrade a failure to success, or introduce duplicate capabilities merely because an implementation is convenient.

## 20. Technical debt and drift

Architecture drift is treated as an engineering defect. Duplicate, dead, unreachable, shadow or contradictory code is not accepted merely because tests happen to pass. Technical debt is recorded, owned and bounded.

## 21. Production readiness

Production readiness requires operational evidence for security, persistence, recovery, observability, failure handling, deployment and rollback appropriate to the capability. Prototype status must never be represented as production readiness.

## 22. Current constitutional state

| Area | State |
|---|---|
| Architecture Constitution | ESTABLISHED |
| Layer Model | ESTABLISHED |
| Identity/RBAC Foundation | ESTABLISHED |
| API-First Boundary | ESTABLISHED |
| Event Strategy | ESTABLISHED |
| Governance/Evidence Model | ESTABLISHED |
| Canonical Runtime | IN PROGRESS |
| Runtime Full Evidence | NOT COMPLETE |
| Organization Domain | BLOCKED until Gate 0 GREEN |

## 23. First mandatory execution order

1. Prove and enforce the canonical runtime.
2. Remove, refactor or freeze alternate runtime paths.
3. Build executable runtime evidence.
4. Enforce architecture rules in CI.
5. Close Gate 0 as GREEN only when all evidence exists.
6. Start Organization as the first production-grade Domain.
7. Continue the Domain roadmap under the same gates.

## 24. Constitutional final rule

**No architecture without ownership. No production runtime without persistence. No implementation without tests. No GREEN without evidence. No Domain before the Canonical Runtime Gate. No exception merely because implementation is difficult.**
