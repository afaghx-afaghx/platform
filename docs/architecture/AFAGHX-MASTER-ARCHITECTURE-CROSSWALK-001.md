# AFAGHX Master Architecture Crosswalk — Audit 001

- Audit date: 2026-11-12
- Repository: `afaghx-afaghx/platform`
- Audited ref: `main`
- Audited commit: `af6d40ce84b726c71406c3517081e11331fbb42a`
- Repository tree: 412 tracked files; recursive tree response was not truncated.
- Mode: read-only inventory and mapping. No main-branch changes, merge, or deployment.

## 1. Canonical architecture interpretation

Accepted ADR-001 defines the five-layer dependency spine:

`AFX-CORE → AFX-PLATFORM → DOMAIN → INTELLIGENCE → AFX-EXPERIENCE`

Allowed dependency direction is Experience to Platform/Domain to Core; Intelligence consumes approved contracts, events, and governed data products. Core has no Domain dependency. Experience is presentation-only and has no direct database authority.

The repository currently contains conflicting taxonomies:
- ADR-001: accepted five-layer canonical spine.
- `.ai/architecture/module-map.yaml`: five named layers plus Infrastructure and Engineering/Governance listed as additional layer values (seven total).
- `docs/architecture/AFX-MASTER-ARCH-001-v2.0.md`: calls eleven mixed concerns "canonical layers".
- `docs/architecture/AFAGHX-MASTER-ARCHITECTURE-MAP-v2.0.md`: presents eleven architecture groups, which include stakeholders, infrastructure, governance, integrations, cross-cutting concerns, master data, and lifecycle. These are not all peer architectural layers.
- `AGENTS.md`: previously identified by open PR #291 as a seven-layer conflict.

**Audit interpretation (not a unilateral constitutional amendment):** retain the five-layer spine as the architecture layer model. Treat stakeholders, infrastructure, engineering/governance, integration/ecosystem, cross-cutting concerns, master-data governance, and lifecycle as architecture views or cross-cutting capability groups. PR #291 is the existing correction candidate; do not duplicate it.

## 2. Registry cardinalities — keep separate

| Registry | Declared count | Meaning | Evidence/status |
|---|---:|---|---|
| Internal module map | 18 | Internal architecture program modules | `.ai/architecture/module-map.yaml`; governed, but 7-layer labels need reconciliation |
| Experience entrypoint registry | 18 | 1 main site + 16 role/specialized entrypoints + 1 API spine | `experience/module-registry.json`; status `canonical-proposed` |
| Experience runtime matrix | 17 | The 17 module/API entrypoints excluding main site | All 17 currently `UNPROVEN` |
| Domain registry | 11 | Business bounded contexts | `domains/domain-registry.json`; registry declaration is not proof of domain-specific runtime completeness |
| Repository files | 412 | Tracked files at audited main SHA | Exact paths recorded in companion JSON inventory |

These counts must never be added together or substituted for one another.

## 3. Five-layer and cross-cutting file ownership

| Architecture owner | Main repository paths | Observed artifacts | Audit finding |
|---|---|---|---|
| AFX-CORE | `core/AFX-CORE/`, `core/README.md` | core.js, persistent-core.js, repository.js, security.js, persistence/security tests, package manifests | Real source and tests exist; production wiring and production evidence are separate gates |
| AFX-PLATFORM | `platform/Gateway/`, `platform/Search/`, `platform/README.md` | Gateway runtime, security boundary/context and tests; Meilisearch adapter/routes/tests | Concrete platform code exists; deployment and integrated runtime proof remain separate |
| DOMAIN | `domains/` | 11-domain registry, generic domain runtime/API/schema/PostgreSQL adapter/idempotency, Product query | Generic runtime covers registry names, but only Product has a separate domain-specific source folder in this tree; do not infer 11 complete bounded contexts |
| INTELLIGENCE | `intelligence/README.md` | Boundary declaration only | No Intelligence implementation files are present in the audited tree |
| AFX-EXPERIENCE | `experience/web/`, `experience/storefront/`, `experience/modules/` | Static web application, Next.js storefront, 17 module manifests, registry, runtime matrix and tests | Two separate web application roots exist; canonical production entrypoint must be made unambiguous |
| Shared contracts | `packages/contracts/`, `docs/contracts/` | TypeScript identity/API/events contracts and commerce/product contract documents | Contract assets exist; each domain/module still needs an explicit traceable contract mapping |
| Infrastructure | `infrastructure/README.md`, selected ops/workflow files | Boundary declaration and limited operational scripts/configuration | Directory itself has only a README in the audited tree; do not claim a provisioned infrastructure platform |
| Engineering & governance | `.github/`, `.ai/`, `docs/architecture/`, `docs/governance/`, `docs/security/`, root governance files | Workflows, agents, policies, architecture maps, ADRs, gates and plans | Governance assets exist; several referenced gates/files need existence and execution reconciliation |

Full path-by-path ownership and classification is in `AFAGHX-REPOSITORY-FILE-CROSSWALK-001.json`.

## 4. Internal 18-module architecture map

The 18 internal modules in `.ai/architecture/module-map.yaml` map to the five-layer spine as follows:

| IDs | Module | Owner layer |
|---|---|---|
| MOD-01–MOD-06 | Identity; Authentication; Authorization; Organization & Membership; Tenant & Policy; Audit & Trust | AFX-CORE |
| MOD-07–MOD-10 | API & Gateway; Events & Workflow; Search & Storage; Notifications & Integration | AFX-PLATFORM |
| MOD-11–MOD-15 | Commerce; Supply & Procurement; Logistics & Trade; Services & Partners; Marketing & Advertising | DOMAIN |
| MOD-16–MOD-17 | Data & Analytics; AI & Decision Intelligence | INTELLIGENCE |
| MOD-18 | Experience & Developer Platform | AFX-EXPERIENCE (developer-platform capabilities must be split/owned by Platform where they are not presentation) |

The module map lists Infrastructure and Engineering/Governance as layer values in `layer_ownership`, not as additional business modules. Their treatment must be normalized through the existing architecture reconciliation work.

## 5. Experience entrypoint and dashboard crosswalk

The canonical Experience registry declares 18 public entrypoints. The runtime matrix declares 17 non-main entries and marks every one `UNPROVEN`. Each module README under `experience/modules/` is an entrypoint manifest, not an operational dashboard implementation.

| Entry | Registry ID | Experience path/manifest | Intended domain or platform dependencies (mapping proposal; not a claim of implementation) | Runtime |
|---|---|---|---|---|
| Main ecosystem | AFX-00 | `experience/modules/main/README.md`; `experience/web/public/index.html` | Product, Commerce, Order, Supplier, Factory, Service, Logistics, Marketing, Advertising; B2C + B2B journeys | Main site not in 17-row matrix; deployment proof required |
| Executive | AFX-MOD-EXEC-001 | `experience/modules/executive/README.md` | Read models across governed domains; no direct write authority | UNPROVEN |
| Administration | AFX-MOD-ADMIN-001 | `experience/modules/admin/README.md` | AFX-CORE governance and authorized domain administration | UNPROVEN |
| Sellers | AFX-MOD-SELL-001 | `experience/modules/sell/README.md` | Product, Commerce, Order, Inventory, Advertising, Payment, Logistics | UNPROVEN |
| Buyers | AFX-MOD-BUY-001 | `experience/modules/buyer/README.md` | Product, Commerce, Order, Supplier, Service, Logistics, Payment; individual and organization buyer contexts | UNPROVEN |
| Affiliate | AFX-MOD-AFF-001 | `experience/modules/affiliate/README.md` | Partner, Marketing, Advertising, Payment/commission ledger | UNPROVEN |
| Finance | AFX-MOD-FIN-001 | `experience/modules/finance/README.md` | Payment plus future Wallet, Settlement, Payout, Accounting bounded contexts (not all registered today) | UNPROVEN |
| Inventory | AFX-MOD-INV-001 | `experience/modules/inventory/README.md` | Product and Commerce; inventory/stock ownership needs explicit domain decision | UNPROVEN |
| Logistics | AFX-MOD-LOG-001 | `experience/modules/logistics/README.md` | Logistics, Order, Product trade-item references | UNPROVEN |
| Marketing | AFX-MOD-MKT-001 | `experience/modules/marketing/README.md` | Marketing, Partner, Product/Commerce references | UNPROVEN |
| Advertising | AFX-MOD-ADS-001 | `experience/modules/ads/README.md` | Advertising, Marketing, Trust eligibility, Product/Commerce ad inventory | UNPROVEN |
| SEO | AFX-MOD-SEO-001 | `experience/modules/seo/README.md` | Experience publishing, Search, Marketing; no canonical domain owner is declared | UNPROVEN |
| Suppliers | AFX-MOD-SUP-001 | `experience/modules/supplier/README.md`; runtime matrix points to `experience/web/public/supplier.html` | Supplier, Product, Procurement (Procurement is not a separate current registry entry) | UNPROVEN |
| Factories | AFX-MOD-FAC-001 | `experience/modules/factory/README.md`; runtime matrix points to `experience/web/public/factory.html` | Factory, Product, Logistics | UNPROVEN |
| Services | AFX-MOD-SVC-001 | `experience/modules/service/README.md`; runtime matrix points to `experience/web/public/partner.html` | Service and Partner | UNPROVEN; host/path mismatch |
| Trust | AFX-MOD-TRUST-001 | `experience/modules/trust/README.md` | AFX-CORE owns trust/security authority; this is a presentation/workflow surface only | UNPROVEN |
| Support | AFX-MOD-SUPP-001 | `experience/modules/support/README.md` | Service, Order, Trust/Case workflows; case-management owner not yet registered | UNPROVEN |
| API spine | AFX-MOD-API-001 | `platform/Gateway/`; no `experience/modules/api/` manifest | AFX-PLATFORM enforcement boundary; AFX-CORE remains security authority | UNPROVEN |

### Experience path mismatches and implementation ambiguity

1. `experience/module-registry.json` declares `services.afaghx.com`, while `experience/modules/service/README.md` declares legacy `service.afaghx.com`.
2. The runtime matrix maps the Services entrypoint to `experience/web/public/partner.html`; this is not a service-specific entrypoint.
3. The module registry has no API-spine manifest directory; the API is implemented under `platform/Gateway/`, which is a valid ownership distinction but must be documented consistently.
4. The two Experience application roots, `experience/web/` (static Node web) and `experience/storefront/` (Next.js), have overlapping storefront/home responsibilities. The registry names `experience/web` as runtime baseline while the Next.js storefront has its own independent app, catalog and API routes.
5. `experience/storefront/prisma/schema.prisma` declares SQLite and generic User/Post models. `src/lib/db.ts` constructs PrismaClient. Repository search did not find an import/use of this DB helper in the audited code; classify it as an apparently orphaned persistence scaffold until usage is proven. Experience must not become a business database owner.

## 6. Domain registry crosswalk

`domains/domain-registry.json` declares these 11 bounded contexts:

| Domain | Registered capabilities | Current source evidence in main | Coverage assessment |
|---|---|---|---|
| Product | catalog, product-definition, classification | `domains/product/product-query.mjs`, tests; generic runtime and shared schema | Partial; separate product query logic exists |
| Commerce | shop, pricing, basket, commercial-offer | Generic `domains/runtime/domain-runtime.mjs`, API/schema/PostgreSQL adapter | Generic foundation only |
| Order | order-lifecycle, order-state, fulfillment-intent | Generic domain runtime/API/schema | Generic foundation only |
| Factory | factory-profile, production-capability, capacity | Generic domain runtime/API/schema | Generic foundation only |
| Supplier | supplier-profile, sourcing, supply-capability | Generic domain runtime/API/schema | Generic foundation only |
| Service | service-offer, service-provider, service-lifecycle | Generic domain runtime/API/schema | Generic foundation only |
| Partner | partner-network, partner-relations, referrals | Generic domain runtime/API/schema | Generic foundation only |
| Marketing | campaign, audience, promotion | Generic domain runtime/API/schema | Generic foundation only |
| Advertising | ad-inventory, ad-campaign, ad-delivery | Generic domain runtime/API/schema | Generic foundation only |
| Logistics | shipment, delivery, tracking | Generic domain runtime/API/schema | Generic foundation only; AFA CODE PR proposes logistics identifiers/events |
| Payment | payment-intent, transaction, refund | Generic domain runtime/API/schema | Generic foundation only; no ledger/accounting context in this registry |

**Missing as explicit bounded contexts or capabilities requiring architecture decision:** Procurement/RFQ/quotation, Wallet/Credits, Settlement/Payout, Finance/Accounting, Returns/Reverse Logistics, Quality/Inspection, Tax, CRM/Loyalty, Case Management/Support, Product Reviews, AFA CODE registry authority, and advertising billing/eligibility lifecycle. Some may be capabilities within current domains; ownership must be decided before adding domains.

### AFA CODE status

AFA CODE is not present as a first-class module in the main branch's internal module map or 11-domain registry. Existing open draft PR #289 (`feat/afa-code-identifier-contract-v1`) proposes Product ownership of product external identifiers, Factory ownership of facility/production records, and Logistics ownership of shipment/logistic-unit/SSCC/traceability events. This is the correct workstream to review; do not create a competing AFA CODE implementation branch. PR #289 is draft and its body explicitly says schemas are proposals, not production migrations, and runtime/production readiness is not claimed.

## 7. Web and storefront file ownership

| Path | Intended owner | Files observed | Audit issue |
|---|---|---:|---|
| `experience/web/` | AFX-EXPERIENCE | 123 | Static Node web app; homepage, bilingual shell, product taxonomy, role pages, tests; current registry runtime baseline |
| `experience/storefront/` | AFX-EXPERIENCE | 130 | Next.js app, catalog UI, search integration, Prisma/SQLite scaffold, product API; canonical production role unclear |
| `experience/modules/` | AFX-EXPERIENCE | 17 manifests | Manifests only, not full dashboards |
| `platform/Search/` | AFX-PLATFORM | 5 | Canonical Meilisearch adapter and route |
| `domains/` | DOMAIN | 16 | Registry, generic domain runtime/API/schema/Postgres adapter and Product query |
| `core/AFX-CORE/` | AFX-CORE | 11 | Identity/security/persistence core and tests |

The main branch contains a 34-category legacy taxonomy according to the currently inspected static homepage assets; PR #296 is the open draft for the 36-category/9x4 target, 4 image slots per category (144), 30 promotional placements, and explicit B2B/B2C paths. Its CI evidence is not approval of real product photography, ad eligibility, 8-hour ad lifecycle, or production release.

## 8. Existing corrective work — do not duplicate

| Existing PR | Scope | How this audit treats it |
|---|---|---|
| #291 | Five-layer governance reconciliation | Existing owner workstream; crosswalk records findings and awaits its exact SHA/gates/review |
| #296 | 36-basket bilingual homepage foundation | Existing homepage workstream; verify image rights, 30 ad contracts, 8-hour lifecycle, visual/accessibility and runtime before release |
| #289 | AFA CODE identifier and traceability contracts | Existing AFA CODE workstream; review domain ownership, schema migration/rollback and all CI before acceptance |
| #272 | Homepage location dock and release/API-health gate; includes Pages verification correction | Existing release-gate workstream; do not duplicate its pipefail fix; compare its base SHA and current workflow before considering integration |
| #282 | Tenant-scoped Domain API and PostgreSQL writes | Existing domain runtime workstream; evaluate exact current head/checks and integration with main |
| #286 | Technology Stack & Language Standard | Existing standards workstream; ensure its taxonomy notes remain aligned with ADR-001/PR #291 |

All above PRs were observed as open at audit time where queried; their presence does not mean merged or approved.

## 9. Corrective backlog created from this crosswalk

Only newly isolated issues should receive new branches. Existing PR workstreams above are excluded.

| Workstream | Finding | Independent branch | Intended deliverable |
|---|---|---|---|
| Experience runtime evidence | Matrix references `.github/workflows/module-runtime-gate.yml`, but that file is absent from main's 16 workflow files; all 17 rows are UNPROVEN; Services manifest/path mismatch | `fix/experience-runtime-evidence-v1` | Implement/repair matrix validation and real host probes; normalize Services manifest/path; evidence per entrypoint |
| Storefront persistence boundary | Next.js storefront contains SQLite Prisma schema and PrismaClient helper; use is not proven and conflicts with Experience-as-presentation if wired to business data | `fix/storefront-persistence-boundary-v1` | Prove whether helper is used; remove unused scaffold or replace any business-data use with canonical API contracts; tests |
| Experience runtime canonicalization | Static web app and Next.js storefront are parallel roots with overlapping storefront scope; registry currently names only `experience/web` as runtime baseline | `fix/experience-runtime-canonicalization-v1` | ADR/decision and deployment topology identifying canonical site/storefront, redirects, API path and release ownership; no duplicated business logic |

Architecture reconciliation, homepage 36-basket work, AFA CODE, Domain PostgreSQL work and Pages release verification are already represented by existing PRs and are not duplicated here.

## 10. Acceptance rules for follow-up work

- No change to `main` during this audit.
- Each remediation branch must be based on the audited main SHA or explicitly document a refreshed base.
- One bounded problem per branch; no opportunistic unrelated changes.
- No dashboard is called implemented based on README/manifest alone.
- No domain is called complete based on a registry row or generic CRUD alone.
- No module is PROVEN without live host/TLS/identity/API/Core security/Tenant/RBAC/test/CI evidence bound to exact SHA.
- No production readiness claim without deployment/runtime evidence.
- Existing PRs must be reviewed at their exact current head SHA and current required checks before any merge recommendation.

## 11. Audit verdict

The repository has a meaningful architectural foundation and real code in Core, Gateway, Search, generic Domain runtime, contracts, and Experience applications. It is not yet a proven, fully integrated ecosystem. The most important structural gaps are: contradictory architecture taxonomies, unproven role entrypoints, duplicated/ambiguous Experience runtimes, thin Intelligence/Infrastructure implementation directories, generic rather than domain-specific business coverage, and unresolved domain ownership for several AFAGHX target capabilities.

This document is an audit crosswalk, not an architecture amendment and not a production-readiness certificate.
