# AFAGHX Technology Stack & Language Standard

- **Document ID:** AFX-STD-TECH-001
- **Version:** 1.0.0
- **Status:** FINAL ISSUED VERSION 1.0.0 — independent approval pending; binding only after approval and merge
- **Issued for independent review:** 2026-10-31
- **Owner:** AFAGHX Architecture / Platform Engineering
- **Applies to:** `afaghx-afaghx/platform` and all AFAGHX implementation PRs
- **Canonical repository:** `https://github.com/afaghx-afaghx/platform`

## 1. Purpose and authority

This standard establishes one default technology path for AFAGHX. Its purpose is to prevent unreviewed language proliferation, duplicate frameworks, competing sources of truth, incompatible API contracts, and operationally unsupported services.

This document is a proposed governance standard until it is approved and merged. It does not claim that every listed tool is already installed, every layer is complete, or every production control has been proven. Existing implementations must be inventoried before enforcement is automated.

**Precedence:** security and architecture invariants → approved ADRs → this standard → implementation details. A lower-level choice must not contradict a higher-level rule. Any exception requires an Architecture Decision Record (ADR), a named owner, scope, rationale, migration/exit plan, and test/operations impact.

## 2. Non-negotiable architecture

AFAGHX remains a **Modular Monolith, API First, Event Ready, Microservice Ready** platform unless an approved ADR changes that decision.

### Canonical architecture authority and dependency direction

The current constitutional architecture authority is `AFX-MASTER-ARCH-001 v2.0`, as identified by `AFX-ARCHITECTURE-100-LOCK.md` under its version-authority reconciliation. This technology standard does not redefine the full layer taxonomy.

The repository currently contains different architecture views: ADR-001 records a five-layer baseline; the Architecture Lock describes seven canonical layers; and the current constitutional master architecture enumerates eleven architectural layers. The master architecture v2.0 is the stated current authority. This layer-count discrepancy is an explicit **PARTIAL** governance finding and must be reconciled by Architecture Governance; it must not be silently treated as one identical taxonomy.

Allowed **code/module dependency direction** is defined by `docs/architecture/dependency-rules.md`:

```text
EXPERIENCE → PLATFORM / DOMAIN → CORE
INTELLIGENCE → approved contracts / events / governed data products
CORE → no business DOMAIN dependency
```

Shared-kernel dependencies remain domain-neutral and acyclic. These are dependency constraints, not a runtime request sequence. The protected-request authorization flow is separately defined as:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

All layers and capabilities retain explicit contracts and ownership boundaries.

- CORE is the source of truth for identity, authentication, authorization, organization/membership, tenant context, RBAC, policy, audit, consent, trust, configuration, feature flags, and module registry.
- The Gateway is an enforcement boundary; it is not a business domain or a god controller.
- Domains own their business rules and data. They must not bypass another domain's persistence boundary.
- EXPERIENCE must call approved APIs and must never connect directly to production databases.
- INTELLIGENCE consumes approved contracts, events, and governed data products; it must not create an alternative identity or authorization system.
- Security failures default to deny. Domain code receives a verified immutable SecurityContext, not raw credentials. Client-supplied tenant identifiers are not authoritative.

## 3. Canonical language and runtime matrix

| Layer / workload | Canonical choice | Rules |
|---|---|---|
| Existing backend, Gateway, platform and Domain runtime | **JavaScript (ECMAScript modules, `.mjs`) on Node.js** | Preserve the existing ESM runtime. Do not introduce CommonJS or convert existing runtime files to TypeScript as an incidental refactor. |
| New browser Experience applications | **TypeScript, strict mode** | Preferred language for new UI code. Reuse the repository's existing framework/build setup where one exists; do not introduce a second frontend framework or build system. |
| Frontend framework/build tool | **Existing approved framework first**; React + Vite only as the default for a genuinely new standalone Experience app if the inventory confirms no established framework | No framework migration or new framework dependency without an ADR. |
| Database schema, migrations and SQL contracts | **PostgreSQL SQL** | Migrations are reviewed, ordered, repeatable where practical, and have a documented rollback/forward-repair plan. Avoid vendor-specific behavior unless explicitly required and documented. |
| Cache, distributed rate limiting and transient coordination | **Redis, only for approved use cases** | PostgreSQL remains the durable source of truth. Redis must not silently become the authoritative business or financial store. |
| Search | **The repository's existing approved search adapter/provider** | Do not add a second search engine without an ADR, migration plan, operational owner, and relevance/consistency tests. |
| Intelligence / ML / data science | **Python only for a justified, bounded workload** | Python is not a second general-purpose backend. Any Python runtime/service requires an ADR, contract boundary, dependency/security plan, and owner. |
| Infrastructure and CI configuration | **Existing declarative formats and workflow conventions** | No parallel deployment mechanism or duplicated CI pipeline without an ADR. Secrets and environment-specific credentials stay outside source control. |
| Shell/automation | Existing repository-supported shell and scripts | Scripts must be deterministic, fail safely, and avoid embedding credentials. |

### Runtime and version pinning

- Pin supported Node.js and package-manager versions in repository-level tooling/configuration where the repository's package layout supports it.
- Use a supported LTS Node.js line for production. Upgrade through a tested PR, not an unreviewed floating runtime.
- Pin direct dependencies to reviewed version ranges and commit the single authoritative lockfile for each package-manager scope.
- Do not maintain multiple lockfiles for the same application/package.
- Pin container base images and CI actions according to repository security policy; use immutable digests where required by the applicable gate.
- Record runtime upgrades and compatibility-impacting changes in release notes or an ADR.

## 4. Framework and dependency rules

1. Reuse an existing supported library before adding a competing library for the same responsibility.
2. One application/package has one primary framework, one build pipeline, and one authoritative dependency lockfile.
3. Do not introduce a second ORM, HTTP framework, validation library, state manager, UI component system, or test runner for the same bounded responsibility without an approved ADR.
4. Prefer small, maintained dependencies. New dependencies require a clear need, maintenance/security review, license compatibility, and tests.
5. Shared code belongs in a deliberately owned package with a stable contract; do not create a shared-kernel dumping ground.
6. No circular dependencies and no reverse imports across the canonical architecture boundaries.
7. Do not use a technology merely because it is popular. The change must improve a measurable requirement and be operable by the team.

## 5. Data and persistence standard

- **PostgreSQL is the durable source of truth** for transactional platform and domain state unless an approved ADR identifies a specific exception.
- Tenant ownership must be explicit in data models and queries wherever records are tenant-scoped. A tenant identifier supplied by a caller must never override verified request context.
- Use transactions for state changes that must be atomic, including associated idempotency and audit/outbox records when required by the contract.
- Represent money and other precision-sensitive quantities using exact decimal/numeric representations and explicit currency/scale rules; do not use binary floating-point for financial arithmetic.
- Schema changes require ordered migrations, compatibility review, migration tests, and an operational recovery plan.
- Redis, search indexes, analytics stores, and event transports are derived/supporting systems unless an ADR explicitly defines otherwise.
- An outbox row being written is not proof that an event has been delivered. Delivery, retry, deduplication, observability, and replay behavior must be specified and tested separately.
- Production rollout evidence must include migration outcome, integrity/constraint validation, backup/recovery readiness, and any required tenant-isolation controls. Local integration tests alone do not prove production readiness.

## 6. API and event contracts

### HTTP APIs

- Use REST/JSON for the canonical synchronous service API unless an ADR approves a different interaction model.
- Version externally consumed API paths explicitly, beginning with `/v1`; do not silently break a published contract.
- OpenAPI is the canonical machine-readable HTTP contract. Contract changes must be reviewed with the implementation and consumer impact.
- Validate inputs at the boundary; normalize errors into a documented response shape; apply authentication, authorization, tenant context, rate limits, and audit according to route policy.
- Use explicit request/response schemas and stable error codes. Do not expose database models as accidental public API schemas.
- Idempotency behavior must be documented per operation, including key scope, request fingerprint, replay response, retention, and conflict semantics. Do not claim all operations are idempotent unless they are tested.

### Events and asynchronous messages

- Use explicit, versioned event envelopes with event ID, event type, schema version, occurrence time, producer, correlation/trace context, and relevant tenant context where authorized.
- AsyncAPI or an equivalent machine-readable event contract is required when a transport or event interface is introduced.
- Consumers must define duplicate handling, retry/backoff, poison-message behavior, ordering assumptions, and observability.
- Do not put secrets, raw access tokens, or unnecessary personal data into events.
- Event schema changes must be backward-compatible by default or include a versioned migration plan.

## 7. Testing and quality gates

Use the existing repository test runner and CI structure wherever it is already established. Do not add a competing runner simply to satisfy this document.

Minimum required test categories, as applicable to a change:

1. **Unit tests** for deterministic logic and boundary cases.
2. **Contract tests** for HTTP/event schemas and consumer compatibility.
3. **Integration tests** against the real class of dependency being relied on (for example, PostgreSQL for transaction, migration, tenant-scope, and idempotency claims).
4. **Security tests** for authentication, authorization, tenant isolation, default-deny behavior, input validation, and secrets handling.
5. **End-to-end tests** for critical user journeys when an Experience application is in scope.
6. **Performance/load tests** for rate limits, high-volume paths, and explicitly stated throughput/latency requirements.
7. **Migration/recovery tests** for schema changes and failure/rollback or forward-repair paths.

Quality rules:

- A passing CI run proves only the checks that actually executed for that commit. Skipped or not-applicable checks are not passes.
- Record the exact commit SHA and artifact/run identifiers for material release evidence.
- No green status based solely on documentation, a local assertion, or an unverified screenshot.
- Security-sensitive changes must not be merged while required security gates are failing, skipped without an approved scope decision, or lacking evidence.
- Do not publish a numerical architecture or completion score unless the approved scoring mechanism and its evidence inputs are available.

## 8. Code style, linting and formatting

- Follow the established repository conventions first; make conventions explicit through configuration rather than relying on memory.
- JavaScript modules must use ESM conventions and explicit module boundaries.
- New TypeScript applications must enable strict type checking and must not use `any` to bypass a contract without a documented, narrow justification.
- Use one formatter and one lint policy per language/package. Do not add parallel formatters or conflicting rules.
- Formatting-only changes should be separated from behavior changes where that improves reviewability.
- No dead code, placeholder implementations presented as complete, fake production data, committed secrets, or swallowed errors.

## 9. Versioning and compatibility policy

- **Public HTTP API:** explicit path versioning (`/v1`); compatible additions may remain within the current version. Breaking changes require a new version or a documented migration exception.
- **Shared packages and published contracts:** Semantic Versioning (SemVer): MAJOR for breaking changes, MINOR for backward-compatible functionality, PATCH for backward-compatible fixes.
- **Event schemas:** explicit schema version and compatibility policy; breaking payload changes require a new version or a staged migration.
- **Database schema:** ordered migration identifiers; deploy changes using expand → migrate/backfill → validate → contract where zero/low-downtime compatibility is required.
- **Internal modules:** change with the owning package and contract tests; do not use a version number to disguise an unreviewed breaking change.
- **Release artifacts:** identify the source commit, build workflow, artifact digest where available, and deployment environment. Never treat a branch name alone as immutable release evidence.

## 10. Prohibited parallel technologies and patterns

Unless an approved ADR explicitly authorizes an exception, the following are prohibited:

- A second backend language/runtime for ordinary platform or Domain APIs alongside the existing Node.js ESM runtime.
- CommonJS introduced into the ESM runtime, or an unplanned JavaScript-to-TypeScript migration mixed into unrelated changes.
- A second frontend framework, bundler, package manager, lockfile, or design system for the same application.
- A second ORM or competing persistence abstraction for the same database boundary.
- A second durable source of truth for the same business entity.
- Direct database access from Experience clients or cross-domain writes that bypass the owning Domain.
- Separate identity, authentication, authorization, tenant, or session silos inside Domains or Experience applications.
- Unversioned public APIs/events, undocumented breaking changes, or contracts inferred only from implementation code.
- A new message broker, cache, search engine, database, microservice, or orchestration platform without a demonstrated requirement, an ADR, and an operating owner.
- Credentials, secrets, production dumps, or unapproved personal data committed to the repository.
- Claims of production readiness based only on unit tests, green checks that skipped required work, or documentation without runtime evidence.

## 11. Exception / ADR template

Every proposed exception must answer:

- **Decision:** What exact standard is being changed, and for which bounded scope?
- **Context and evidence:** What requirement cannot be met by the canonical stack?
- **Alternatives:** Which existing approved options were evaluated, and why were they rejected?
- **Security and data impact:** Identity, tenant isolation, privacy, contracts, persistence, supply chain, and threat model.
- **Operational ownership:** Maintainer, support, monitoring, deployment, backup/recovery, cost, and upgrade plan.
- **Testing:** Unit, contract, integration, security, performance, and failure-mode proof.
- **Exit/migration plan:** How the exception can be removed or consolidated.
- **Approval:** Architecture owner and relevant security/data owners.

No exception is approved merely because code has already been written.

## 12. Adoption and enforcement plan

This standard has two distinct gates: **document governance approval** and **implementation conformance**. Passing the document approval gate makes the standard authoritative; it does not certify that the repository or production system already conforms.

### A. Prepare and approve the standard

1. **Inventory:** record actual languages, runtimes, framework/build tools, package managers, lockfiles, databases, migration mechanisms, test runners, and CI workflows currently present.
2. **Reconcile:** compare that inventory with this standard. Mark each item as compliant, legacy-but-supported, exception-required, or unknown.
3. **Classify unresolved items:** record every known discrepancy as PASS, FAIL, PARTIAL, UNKNOWN, or BLOCKED, with its evidence, owner or responsible workstream, and acceptance evidence. An unresolved implementation gap may remain open at document approval only when it is explicitly disclosed and is not represented as an approved exception.
4. **Approve the document:** obtain the required architecture, security, and data-owner review and repository approvals on this dedicated PR. The standard becomes binding only after the PR is approved and merged. This approval is for the policy and its recorded target decisions, not for implementation conformance.

### B. Implement and prove conformance after approval

5. **Automate:** add CI checks only after paths and existing repository conventions have been verified; checks must fail with actionable messages.
6. **Migrate safely:** legacy differences require an owner, bounded scope, tests, and a migration plan; do not force a repository-wide rewrite as a side effect. Resolve each BLOCKED or FAIL item through a separate, reviewable implementation PR.
7. **Prove:** verify enforcement on a known-good commit and on controlled negative fixtures where appropriate; preserve the exact commit SHA, workflow/run IDs, artifact identifiers, and evidence. A check is PASS only for the control that actually executed successfully.

### Initial known facts vs. facts requiring inventory

Known from the current architectural baseline and inspected implementation context:
- The repository defines a layered AFAGHX architecture and explicit security/tenant boundaries.
- Existing runtime files include JavaScript ESM `.mjs` modules.
- PostgreSQL-backed persistence and SQL migration assets exist.
- GitHub Actions is used for CI.

Not established by this document alone:
- The complete set of installed frontend frameworks, package managers, lockfiles, or test runners.
- Whether Redis, search, event delivery, or all migrations are deployed and production-operated.
- Production RLS/least-privilege configuration, disaster recovery, or end-to-end performance characteristics.
- Whether every requirement in this proposed standard currently has an automated CI gate.

These unknowns must be resolved through repository inventory and evidence, not assumption.

## 13. Definition of done and separate release gates

### A. Document readiness gate

The document is ready to enter independent formal review when all of the following are true:

- The repository inventory identifies the observed technologies, inspection scope, source references, and material limitations.
- Technology and language target decisions are explicit and do not contradict the current constitutional master architecture or the repository's accepted dependency rules.
- Known implementation and governance discrepancies are accurately classified as PASS, FAIL, PARTIAL, UNKNOWN, or BLOCKED, with evidence and acceptance criteria. The architecture layer-count discrepancy remains explicitly PARTIAL until reconciled by Architecture Governance.
- Any actual exception to a normative rule has an approved ADR. An unresolved finding is not silently converted into an exception or an approval.
- The standard's owner and review cadence are recorded.

CI enforcement and completion of every implementation remediation are **not prerequisites for review or approval of this document**, provided the gaps remain explicitly disclosed and are not described as completed or conformant.

### Approval, merge, and effective date

- Formal approval requires recorded, independent review representing Architecture Governance, Security, and Data/Domain ownership. The PR author cannot satisfy the independent-review requirement for their own change.
- Repository administrators must verify that the applicable branch-protection or ruleset configuration enforces the required approvals and status checks. Do not claim those settings are verified until their configuration has been inspected.
- The standard becomes binding only after the required approvals, successful required checks, and merge of the dedicated PR.

### B. Implementation conformance gate — separate from PR #286

The repository or a specific application may be declared conformant only after the applicable controls have been implemented and independently evidenced. At minimum:

- Required CI checks exist, execute on the relevant package and commit, and have evidence of correct positive and negative behavior.
- Required migrations and remediation items have been completed through reviewed, bounded PRs.
- Security, data, API/event contract, build, and operational controls applicable to the declared scope have been tested.
- The evidence report identifies the exact commit SHA, workflow/run IDs, artifact digests where applicable, and any remaining exclusions or blockers.

Approval or merge of this document does **not** imply that AFAGHX is fully implementation-conformant, secure in every deployment context, or production-ready.

**Review cadence:** at least every six months, and whenever a major architecture, runtime, security, data, or deployment decision changes.


## 14. Initial repository inventory — 2026-10-31

**Scope and method:** Read-only inspection of the `main` Git tree, package manifests, lockfiles, TypeScript/Next.js/Prisma configuration, selected API/event contracts, and GitHub Actions workflows. The inspected tree contained 510 paths and 16 workflow files. This is a repository configuration audit, not a local build, runtime test, dependency vulnerability scan, or production deployment audit.

### Observed inventory

| Area | Evidence in `main` | Assessment |
|---|---|---|
| Architecture taxonomy | ADR-001 records a five-layer baseline; `AFX-ARCHITECTURE-100-LOCK.md` describes seven layers; current constitutional `AFX-MASTER-ARCH-001 v2.0` enumerates eleven layers and is identified as current authority by the lock's version reconciliation. | **PARTIAL:** current authority is identifiable, but the layer-count views require explicit governance reconciliation before they are used as one taxonomy. |
| Canonical backend/runtime | `core/AFX-CORE/package.json` declares ESM and Node `>=22`; core files use JavaScript. `domains/runtime` and `platform/Gateway` contain `.mjs`/JavaScript modules. | **Observed baseline:** Node.js + JavaScript ESM. |
| Experience web | `experience/web/package.json` declares ESM, Node `>=20`, and Node's built-in test runner; source includes a JavaScript server and static/public JS modules. | Existing lightweight JavaScript Experience application; ownership and relationship to storefront must be clarified. |
| Storefront | `experience/storefront/package.json` declares Next.js 16, React 19, TypeScript, Tailwind CSS 4, ESLint 9 and Prisma 6; source contains `.ts`/`.tsx` files. | Next.js/React/TypeScript is an existing distinct Experience stack. |
| Package management | `core/AFX-CORE/package-lock.json`; `experience/storefront/bun.lock`; no root `package.json` or root lockfile was present in the inspected tree. | Separate package-manager scopes exist. This is not automatically a defect, but each application must use one documented, reproducible installation path. |
| Contracts | `packages/contracts/package.json` uses TypeScript, `tsc`, `tsx`, and strict TS configuration; `domains/runtime/domain-api.openapi.yaml` declares OpenAPI 3.1.0; event contracts are in TypeScript. | Contract artifacts exist in more than one representation; generation/drift policy and CI enforcement need verification. |
| Database | Core/domain code and workflows use PostgreSQL; `experience/storefront/prisma/schema.prisma` declares SQLite. Storefront scripts include `db:push --accept-data-loss`, `prisma migrate dev`, and `prisma migrate reset`. | **High-priority scope question:** SQLite may be a local prototype, but must not silently become an alternative production source of truth. The destructive push/reset scripts must never be used in production deployment. |
| Python | `.ai/runtime/agent-loop.py` and `.ai/runtime/forensics.py` exist. | Bounded engineering/AI automation use is visible; no evidence here establishes a general Python backend service. |
| Testing | Core and Experience web use `node --test`; contracts use `tsx --test`; storefront exposes an ESLint script but the inspected package manifest has no explicit test script. | Multiple test entrypoints reflect separate packages; the canonical required checks and coverage by package must be declared. |
| CI runtime versions | Most inspected Node workflows set Node 22; `.github/workflows/experience-ux-gate.yml` sets Node 20. `experience/web/package.json` allows Node `>=20`, while core requires `>=22`. | Runtime versions are not globally uniform. A per-package support policy is required; Node 20 should not be used for a package that requires Node 22. |
| TypeScript enforcement | Storefront `tsconfig.json` has `strict: true` but also `noImplicitAny: false`; `next.config.ts` has `typescript.ignoreBuildErrors: true`. | **High-priority quality-gate gap:** storefront production build can ignore TypeScript build errors. A dedicated reviewed migration is needed to make type errors blocking after baseline errors are measured and resolved. |
| Dependency supply chain | Core has an npm lockfile and CI uses `npm ci`; storefront has a Bun lockfile and a Bun-based start script. Workflows include both `actions/setup-node@v4` and `@v5`. | Distinct per-package package managers are possible; lockfile ownership, install commands, action pinning, and workflow conventions need consistent policy. |
| API/event versioning | Domain OpenAPI uses `/v1`; TypeScript event definitions include contract version metadata. | Positive evidence for explicit versioning; backward-compatibility checks and contract publication remain to be proven. |

### Discrepancies and actions

1. **Runtime baseline — PARTIAL:** define supported Node versions per package and align CI. Core remains Node 22+; the Experience web package may remain Node 20+ only if that compatibility is intentional and tested. Do not globally downgrade core.
2. **Storefront database — BLOCKED for production approval until clarified:** establish whether SQLite is strictly local/demo. If storefront is production-bound, it must use the approved data architecture and explicit domain/API ownership; do not perform a blanket database migration without an ADR and data migration plan.
3. **Storefront type safety — FAIL against the proposed strict enforcement target:** `ignoreBuildErrors: true` and `noImplicitAny: false` weaken enforcement. First inventory current errors, then fix them in a dedicated PR, remove the bypasses, and prove `tsc`/production build fails on a controlled type error.
4. **Experience ownership — PARTIAL:** document whether `experience/web` is a legacy/static shell, a separate product, or a predecessor to `experience/storefront`. Avoid two competing canonical storefronts; consolidation requires evidence and must not be assumed from directory names.
5. **Contracts — PARTIAL:** define which OpenAPI/TypeScript/event files are authoritative and add contract drift/compatibility checks where applicable.
6. **Install reproducibility — PARTIAL:** document per-package install/build/test commands. Do not add a root workspace or replace Bun with npm (or vice versa) without confirming deployment workflows and creating an ADR.
7. **Workflow consistency — PARTIAL:** establish supported GitHub Actions versions and Node version policy. Action major versions need not all match mechanically, but each must be supported and security-reviewed.
8. **Production claims — UNKNOWN:** this inventory does not prove deployment configuration, database isolation, backups, RLS, dependency vulnerability status, performance, or disaster recovery.

### Evidence links

- [Canonical architecture baseline ADR-001](https://github.com/afaghx-afaghx/platform/blob/main/docs/architecture/adr/ADR-001-canonical-architecture-baseline.md)
- [Architecture dependency rules](https://github.com/afaghx-afaghx/platform/blob/main/docs/architecture/dependency-rules.md)
- [Architecture Lock and version-authority reconciliation](https://github.com/afaghx-afaghx/platform/blob/main/docs/architecture/AFX-ARCHITECTURE-100-LOCK.md)
- [Current constitutional master architecture v2.0](https://github.com/afaghx-afaghx/platform/blob/main/docs/architecture/AFX-MASTER-ARCH-001-v2.0.md)
- [Core package manifest](https://github.com/afaghx-afaghx/platform/blob/main/core/AFX-CORE/package.json)
- [Storefront package manifest](https://github.com/afaghx-afaghx/platform/blob/main/experience/storefront/package.json)
- [Storefront TypeScript config](https://github.com/afaghx-afaghx/platform/blob/main/experience/storefront/tsconfig.json)
- [Storefront Next.js config](https://github.com/afaghx-afaghx/platform/blob/main/experience/storefront/next.config.ts)
- [Storefront Prisma schema](https://github.com/afaghx-afaghx/platform/blob/main/experience/storefront/prisma/schema.prisma)
- [Experience web package manifest](https://github.com/afaghx-afaghx/platform/blob/main/experience/web/package.json)
- [Contracts package manifest](https://github.com/afaghx-afaghx/platform/blob/main/packages/contracts/package.json)
- [Domain OpenAPI contract](https://github.com/afaghx-afaghx/platform/blob/main/domains/runtime/domain-api.openapi.yaml)
- [PostgreSQL integration workflow](https://github.com/afaghx-afaghx/platform/blob/main/.github/workflows/domain-postgres-integration.yml)
- [Experience UX workflow](https://github.com/afaghx-afaghx/platform/blob/main/.github/workflows/experience-ux-gate.yml)

**Audit conclusion:** The proposed standard is directionally aligned with the repository's Node.js/JavaScript ESM backend, TypeScript contracts, PostgreSQL domain foundation, and explicit API versioning. It must not be marked fully compliant until the storefront database intent, duplicate Experience ownership, Node version policy, TypeScript build bypass, and per-package reproducible checks are resolved with evidence.


## 15. Canonical target decisions and implementation boundaries

The following decisions resolve the ambiguities surfaced by the initial inventory. They define the target; they do not claim that the repository already conforms.

1. **Backend baseline:** retain Node.js 22+ and JavaScript ESM for the existing Core, Gateway, platform, and Domain runtime. TypeScript migration of these runtime layers requires a separate ADR and a bounded migration plan.
2. **Experience ownership:** treat `experience/storefront` (Next.js + React + TypeScript) as the candidate canonical commerce storefront. Treat `experience/web` as a separately owned lightweight shell/legacy surface until route, deployment, and capability evidence establishes its role. Do not duplicate commerce capabilities or delete/consolidate either application without a route-parity assessment and a dedicated PR.
3. **TypeScript enforcement:** new TypeScript code must use strict checking. The existing storefront bypasses (`typescript.ignoreBuildErrors: true` and `noImplicitAny: false`) are known remediation items, not approved exceptions. Measure the baseline, fix errors in a dedicated PR, then make typecheck and production build blocking. Do not hide unresolved errors to obtain a green gate.
4. **Database authority:** PostgreSQL is the default production relational source of truth. SQLite is permitted only for local development, tests, or an explicitly approved bounded exception. Until storefront persistence intent and its domain/API ownership are verified, storefront production database approval remains BLOCKED. Do not run `db:push --accept-data-loss`, `prisma migrate reset`, or other destructive development commands in production.
5. **Package managers:** preserve npm for `core/AFX-CORE` and Bun for `experience/storefront` while their checked-in lockfiles and deployment workflows remain authoritative. Each package must document its own install, typecheck, test, build, and start commands. A root workspace or package-manager consolidation requires an ADR.
6. **Node version policy:** Node 22+ is the default for new and production platform packages. A package-specific lower minimum is allowed only when its manifest, CI matrix, deployment runtime, and tests all explicitly demonstrate compatibility. Never run a package in CI on a Node version below its declared minimum.
7. **API and event contracts:** OpenAPI is the canonical HTTP contract; event schemas require a named source of truth, explicit versioning, runtime validation where messages cross trust boundaries, and automated compatibility/drift checks. TypeScript interfaces alone do not validate untrusted runtime payloads.
8. **Quality gates:** keep established test runners per package. Define a required check matrix that includes install reproducibility, lint, typecheck (where applicable), tests, production build, API/event contract checks, and relevant security/integration tests. Storefront must gain explicit typecheck, test, and build gates before being considered conformant.
9. **Architecture evolution:** retain the modular monolith unless measured scaling, ownership, reliability, or deployment constraints justify decomposition. A microservice, broker, database, or framework is not approved solely because it is fashionable or already prototyped.
10. **Security and tenancy:** Core remains the source of truth for identity and authorization; Gateway enforces the boundary; Domains receive verified immutable SecurityContext and enforce domain ownership. Client-supplied tenant IDs are not authoritative. Experience code cannot access production databases directly.

## 16. Remediation sequence and acceptance evidence

Resolve discrepancies through separate, reviewable PRs in this order. The accountable roles below are role-level owners; named individuals must be assigned in the relevant implementation PRs.

| Order | Work item | Accountable role | Required acceptance evidence | Initial status |
|---|---|---|---|---|
| 1 | Reconcile canonical architecture layer taxonomy | Architecture Governance | One approved, versioned taxonomy; explicit precedence across ADR-001, Architecture Lock, and Master Architecture v2.0; links and CI references reconciled | PARTIAL |
| 2 | Establish Experience route, deployment, and ownership map | Experience Engineering | Route inventory, owner per application, canonical storefront decision, duplicate-capability assessment | PARTIAL |
| 3 | Resolve storefront persistence intent and data boundary | Data / Domain Architecture | Approved ADR or explicit local-only classification; no production SQLite ambiguity; safe migration plan if required | BLOCKED |
| 4 | Restore blocking TypeScript checks | Storefront Engineering | Baseline error report; clean typecheck; production build fails on a controlled type error and passes after correction | FAIL / remediation required |
| 5 | Align runtime policy and CI | Platform Engineering | Package-to-Node matrix; CI versions meet each package minimum; supported runtime tests | PARTIAL |
| 6 | Make package workflows reproducible | Package Owners / CI Engineering | Per-package install/typecheck/test/build/start commands; lockfile-consistent clean install evidence | PARTIAL |
| 7 | Enforce contract integrity | API / Contracts Owner | OpenAPI validation, event schema validation, compatibility/drift checks, negative fixture proving failure on a breaking change | PARTIAL |
| 8 | Verify security and production controls | Security / Operations | Relevant authz/tenant tests, secret scanning, dependency/security results, deployment and recovery evidence for the target environment | UNKNOWN until evidenced |

Acceptance rules:

- Each remediation item is a dedicated PR or a tightly bounded PR with one concern; do not commit directly to `main`.
- Every report must identify the tested commit SHA, workflow/run IDs, artifact identifiers where applicable, and exact PASS/FAIL/PARTIAL/UNKNOWN/BLOCKED result.
- A green workflow is evidence only for the jobs that actually ran on the cited SHA. It does not prove production readiness, tenant isolation, backup restoration, or runtime behavior unless those checks explicitly exercise those properties.
- Do not use a numeric conformance score until a documented scoring method, weights, evidence inputs, and reproducible calculation exist. No score can override a BLOCKED critical security/data gate.
- The standard becomes binding only after review, approval, and merge. Implementation conformance is a separate status and must not be inferred from approval of this document.

## 17. Final issuance and change control

This is the **final issued content of AFX-STD-TECH-001 v1.0.0 for independent approval**. It consolidates the repository inventory, target technology decisions, architecture reconciliation, explicit unresolved findings, and acceptance evidence. It is not a claim of full implementation conformance.

**Effective-date rule:** the document is issued on 2026-10-31 but does not become a binding repository standard until the required independent Architecture Governance, Security, and Data/Domain approvals are recorded and the dedicated PR is merged under the repository's verified protection rules. The PR author cannot supply their own independent approval.

**Open release blockers:** architecture taxonomy reconciliation remains PARTIAL; storefront production persistence remains BLOCKED; storefront type enforcement remains FAIL/remediation; the other findings retain their recorded status. None may be silently treated as closed. Any material future change requires a reviewed PR; exceptions require an approved ADR with an owner, bounded scope, security/data impact, tests, operational plan, and exit strategy.

**Issued release:** `AFX-STD-TECH-001 v1.0.0`  
**Review PR:** [afaghx-afaghx/platform#286](https://github.com/afaghx-afaghx/platform/pull/286)
