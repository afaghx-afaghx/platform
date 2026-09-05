# AFAGHX Platform

> Canonical mother repository for the AFAGHX Ecosystem Platform.

AFAGHX is an ecosystem platform for commerce, industry, services, business communication, intelligence, and extensible digital capabilities. It is not a single storefront and not a collection of loosely coupled features.

## Architectural baseline

The repository follows the approved five-layer spine:

1. **AFX-CORE** — the single trust foundation: Identity, User lifecycle, Credentials, Authentication, Authorization, Organization, Membership, Tenant Context, RBAC, Policy, Audit, Consent, Trust, Configuration, Feature Flags, Registry.
2. **AFX-PLATFORM** — shared platform capabilities: API, Gateway, Events, Queue, Workflow, Search, Cache, Storage, Notification, Webhooks, Scheduler, Integration, Localization, Currency, Documents.
3. **DOMAIN** — independently bounded business capabilities with explicit persistence ownership.
4. **INTELLIGENCE** — AI, analytics, recommendations, automation, risk and governed data products.
5. **EXPERIENCE** — web, mobile, administration and role-specific applications.

### Canonical security/request flow

`Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State`

### Canonical dependency direction

`EXPERIENCE → PLATFORM / DOMAIN → CORE`

`INTELLIGENCE → approved contracts / events / governed data products`

Experience never connects directly to databases. Domains never bypass another domain's persistence boundary. Domain modules never create independent authentication silos.

## Repository organization

The target structure is materialized incrementally without creating meaningless empty directories. Each directory is introduced with an owner, contract, implementation, or test. The canonical homes are:

```text
.github/        CI, security gates, governance, templates
core/           AFX-CORE trust foundation
platform/       shared platform services
domains/        bounded business contexts
intelligence/   governed intelligence capabilities
experience/     user-facing applications
infrastructure/ runtime, KMS, secrets, network, observability
database/       migrations, schemas and data tooling
packages/       contracts, SDKs, minimal shared kernel, testing/tooling
tests/          cross-cutting integration, contract, security, performance, E2E
docs/           architecture, ADRs, security, API, operations
scripts/        development, test, deployment and maintenance tooling
docker/         local/container runtime assets
routes/         application route boundaries
resources/      views, localization and frontend resources
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

## Status

The architectural baseline is formally established. Implementation proceeds inside this spine; future structural changes require an ADR and architecture review.

See `AGENTS.md` and `docs/architecture/` for the governing specification.
