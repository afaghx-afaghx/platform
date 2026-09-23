# AFX-MASTER-ARCH-001 v2.0

# AFAGHX Master Architecture & Engineering Constitution

**Status:** FINAL / CONSTITUTIONAL  
**System:** AFA GLOBAL HORIZON X (AFAGHX)  
**Repository:** `afaghx-afaghx/platform`  
**Canonical API:** `https://api.afaghx.com`  
**Effective Date:** 2026-09-14  
**Authority:** Architecture + Engineering + Runtime + Security + Governance + Evidence

> **Architecture defines what may exist. Engineering defines how it is built. Runtime proves how it executes. Governance controls how it evolves. Evidence proves that claims are true.**

---

## 0. Constitutional declaration

This document is the final constitutional authority for AFAGHX architecture, engineering, runtime, security, governance and evidence.

It governs humans, AI systems, contractors, repository changes, infrastructure, APIs, tests, deployments and operational decisions.

A lower-level document, code pattern, implementation shortcut or team decision that conflicts with this Constitution is invalid until explicitly amended through the constitutional change process.

**Implemented is not Proven. Proven is not Production Ready. No GREEN without evidence.**

---

## 1. AFAGHX identity

AFAGHX is an **Intelligent Digital Ecosystem / Business & Trade Ecosystem**.

It is not:

- a simple marketplace;
- a shop;
- a collection of dashboards;
- a plugin collection;
- a frontend pretending to be a platform.

AFAGHX connects buyers, sellers, producers, factories, suppliers, companies, service providers, marketers, partners, distributors, financial actors and institutional participants across commerce, industry, services, procurement, logistics, trade, trust, data and AI.

---

## 2. Canonical architectural model

AFAGHX follows:

**Modular Monolith + API First + Event Ready + Microservice Ready**

The architecture does **not** require premature microservice decomposition. The system may evolve from modular monolith to independently deployed services only when evidence, scale, ownership and operational economics justify the transition.

### 2.1 Canonical layers

```text
01  AFX-CORE
02  STAKEHOLDERS
03  BUSINESS DOMAINS
04  DATA & INTELLIGENCE
05  AFX-EXPERIENCE
06  INFRASTRUCTURE
07  ENGINEERING & GOVERNANCE
08  INTEGRATION & ECOSYSTEM
09  CROSS-CUTTING CONCERNS
10  DATA GOVERNANCE & MASTER DATA
11  LIFECYCLE & EVOLUTION
```

The uploaded **AFAGHX Digital Ecosystem Master Architecture — AFX-MASTER-ARCH-001 v2.0** visual map is the canonical visual companion to this Constitution. The visual map and this written Constitution form one architecture reference: the image shows the system shape; this document defines the rules.

---

# PART I — CORE ARCHITECTURE

## 3. AFX-CORE constitution

AFX-CORE is the smallest trusted foundation of the ecosystem.

It owns, where applicable:

- Identity;
- Authentication;
- Authorization;
- Organization;
- Membership;
- Tenant Context;
- RBAC;
- Policy;
- Audit;
- Consent;
- Trust Foundation;
- Configuration;
- Feature Flags;
- Module Registry;
- Core security primitives.

AFX-CORE does **not** become a dumping ground for Product, Order, Payment, Logistics or other domain business logic.

### Core rule

> **Keep the Core small, stable, authoritative and heavily governed.**

---

## 4. Identity constitution

Canonical relationship:

```text
User
  ↓
Membership
  ↓
Organization
  ↓
Role / Permission / Policy
```

Rules:

1. One user may hold multiple memberships.
2. Membership is the relationship between identity and organization/tenant context.
3. Customer, Supplier, Factory and other business identities do not create separate authentication foundations.
4. Tenant context is not assumed to be identical to Organization identity.
5. No Domain may bypass AFX-CORE Identity/RBAC.

---

## 5. Authorization constitution

Authorization is contextual, not merely role-based.

Required inputs may include:

`Identity + Tenant/Organization Context + Membership + Role + Permission + Policy + Resource State`

Decision model:

`ALLOW | DENY | CHALLENGE`

Default:

**DENY.**

Sensitive authorization decisions must be auditable without recording secrets.

---

## 6. Bounded-context constitution

Every bounded context must have:

- one explicit owner;
- explicit entities;
- explicit contracts;
- explicit dependencies;
- explicit inbound/outbound interfaces;
- explicit tests.

Forbidden:

- hidden bounded contexts;
- cross-context database access;
- cross-context writes;
- shared persistence ownership;
- implicit business coupling.

Cross-context communication uses APIs, application contracts or explicit events.

---

## 7. Entity ownership constitution

Every important entity has exactly one authoritative owner.

An entity may be referenced elsewhere, but its lifecycle authority cannot be duplicated.

Conflict rule:

> **Two owners = architecture defect.**

---

# PART II — API & RUNTIME

## 8. Canonical API constitution

`https://api.afaghx.com` is the canonical application boundary.

Requirements:

- public API versioning from day one;
- explicit contracts;
- authentication and authorization at the canonical boundary;
- consistent error model;
- traceability;
- rate limiting;
- policy enforcement;
- observability.

The API Gateway performs routing, transport/security controls, rate limiting, version selection and policy enforcement.

The Gateway is **not** a business-domain god controller.

---

## 9. AFX-EXPERIENCE boundary

Experience consists of web, mobile, PWA, API clients, partner portals, supplier portals, buyer experiences, marketer workspaces, administration experiences, service experiences, AI workspaces and other channels shown in the canonical visual architecture.

Experience:

- owns presentation;
- may own interaction orchestration appropriate to the UI;
- consumes canonical APIs;
- never owns canonical Domain truth;
- never writes directly to Domain databases.

Forbidden:

`Browser → Database`

`Experience Server → AFX-CORE in-memory production runtime`

`Experience → hidden business logic → database`

---

## 10. Canonical Runtime constitution

The only production authentication/runtime path is:

```text
Gateway
   ↓
PersistentAfxCore
   ↓
AfxCoreRepository
   ↓
PostgreSQL
```

An in-memory `AfxCore` may exist only as explicitly isolated test infrastructure when required by a test.

It must never be reachable from:

- production HTTP paths;
- Experience server runtime;
- production bootstrap;
- production deployment;
- production API wiring.

### Runtime invariant

**Persistent state must survive process restart and must be shareable across service instances.**

---

## 11. Runtime truth hierarchy

```text
Architecture Decision
        ↓
Contract
        ↓
Implementation
        ↓
Test
        ↓
CI
        ↓
Runtime Evidence
        ↓
Production Evidence
```

A lower layer cannot override a failed higher-level requirement.

---

# PART III — DATABASE, SECURITY & TRUST

## 12. Database constitution

PostgreSQL is the authoritative production persistence layer for AFX-CORE state.

Rules:

- migrations are versioned;
- migrations are reproducible;
- repository code is the persistence boundary for the context;
- cross-context DB access is forbidden;
- persistent truth cannot silently fall back to memory.

Credentials and raw access/refresh tokens must never be stored as plaintext. Only appropriate one-way digests may be persisted.

---

## 13. Authentication constitution

Production authentication must provide:

- production-approved password hashing;
- short-lived access credentials;
- refresh rotation;
- refresh-family reuse detection;
- transactional race control;
- session revocation;
- secure cookies when cookies are used;
- CSRF/origin protection for state-changing browser requests;
- rate limiting and abuse controls;
- safe security headers;
- safe error responses;
- no browser local/session storage for credentials.

Where signed/JWT credentials are introduced, issuer, audience, algorithm and signature validation are mandatory.

---

## 14. Security constitution

Security is architectural, not a post-build feature.

No release is production-ready while it contains known critical security defects or an unproven trust boundary.

Forbidden:

- password/token logging;
- secret leakage in errors;
- bypassing authorization inside a Domain;
- duplicate authentication foundations;
- unsafe fallback paths;
- fake security checks.

---

## 15. Audit constitution

Security-sensitive and governance-sensitive actions must produce auditable events appropriate to the risk.

Audit records must not contain raw passwords, session tokens, refresh tokens or equivalent secrets.

---

# PART IV — BUSINESS, DATA & ECOSYSTEM

## 16. Business Domains

The canonical visual architecture contains the business ecosystem represented by areas including:

- Buyer Management;
- Seller Management;
- Product & Catalog;
- Inventory & Stock;
- Pricing & Promotion;
- Order Management;
- Customer Service;
- CRM & Loyalty;
- Marketing Automation;
- Affiliate / Referral;
- International Tax;
- Returns & Reverse Logistics;
- Quality & Inspection;
- Logistics & Shipping;
- Supplier Management;
- Procurement;
- Contracts & Agreements;
- Wallet & Credits;
- Settlement & Payout;
- Payment Management;
- Finance & Accounting.

This list represents the approved target architecture. Implementation happens by gated Domain contracts and must not be confused with a claim that every Domain is already production-ready.

---

## 17. Data & Intelligence constitution

The target architecture includes:

```text
Data Ingestion
      ↓
Data Lake
      ↓
Data Warehouse
      ↓
Data Marts
      ↓
AI / ML
      ↓
Analytics & BI
      ↓
Operational AI Use Cases
```

AI is an intelligence layer, not a replacement for domain truth.

AI must consume governed data and must not silently become an authorization or accounting authority unless explicitly assigned by architecture and evidence.

---

## 18. Integration & Ecosystem constitution

The ecosystem may integrate with:

- banks and payment gateways;
- logistics and shipping providers;
- government/customs APIs;
- social and messaging platforms;
- ERP/CRM systems;
- IoT, tracking and POS systems;
- other approved external ecosystem partners.

Every integration requires:

`Owner + Contract + Security Model + Failure Model + Observability + Evidence`

---

## 19. Infrastructure constitution

The visual architecture defines the target infrastructure including:

- Kubernetes orchestration;
- service architecture;
- SQL/NoSQL databases where justified;
- Redis/cache;
- Kafka/RabbitMQ or equivalent message infrastructure;
- object storage;
- CDN;
- backup/disaster recovery;
- high availability;
- load balancing;
- service mesh where justified.

These are **target architecture capabilities**, not a mandate to create premature infrastructure merely to make the diagram look complete.

Infrastructure is implemented only when the corresponding capability has an owner, a need, a contract, a failure strategy and evidence.

---

## 20. Cross-cutting constitution

The following are first-class architectural concerns:

- Multi-Tenancy;
- Localization / i18n;
- Multi-Currency;
- High Performance;
- Scalability;
- Business Continuity;
- Disaster Recovery;
- Data Privacy;
- Auditability;
- Sustainability / Green IT.

Cross-cutting concerns cannot be treated as optional UI decoration.

---

## 21. Data Governance & Master Data

Master Data Management governs authoritative definitions for entities such as:

- Customer;
- Product;
- Supplier;
- Organization;
- Location;
- Finance;
- Document;
- Reference/lookup data.

No competing source of truth may be introduced without an explicit architecture decision.

---

# PART V — ENGINEERING & GOVERNANCE

## 22. Four-team constitutional control

### Team 1 — Architecture / Core

Owns architecture, boundaries, contracts, security architecture, ownership and gates.

### Team 2 — Engineering / GitHub

Owns implementation, migrations, APIs, tests, CI/CD, repository hygiene and engineering evidence.

### Team 3 — AI Engineering / AI Brain

Owns the governed loop:

`Inspect → Plan → Implement → Test → Diagnose → Remediate → Evidence`

AI is never exempt from the Constitution.

### Team 4 — Governance / Evidence / Operations

Owns release governance, evidence validation, compliance, operational readiness and prevention of artificial GREEN.

No team may redefine another team's constitutional authority without an approved ADR.

---

## 23. GitHub constitution

GitHub is the engineering source of truth for:

- source code;
- migrations;
- API contracts;
- event contracts;
- tests;
- workflows;
- pull requests;
- artifacts;
- evidence;
- architecture documents.

`main` is never the place for uncontrolled direct changes.

No merge without required checks and evidence.

---

## 24. Code creation constitution

Before writing new code:

```text
Inspect
  ↓
Search existing capability
  ↓
Identify owner
  ↓
Identify contract
  ↓
Reuse?
  ↓
Extend?
  ↓
Refactor?
  ↓
Only then create new code
```

Every suspicious implementation is classified:

`KEEP | REFACTOR | REMOVE | FREEZE`

Minimal correct code is preferred over maximum code.

---

## 25. Forbidden implementation patterns

The following are constitutional violations:

- duplicate production authentication;
- duplicate production runtime;
- cross-context DB access;
- frontend-to-DB;
- business logic in Experience;
- business logic in Gateway;
- silent persistence fallback;
- fake API success represented as production data;
- unversioned public API contracts;
- secret logging;
- disabled critical tests;
- hidden dependency injection;
- unreachable or shadow implementations presented as canonical;
- direct main-branch bypass of governance;
- merge without evidence.

---

## 26. Architecture Decision Records

Any material architectural change requires an ADR covering at minimum:

- problem;
- decision;
- alternatives;
- ownership impact;
- dependency impact;
- security impact;
- runtime impact;
- evidence plan;
- migration/rollback plan.

Constitutional changes require four-team review.

---

# PART VI — EVIDENCE & QUALITY

## 27. Evidence constitution

A claim is GREEN only when executable evidence is tied to the exact commit under review.

For Canonical Runtime Gate 0, evidence must prove:

- valid authenticated request → `200`;
- missing/invalid authentication → `401`;
- authenticated but unauthorized request → `403`;
- PostgreSQL persistence;
- persistence after service restart;
- shared state across instances;
- refresh rotation;
- concurrent refresh: exactly one winner;
- reuse detection;
- family/session revocation;
- no production in-memory alternate runtime;
- Browser/API boundary;
- CI execution and success;
- deployment evidence whenever deployment is claimed.

**No evidence = NOT GREEN.**

---

## 28. No artificial GREEN constitution

The following never constitute proof:

- screenshots without reproducible execution context;
- self-declared success;
- skipped critical tests;
- mocked persistence used as proof of PostgreSQL persistence;
- fallback memory state;
- green workflow that did not execute the required test;
- manual claims unsupported by artifacts.

Unknown remains UNKNOWN. Blocked remains BLOCKED until evidence changes the state.

---

## 29. Definition of Done

A change is DONE only when all applicable conditions are true:

- architectural ownership is clear;
- implementation is complete;
- positive and negative tests exist;
- security behavior is tested where relevant;
- CI is green;
- artifacts/evidence exist;
- forbidden dependencies are absent;
- API/event/documentation contracts are synchronized;
- commit traceability exists;
- deployment is proven if claimed.

---

## 30. Production readiness

Production readiness requires evidence appropriate to the capability for:

- security;
- persistence;
- failure handling;
- recovery;
- observability;
- deployment;
- rollback;
- operational ownership.

Prototype behavior must never be represented as production readiness.

---

# PART VII — ARCHITECTURE GATES & EVOLUTION

## 31. Gate 0 — Canonical Runtime

```text
Gateway
   ↓
PersistentAfxCore
   ↓
AfxCoreRepository
   ↓
PostgreSQL
   ↓
Executable Evidence
   ↓
GREEN
```

Until Gate 0 is GREEN:

**production Domain implementation is BLOCKED.**

---

## 32. Gate 1 — Organization

After Gate 0 is GREEN, Organization becomes the first production-grade Domain.

Required identity relation:

`User → Membership → Organization → Role / Permission / Policy`

Organization must not create another authentication or authorization system.

---

## 33. Lifecycle & evolution constitution

The approved lifecycle is:

`Plan → Design → Build → Test → Deploy → Operate → Optimize`

Every stage has an owner and a gate.

Optimization never bypasses architecture ownership or evidence.

---

## 34. AI constitution

AI-generated code is held to exactly the same standard as human-written code.

AI may not:

- bypass architecture;
- invent missing evidence;
- downgrade failures;
- fabricate tests;
- introduce duplicate capability merely for convenience;
- claim production readiness without proof.

---

## 35. Technical debt & architecture drift

Architecture drift is an engineering defect.

Duplicate, dead, unreachable, contradictory or shadow code must be classified and acted upon.

Technical debt must have:

`Owner + Reason + Risk + Exit Condition`

Debt without an owner is governance failure.

---

## 36. Constitutional amendment process

Only the following may authorize a constitutional amendment:

1. documented architectural need;
2. ADR;
3. impact analysis;
4. four-team review;
5. updated tests/evidence requirements;
6. versioned constitutional release.

A constitutional amendment may never be smuggled in through implementation code.

---

# PART VIII — CURRENT STATE

## 37. Current constitutional state

| Area | Constitutional Status |
|---|---|
| AFAGHX Architecture Model | 🟢 ESTABLISHED |
| Visual Master Architecture Map | 🟢 ESTABLISHED |
| AFX-CORE Constitution | 🟢 ESTABLISHED |
| Identity / RBAC | 🟢 ESTABLISHED |
| API-First Boundary | 🟢 ESTABLISHED |
| Domain Strategy | 🟢 ESTABLISHED |
| Data & Intelligence Strategy | 🟢 ESTABLISHED |
| Experience Boundary | 🟢 ESTABLISHED |
| Infrastructure Target Architecture | 🟢 ESTABLISHED |
| Engineering / Governance Model | 🟢 ESTABLISHED |
| Evidence Model | 🟢 ESTABLISHED |
| Canonical Runtime | 🟡 IN PROGRESS |
| Runtime Full Evidence | 🟡 NOT COMPLETE |
| Organization Domain | 🔒 BLOCKED until Gate 0 GREEN |
| Production Launch | 🔒 BLOCKED until required production gates close |

**Important:** these states describe implementation/evidence readiness. They do not invalidate the approved target architecture shown in the canonical visual map.

---

## 38. Mandatory execution order

```text
1. Canonical Runtime
2. Runtime Evidence
3. Architecture Enforcement in CI
4. Repository Reconciliation
5. Close Gate 0 GREEN
6. Organization Domain
7. Production-grade Domain expansion
8. Data / Intelligence expansion
9. Ecosystem Integrations
10. Production Readiness
```

No shortcut is permitted.

---

# FINAL CONSTITUTIONAL COMMAND

> **No architecture without ownership.**  
> **No Domain without a boundary.**  
> **No production runtime without persistence.**  
> **No authentication without a single canonical foundation.**  
> **No implementation without tests.**  
> **No GREEN without evidence.**  
> **No claim of production readiness without runtime proof.**  
> **No duplicate capability merely because it is convenient.**  
> **No exception because implementation is difficult.**

## FINAL STATUS

**`AFX-MASTER-ARCH-001 v2.0` is the FINAL CONSTITUTIONAL ARCHITECTURE STANDARD of AFAGHX.**

The canonical visual architecture map supplied by the AFAGHX owner is its visual reference. The repository implementation, tests, CI/CD and runtime evidence must continuously conform to this Constitution.
