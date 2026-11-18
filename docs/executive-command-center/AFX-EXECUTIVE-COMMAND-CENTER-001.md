# AFX-EXECUTIVE-COMMAND-CENTER-001
## Global Executive Command Center — Product & Architecture Contract

**Status:** DRAFT / NON-EFFECTIVE / DESIGN BASELINE ONLY  
**Target quality:** 9.85/10 (acceptance target, not a current score)  
**Repository:** `afaghx-afaghx/platform`  
**Base SHA:** `af6d40ce84b726c71406c3517081e11331fbb42a`  
**Branch:** `feat/afx-executive-command-center-v1`  
**Release rule:** No merge to `main`, no production deployment, and no operational-readiness claim from this document.

---

## 1. Product mandate

AFX Global Executive Command Center (AFX-GECC) is the executive governance, oversight, intelligence and controlled-action experience for the AFAGHX ecosystem. It is not a database superuser console and must not bypass AFX-CORE, API Gateway, domain ownership, tenant isolation, or audit controls.

The Global Super Admin is the highest governance role for the ecosystem. "Global visibility" means access to authorized, policy-filtered executive views and governed commands; it does not mean unrestricted direct database access, unlogged impersonation, or unilateral execution of every sensitive action.

Primary outcomes:
1. One global operating picture across countries, regions, organizations, business domains and teams.
2. Traceable accountability from executive targets to country, province/state, county/district, organizational unit, manager and specialist.
3. Governed control of commercial operations, people, risk, finance and platform health.
4. Early detection of opportunities, threats, underperformance and concentration risks.
5. Evidence-backed decisions, approvals, delegation and escalation.

## 2. Non-negotiable architecture boundaries

- AFX-CORE remains the sole authority for identity, authentication, authorization, organization/membership context, RBAC, policy, audit and trust primitives.
- The API Gateway is the enforcement boundary. Every protected command resolves canonical identity, tenant/organization context, membership, permission and policy before resource access.
- Executive Experience is presentation and orchestration only. It never accesses databases directly and never becomes a second authorization authority.
- Business domains own their business entities, rules, persistence and command APIs. The Command Center consumes governed APIs, events and read models; it does not write across domain databases.
- Intelligence may aggregate approved data products for reporting and decision support. It cannot silently mutate transactional domain state.
- All actions are deny-by-default, tenant-aware, geographically scoped where applicable, policy evaluated and audited.
- No user-supplied tenant, country, region, organization, role or scope value is trusted without server-side resolution and authorization.
- No secrets, tokens, credentials, private keys or sensitive production configuration are stored in this feature.

**Architecture governance blocker:** the inspected baseline contains conflicting descriptions across ADR-001, AGENTS.md and AFX-MASTER-ARCH-001 v2.0. PR #291/#292 are intended reconciliation work but must not be treated as effective until the required independent governance approval and exact-head CI evidence exist. This document is non-effective and does not resolve or supersede that conflict.

## 3. Product navigation — 24 executive domains

1. Global Overview & Executive Briefing
2. Global Geography & Market Footprint
3. Country Administration
4. Province/State and County/District Administration
5. Organization & Corporate Structure
6. Executive Roles, Managers & Workforce
7. Identity, Access & Delegation Governance
8. Sales Command
9. Marketing & Affiliate Network Command
10. Seller, Factory & Supplier Governance
11. Buyer & Customer Governance
12. Product Catalogue & Commercial Quality
13. Advertising Inventory & Campaign Governance
14. Procurement, RFQ & Sourcing
15. Orders, Trade & Contract Operations
16. Finance, Treasury & Reconciliation Oversight
17. Commission, Incentives & Payout Governance
18. AFA CODE Registry Oversight
19. Logistics, Shipment & Delivery Oversight
20. Services, Partners & Institutional Relationships
21. Customer Support, Complaints & Disputes
22. Security, Trust, Fraud & Compliance
23. Intelligence, BI, Forecasting & Decision Support
24. Platform Operations, Release & Service Health

Navigation must be configurable by permission and organizational scope. Hidden navigation is not a substitute for API authorization.

## 4. Geographic and organizational model

Geography and organization are separate hierarchies and must not be conflated.

### Geographic hierarchy
- Country
- First-level administrative subdivision (province/state/region)
- Second-level administrative subdivision (county/district)
- Optional lower-level localities where the country model requires them

The labels and levels must be configurable per country. Do not assume every country has the same administrative taxonomy.

### Organizational hierarchy
- Global executive office
- Global functional directorates
- Country organization
- Regional/provincial organization
- County/district organization
- Local office, branch or operational unit
- Team and individual assignment

A manager's authority is represented by explicit, time-bounded scope grants over an organization, geography, domain and permitted actions. A geographic assignment does not automatically grant access to every organization located there.

### Required capabilities
- Create, amend, activate, suspend and archive administrative units through governed workflows.
- Assign primary and deputy managers.
- Record effective dates, expiry, succession and temporary delegation.
- Support multiple memberships and multiple functional assignments.
- Prevent orphaned units, duplicate active heads and invalid parent-child relationships.
- Preserve historical organizational structures for time-correct reporting.
- Support cross-border organizations only through explicit, approved mappings.

## 5. Roles and authorization model

Proposed executive role families (not yet AFX-CORE role IDs):
- Global Super Admin / Global Executive Governor
- Global Functional Executive
- Country Director / Country Administrator
- Province/State Director / Administrator
- County/District Director / Administrator
- Department or Unit Manager
- Team Lead / Supervisor
- Specialist / Operator
- Independent Auditor / Read-only Reviewer

Authorization must combine:
- RBAC: role and permission
- ABAC: resource attributes, risk, employment status, time and context
- Organization scope: assigned organization tree
- Geographic scope: explicit country/subdivision grants
- Domain scope: sales, marketing, finance, security, operations, etc.
- Action scope: view, create, edit, approve, suspend, export, delegate
- Policy evaluation: ALLOW / DENY / CHALLENGE

High-impact actions require step-up authentication and, where policy requires, maker-checker or multi-party approval. The initiator must not approve their own sensitive transaction. Emergency access is time-limited, reason-coded, independently reviewable and automatically audited.

## 6. Executive homepage — required information architecture

### A. Global executive header
- AFAGHX identity and Command Center designation
- Current user, active role and active authorized scope
- Scope selector (global / country / subdivision / organization / function)
- Period selector and data freshness indicator
- Language selector (Persian RTL / English LTR)
- Notifications, pending approvals and secure session controls

### B. Executive KPI strip
Every metric must expose definition, source domain, calculation timestamp, freshness, currency/unit, authorized scope and drill-down route:
- Active countries and administrative units
- Active organizations, managers and workforce
- Buyers, sellers, factories and suppliers
- Orders, gross merchandise value and net sales (distinct definitions)
- Recognized revenue, gross margin, operating cost and cash position (not interchangeable)
- Advertising impressions, valid clicks, conversions and attributable revenue
- Open RFQs, fulfilment and delivery performance
- Open complaints, disputes and SLA breaches
- Security incidents and unresolved high-risk findings
- Platform availability, API health and critical service degradation

No placeholder or synthetic number may be presented as live data. Missing or stale sources must be visibly marked UNKNOWN / STALE / UNAVAILABLE.

### C. Global market map
- Country and administrative-unit coverage
- Authorized drill-down by country → subdivision → county/district
- Commercial footprint, operational health and risk overlays
- Explicit map-data freshness and source attribution
- No inference that a country is operational merely because it exists in master data

### D. Executive performance
- Country and region scorecards
- Functional directorate scorecards
- Manager and team scorecards
- Target vs actual, trend, variance and confidence
- Peer comparison adjusted for market maturity, budget, team size and operating conditions
- Drill-down to source evidence and accountable owner

### E. Opportunity and threat intelligence
- Market expansion opportunities
- Under-served product and category demand
- Supplier concentration and supply interruption risks
- Sales decline and conversion anomalies
- Campaign fraud and invalid traffic
- Financial exposure and reconciliation anomalies
- Compliance deadlines and country-specific obligations
- AI-generated recommendations with rationale, evidence, confidence and human decision status

### F. Decision and action queue
- Pending approvals
- Escalated incidents
- Overdue executive decisions
- Budget and target exceptions
- Access/delegation requests
- Corrective action plans
- Owner, due date, impact, SLA and immutable decision history

### G. Platform and trust health
- Gateway and API status
- AFX-CORE identity and authorization status
- Database and persistence health (read-only operational telemetry)
- Event/queue lag and failed workflows
- Search, notification, storage and integration health
- Security alerts, backups and disaster-recovery evidence
- CI/CD, release provenance and deployment state

## 7. Domain workspaces and minimum capabilities

### Sales
Pipeline, opportunities, conversion, order attribution, targets, lost reasons, territory coverage, manager/team productivity and customer retention.

### Marketing and affiliate network
Campaigns, channels, marketers, referrals, attribution chain, valid/invalid clicks, conversion, acquisition cost, campaign ROI, commission eligibility and fraud controls.

### Finance
Revenue and expense oversight, treasury, multi-currency balances, receivables/payables, reconciliation, refunds, tax obligations, budgets, country-level exposure and financial close status. Payment execution remains behind finance-domain authorization and approval controls.

### Workforce
Manager directory, reporting lines, employment/contract status, appointments, performance reviews, training, workload, vacancies, succession, delegation and disciplinary case workflow. Sensitive HR records require narrower permissions than general executive KPIs.

### Security and trust
Identity assurance, MFA posture, access reviews, privileged sessions, policy denials, anomalous activity, incident response, fraud cases, audit evidence and compliance control status.

### AFA CODE
Read-only/authorized oversight of factory, organization, seller, product, shipment and tracking identifiers. Identifier issuance and lifecycle remain with the authoritative AFA CODE domain contract.

### Procurement, trade and logistics
RFQs, quotation comparison, supplier quality, contracts, shipment status, customs/documentation milestones and delivery exceptions.

### Platform operations
Service health, API latency/error rates, job queues, deployment provenance, rollback readiness, backup evidence, disaster recovery and release gates.

## 8. Performance and risk scoring

No single opaque "manager score" is permitted.

Each scorecard must:
- Publish its formula, weights, version and owner.
- Separate outcome, quality, compliance, customer impact and operational discipline.
- Compare like-for-like cohorts.
- Account for targets, available resources, market maturity and data completeness.
- Show confidence and sample size.
- Preserve historical score versions.
- Permit an appeal/correction workflow.
- Never make automated employment or disciplinary decisions.

AI outputs are recommendations, not authoritative facts. They must include provenance, confidence, explanation, limitations and a human decision record.

## 9. Core conceptual entities

These are design concepts only; canonical ownership and physical schemas require domain-owner approval:
- GeographicUnit, GeographicHierarchyVersion
- Organization, OrganizationUnit, OrganizationRelationship
- Membership, RoleAssignment, PermissionGrant
- AdministrativeScopeGrant, DomainScopeGrant
- Delegation, DelegationApproval, SuccessionAssignment
- ExecutiveTarget, KPIdefinition, KPIObservation, ScorecardVersion
- Alert, RiskCase, OpportunityCase
- ApprovalRequest, DecisionRecord, CorrectiveAction
- AuditEvent, AccessReview, PrivilegedSession
- DataProduct, MetricProvenance, FreshnessStatus

Each entity must have exactly one authoritative owner. The geography master-data owner and the authoritative organization-to-geography mapping require an explicit architecture/domain decision before schema implementation.

## 10. API and event contract requirements

All route names below are illustrative and must not be implemented until contract review:
- Executive read APIs: scoped overview, KPI observations, scorecards, map coverage, alert feed and decision queue.
- Administration commands: create/update organizational unit, assign manager, grant/revoke scoped authority and delegate authority.
- Workflow commands: submit approval, approve/reject, escalate and close corrective action.
- Domain commands: sales, marketing, finance, HR, AFA CODE and logistics actions must call their owning domain's approved command boundary.
- Audit APIs: immutable event query, access review and evidence export under strict policy.

Requirements:
- Versioned OpenAPI/event schemas.
- Idempotency keys for retryable commands.
- Correlation/trace IDs.
- Optimistic concurrency or explicit conflict resolution.
- Pagination and bounded query costs.
- Rate limits and export controls.
- No client-provided tenant or scope trust.
- No cross-domain database writes.
- No secrets or raw tokens in logs/events.

## 11. Audit, privacy and data governance

- Log actor, effective identity, role, authorized scope, action, target, decision, policy version, timestamp, correlation ID, reason and approval chain.
- Never log passwords, bearer tokens, private keys or unnecessary personal data.
- Restrict sensitive HR, finance, customer and security data by field and purpose.
- Support retention, legal hold, deletion and export policies by jurisdiction.
- Record privileged access, exports, impersonation-like support workflows and emergency access.
- Require periodic access certification and manager recertification.
- Separate read, export, approve and execute permissions.
- Make audit history tamper-evident and independently reviewable.

## 12. UX and accessibility requirements

- Persian RTL and English LTR as first-class experiences.
- Desktop-first executive density with responsive tablet/mobile layouts.
- Keyboard-first navigation, visible focus, semantic landmarks and accessible charts/tables.
- Clear global-vs-local scope indicator on every page.
- Persistent filters with explicit reset and shareable, permission-safe views.
- Tables with saved views, sorting, filtering, pagination and export governance.
- Every chart has a textual/table alternative.
- Empty, loading, error, stale and unauthorized states are explicitly designed.
- No decorative KPI values, fake map pins, or non-functional controls.
- Critical actions use confirmation, consequence preview and approval workflow.

## 13. Non-functional acceptance targets

Targets must be measured on the real deployment and representative data:
- p95 executive read API latency target: <= 500 ms for cached, bounded overview queries; deeper analytics may use asynchronous jobs and disclose freshness.
- No unbounded global scans from the browser.
- Scope-aware caching with safe invalidation; no cross-tenant cache leakage.
- WCAG 2.2 AA target for key workflows.
- Responsive QA at 1440, 1024, 768 and 390 CSS pixels.
- No horizontal overflow in supported layouts.
- Load, soak, concurrency and failure-recovery tests sized from an approved capacity model.
- Explicit RPO/RTO and backup/restore evidence for critical control-plane dependencies.

These are acceptance targets, not claims of achieved performance.

## 14. Four-protocol acceptance gates

### Protocol 1 — Architecture and governance
- ADR and ownership approval.
- No violation of CORE, Gateway, domain, tenant or data boundaries.
- Explicit geography, organization and metric ownership.
- Versioned contracts and dependency review.
- No unresolved constitutional conflict affecting the implementation.

### Protocol 2 — Security and trust
- Threat model and abuse cases.
- RBAC/ABAC and scope-isolation tests.
- Cross-country, cross-organization and cross-tenant negative tests.
- Privileged-action step-up and maker-checker tests.
- Audit integrity, privacy, export and emergency-access tests.
- Independent security review.

### Protocol 3 — Product quality and verification
- Unit, contract, integration, browser and accessibility tests.
- Persian RTL / English LTR visual and interaction QA.
- Responsive screenshots at required viewports.
- Real API-bound data states and empty/error/stale states.
- Performance, load and recovery evidence.
- No critical/high defects; all controls traceable to requirements.

### Protocol 4 — Operational and release evidence
- Exact-head CI green and immutable SHA recorded.
- Deployment provenance and environment configuration review.
- Observability, alerting, backup/restore and rollback evidence.
- Runbooks, ownership, incident and support procedures.
- Independent final review.
- No merge or deployment until all required gates are satisfied.

## 15. Release and scoring policy

- 9.85/10 is the minimum requested design/product acceptance target.
- A score is not a substitute for mandatory gates; any critical security, architecture or data-integrity failure blocks release regardless of average score.
- Score each protocol separately with evidence references, test IDs, SHA and residual risks.
- UNKNOWN is not PASS. A skipped check is not PASS. A successful build is not production proof.
- The final score is issued only after exact-head evidence and independent reviews.
- Main branch and production deployment remain untouched by this design baseline.

## 16. Delivery sequence

1. Read-only architecture and repository discovery; resolve constitutional conflict and domain ownership.
2. Approve this product/architecture contract and threat model.
3. Define AFX-CORE role/policy contracts and geography/organization ownership.
4. Build executive read-model contracts and mock-free data states.
5. Implement the global overview and scope-safe navigation.
6. Implement organization/workforce governance.
7. Integrate sales, marketing, finance, AFA CODE, procurement and logistics read models.
8. Implement approval workflows and audited commands.
9. Add intelligence, alerts and recommendations.
10. Complete accessibility, responsive, security, load and operational evidence.
11. Independent four-protocol review and final acceptance.

**Current truth:** This file is a design contract candidate on an isolated branch. It is not implementation, not an approved ADR, not an authorization policy, not a live dashboard, and not evidence of production readiness.
