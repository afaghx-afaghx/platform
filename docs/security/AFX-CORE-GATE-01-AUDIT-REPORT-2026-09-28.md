# AFAGHX AFX-CORE / Gate 01 Security Audit Report
Date: 2026-09-28
Repository: afaghx-afaghx/platform
Audit subject: PR #184 / feat/gate01-wave1-2-hardening-v1
Baseline: cdeddd2b129a223017367e2a6741e3c61d61c0a8

## Executive decision
AUDIT RESULT: NOT READY FOR FINAL RELEASE
The candidate has substantial proven security controls and fresh passing CI for Wave 1/2, but the current evidence chain is not sufficient to declare Gate 01 GREEN or the release PROVEN.

## Findings

### AFX-AUD-001 — Gate closure matrix is not mechanically bound to evidence
Severity: CRITICAL
Category: Governance / Release Security
Evidence: .github/workflows/afx-core-gate-01.yml and docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md
The gate checks that the matrix exists and contains no IN PROGRESS or BLOCKED rows. It does not independently verify that each DONE row has current implementation, test, CI and artifact evidence.
Impact: A future change could mark controls DONE in the Markdown matrix and cause the machine gate to pass without proving the underlying control.
Remediation: Create a machine-readable evidence manifest, bind every control to exact tests/workflows/artifacts, reject stale or missing evidence, and require explicit attestations for external controls.
Status: OPEN

### AFX-AUD-002 — G01-23 DevSecOps is incomplete and Trivy is fail-open
Severity: HIGH
Category: CI / Supply Chain / Vulnerability Management
Evidence: .github/workflows/gate-01-devsecops.yml
Trivy runs without exit-code: 1. The action documents exit-code default as 0, so HIGH/CRITICAL findings do not automatically fail the job. The workflow also performs filesystem scanning rather than a release container-image scan, and no DAST job is present although G01-23 names DAST and container scanning.
Impact: The declared G01-23 acceptance scope is broader than the actual blocking evidence.
Remediation: Add explicit blocking exit-code behavior, container image scanning and an appropriate DAST check; preserve SARIF/artifacts and a zero-unreviewed-high/critical acceptance rule.
Status: OPEN

### AFX-AUD-003 — Product Domain re-authenticates instead of consuming canonical SecurityContext
Severity: HIGH
Category: Architecture / Security Boundary
Evidence: domains/product/product-query.mjs, platform/Gateway/runtime.mjs and AGENTS.md
Product query accepts the Authorization header, calls Core authenticateAccessToken, and calls Core authorize again. The canonical flow requires Gateway resolution of SecurityContext and Domain consumption of that context.
Impact: Two security decision paths exist for one request, creating policy divergence risk and weakening the intended Gateway-to-Domain boundary.
Remediation: Pass the immutable canonical SecurityContext from Gateway to the Product query. Remove token parsing, authentication and duplicate authorization from the Domain query.
Status: OPEN

### AFX-AUD-004 — Persistent login state is created across separate database operations
Severity: MEDIUM
Category: Data Integrity / Session Security
Evidence: core/AFX-CORE/src/persistent-core.js and core/AFX-CORE/src/repository.js
Login persists session, refresh family and initial refresh token through separate repository calls rather than one transaction.
Impact: A failure between calls can leave partial authentication state.
Remediation: Add one repository transaction for session + refresh family + initial refresh token and failure-injection rollback tests.
Status: OPEN

### AFX-AUD-005 — Gateway authentication rate limiting is process-local
Severity: MEDIUM
Category: Abuse Resistance
Evidence: platform/Gateway/security-boundary.js
Generic and authentication counters are in-memory Maps. They reset on restart and are not shared across multiple Gateway instances.
Impact: Edge limits are weaker in horizontally scaled deployments.
Remediation: Use a shared rate-limit primitive or edge/WAF control for production; retain Core persistent abuse controls.
Status: OPEN

### AFX-AUD-006 — CSRF strategy is documented but browser-level evidence is missing
Severity: MEDIUM
Category: Browser Security
Evidence: docs/security/G01-18-CSRF-cookie-policy.md
The repository uses bearer-header authentication without ambient auth cookies, but the matrix still requires browser-level security evidence.
Status: OPEN

### AFX-AUD-007 — Production TLS/edge evidence is missing
Severity: HIGH
Category: Production Security
Evidence: docs/security/G01-19-TLS-CORS-policy.md
Repository policy and Gateway headers/CORS behavior exist, but production certificate, protocol, redirect/rejection, HSTS and external endpoint evidence is not present.
Status: OPEN

### AFX-AUD-008 — Independent threat-model review is pending
Severity: MEDIUM
Evidence: docs/security/THREAT-MODEL-AUTHN-AUTHZ.md
Status: OPEN

### AFX-AUD-009 — External penetration test is a hard blocker
Severity: BLOCKER
Evidence: docs/security/G01-EXTERNAL-REVIEW-BLOCKERS.md
Independent qualified testing and remediation verification are not available and must not be simulated.
Status: BLOCKED

### AFX-AUD-010 — Real KMS/HSM and workload identity are external blockers
Severity: BLOCKER
Evidence: docs/security/G01-EXTERNAL-REVIEW-BLOCKERS.md
Approved KMS/HSM, workload identity and end-to-end rotation/service-identity evidence are not available.
Status: BLOCKED

## Positive evidence confirmed
- Tenant authority is derived from authenticated session context and spoofed tenant parameters are audited.
- SecurityContext is immutable at the Gateway boundary.
- RBAC is evaluated before Policy.
- Search consumes SecurityContext and applies a tenant-derived filter.
- Persistent refresh rotation and auth-abuse persistence use PostgreSQL transactions with locking.
- Durable security audit persistence and tenant-filtered reads exist.
- Fresh CI passed AFX-CORE Security, Gateway Security Boundary, Search Runtime, B2C Runtime, Persistence, Concurrency, HTTP and Abuse/Audit controls on the candidate lineage.
- The two prior CodeQL findings for unpinned Gitleaks/Trivy references are outdated after immutable SHA pinning.

## Gate status at audit time
G01 = RED / OPEN
Matrix DONE: 15
Unresolved: 11
External blockers: G01-20 and G01-25
PR #184: OPEN / DRAFT / UNMERGED
Main merge: NONE

## Audit disposition
Do not label this candidate FINAL, GREEN or PROVEN.
Remediation priority:
1. Mechanically bind Gate 01 to evidence instead of Markdown status.
2. Make DevSecOps blocking and complete the declared G01-23 scope.
3. Remove the Product Domain second authentication path.
4. Make persistent login state creation transactional.
5. Complete browser, production-edge, independent-review, KMS/workload-identity and external-pentest evidence.