# AFAGHX Platform

> Canonical mother repository for the AFAGHX Ecosystem Platform.

AFAGHX is an ecosystem platform for commerce, industry, services, business communication, intelligence, and extensible digital capabilities. It is not a single storefront and not a collection of loosely coupled features.

## Architectural baseline

The repository is governed by **AFX-MASTER-ARCH-001 V2.0** and its evidence-first closure rules.

### Seven-layer architecture

1. **AFX-CORE** — the single trust foundation: Identity, User lifecycle, Credentials, Authentication, Authorization, Organization, Membership, Tenant Context, RBAC, Policy, Audit, Consent, Trust, Configuration, Feature Flags, Registry.
2. **AFX-PLATFORM** — shared platform capabilities: API, Gateway, Events, Queue, Workflow, Search, Cache, Storage, Notification, Webhooks, Scheduler, Integration, Localization, Currency, Documents.
3. **BUSINESS DOMAIN** — bounded business capabilities with explicit entity and persistence ownership.
4. **DATA & INTELLIGENCE** — governed data products, analytics, BI, AI, recommendations, forecasting, risk and decision intelligence.
5. **EXPERIENCE** — web, mobile, administration and role-specific experiences consuming canonical APIs.
6. **INFRASTRUCTURE** — PostgreSQL, deployment, network, secrets/KMS, observability, backup and runtime operations.
7. **ENGINEERING & GOVERNANCE** — ADRs, contracts, tests, CI/CD, security gates, evidence and release controls.

### Canonical authentication/runtime flow

`HTTP Request → Gateway / HTTP Security Boundary → PersistentAfxCore → PostgresAfxCoreRepository → PostgreSQL`

The in-memory `AfxCore` implementation is test/fixture-only and is not a production authority.

### Canonical dependency direction

`EXPERIENCE → PLATFORM / APPLICATION BOUNDARIES → DOMAIN → AFX-CORE → OWNED PERSISTENCE / INFRASTRUCTURE`

`INTELLIGENCE → approved contracts / events / governed data products`

Experience never connects directly to databases. Domains never bypass another domain's persistence boundary. Domain modules never create independent authentication silos.

## Repository organization

The target structure is materialized incrementally without creating meaningless empty directories. Each directory is introduced with an owner, contract, implementation, or test. The canonical homes are:

```text
.github/        CI, security gates, governance, templates
core/           AFX-CORE trust foundation
platform/       shared platform services
 domains/       bounded business contexts
intelligence/   governed intelligence capabilities
experience/     user-facing applications
infrastructure/ runtime, KMS, secrets, network, observability
docs/           architecture, ADRs, security, API, operations
tests/          cross-cutting integration, contract, security, performance, E2E
packages/       contracts, SDKs, minimal shared kernel, testing/tooling
```

## Engineering principles

- Security and tenant isolation are foundational.
- Contracts are explicit and versioned.
- Business domains own business rules and data.
- CORE owns identity and trust primitives.
- Prefer asynchronous events for decoupled cross-domain workflows.
- Infrastructure is reproducible as code.
- Secrets never belong in source control.
- Security failures fail closed.
- Architecture decisions are recorded as ADRs.
- CI evidence, not assertions, determines completion status.
- No artificial GREEN is permitted.

## Status

Architecture V2.0 is the implementation closure candidate. Repository completion is not declared until the required runtime, security, infrastructure, domain, experience, intelligence and evidence gates are GREEN.

See `AGENTS.md` and `docs/architecture/AFX-MASTER-ARCH-001-V2.md` for the governing specification.
