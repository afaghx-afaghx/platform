# AFX-CORE Gate 01 — Four-Team Closure Plan

**Gate:** G01 — Authentication + Identity + Authorization Security Foundation  
**Decision:** RED / OPEN until every applicable control is proven by implementation, deterministic test, GitHub Actions evidence, reviewable artifact, and required production/environment evidence.  
**Domain Freeze:** ACTIVE while Gate 01 is RED or any control is BLOCKED.

## Non-negotiable closure rule

A control is `DONE` only when all required evidence classes exist and are reviewable:

1. **Implementation** — exact path and reviewed commit.
2. **Test** — deterministic automated test for the acceptance criterion.
3. **CI** — named GitHub Actions job with a successful run.
4. **Evidence artifact** — machine-readable report, log, SARIF, browser trace, migration result, rotation record, or signed review as applicable.
5. **Production acceptance** — required whenever the control depends on deployment, infrastructure, external assessment, or approved operational configuration.

A green unit test, a green PR check, or a documentation claim alone never closes G01.

## Four-team execution model

| Team | Authority | Primary controls | Required output |
|---|---|---|---|
| **Team 1 — Architecture & Core Security** | AFX-CORE identity, authentication, authorization, session, MFA, recovery, WebAuthn | G01-10 → G01-16 | Secure core implementation + deterministic security evidence |
| **Team 2 — Platform, Reliability & DevSecOps** | HTTP/edge security, rate limits, cookies/CSRF, TLS/CORS, KMS/HSM, workload identity, scanning | G01-17 → G01-23 | Runtime/security controls + CI/scan/infrastructure evidence |
| **Team 3 — Domain & Product Engineering** | Domain boundary integrity and dependency discipline | Gate-wide architecture conformance; no domain bypass | No new business-domain implementation while Domain Freeze is active; validate that no domain creates a competing security authority |
| **Team 4 — Data, Intelligence & AI** | Evidence integrity, governance automation, independent review support, AI control-plane conformance | G01-24 → G01-26 plus evidence-contract integrity | Threat model, evidence validation, release-gate enforcement; no authority to self-approve GREEN |

## Control closure matrix

| ID | Control | Team | Status | Blocking condition | Proof required before DONE |
|---|---|---|---|---|---|
| G01-01 | Password hashing baseline | Team 1 | DONE | — | Security test + CI |
| G01-02 | Credential enumeration resistance | Team 1 | DONE | — | Negative-auth test + CI |
| G01-03 | Opaque access tokens + digest storage | Team 1 | DONE | — | Token lifecycle test + CI |
| G01-04 | Access-token expiry | Team 1 | DONE | — | Expiry test + CI |
| G01-05 | Refresh-token rotation | Team 1 | DONE | — | Rotation test + CI |
| G01-06 | Refresh reuse detection + family revocation | Team 1 | DONE | — | Reuse/family-revocation test + CI |
| G01-07 | Session revocation | Team 1 | DONE | — | Revocation test + CI |
| G01-08 | Tenant isolation + deny-by-default RBAC | Team 1 | DONE | — | Cross-tenant/RBAC tests + CI |
| G01-09 | Credential/audit redaction | Team 1 | DONE | — | Redaction tests + CI |
| G01-10 | Durable DB-backed identity/membership/session state | Team 1 | IN PROGRESS | Mainline CI/evidence must be reconciled with current canonical branch | PostgreSQL migration, persistence and transaction evidence |
| G01-11 | HTTP/API authentication integration | Team 1 | IN PROGRESS | Evidence exists on feature branch but is not yet canonical on main | Real HTTP integration + named CI job + artifact |
| G01-12 | Concurrency-safe refresh rotation | Team 1 | IN PROGRESS | Canonical mainline evidence not yet recorded in matrix | Deterministic PostgreSQL race proof |
| G01-13 | Production password hashing calibration | Team 1 | IN PROGRESS | Production-like calibration/review required | Benchmark, approved parameters, review |
| G01-14 | MFA foundation | Team 1 | IN PROGRESS | Production closure requires durable integration and review | MFA abuse/recovery/revocation evidence |
| G01-15 | Browser WebAuthn / Passkeys | Team 1 | IN PROGRESS | PR exists but remains draft and not merged | Browser evidence + persistence + production configuration review |
| G01-16 | Secure account recovery | Team 1 | IN PROGRESS | Recovery must be proven against takeover/MFA bypass cases | Abuse-case tests + production policy evidence |
| G01-17 | Login/refresh rate limiting + credential stuffing defense | Team 2 | IN PROGRESS | Shared production backend and observability required | Abuse/load evidence + production configuration |
| G01-18 | CSRF + secure cookie policy | Team 2 | IN PROGRESS | Browser/HTTP integration evidence required | Browser security evidence |
| G01-19 | TLS, security headers and strict CORS | Team 2 | IN PROGRESS | Actual TLS termination and approved origins require verification | HTTP/deployment evidence |
| G01-20 | KMS/HSM-backed key management + rotation | Team 2 | BLOCKED | Real approved KMS/HSM environment and workload IAM unavailable | End-to-end rotation evidence |
| G01-21 | Service-to-service workload identity | Team 2 | IN PROGRESS | Runtime identity proof required | Short-lived identity integration evidence |
| G01-22 | Persistent security audit + retention | Team 2 | IN PROGRESS | Durable retention/access evidence required | Audit integration + retention/access proof |
| G01-23 | Secret/dependency/SAST/DAST/container/IaC scanning | Team 2 | IN PROGRESS | Required scanners must run and findings must be reviewed | SARIF/artifacts + review |
| G01-24 | Threat model | Team 4 | IN PROGRESS | Independent security review still required | Reviewed threat model mapped to tests/controls |
| G01-25 | External penetration test | Team 4 | BLOCKED | Independent qualified assessor/report unavailable | Independent pentest report; no open critical/high findings |
| G01-26 | Production release security gate | Team 4 | IN PROGRESS | Must consume the authoritative current matrix and fail closed | Machine-readable gate decision + protected-branch enforcement |

## Team interaction contract

### Team 1 — Architecture & Core Security

Owns the security authority inside AFX-CORE. No domain may create a second identity, session, token, MFA, or authorization authority. Changes must preserve tenant context, membership, RBAC, policy evaluation, and fail-closed behavior.

### Team 2 — Platform, Reliability & DevSecOps

Owns transport, runtime, infrastructure-security and scanning controls. Production controls may not be marked complete from mocks, localhost-only tests, or contracts alone when the exit criterion requires live infrastructure evidence.

### Team 3 — Domain & Product Engineering

Is deliberately constrained by Domain Freeze. No business-domain implementation may be used to bypass Gate 01. Domain work resumes only after the release gate reports PASS and the freeze is explicitly removed by governance.

### Team 4 — Data, Intelligence & AI

Owns evidence integrity and governance automation. AI may analyze, propose, test and remediate, but it cannot self-authorize a GREEN decision. Evidence consumers must validate provenance and reviewer independence.

## Gate decision semantics

`GREEN` means every applicable control is `DONE`, there are no unresolved `BLOCKED` controls, protected-branch CI is green, evidence is reviewable, and the final security architecture review is recorded.

`RED` means one or more required controls remain incomplete, failed, unverifiable, or blocked.

`UNKNOWN` means evidence is missing or cannot be independently verified. `UNKNOWN` is never treated as GREEN.

## Current decision

**GATE 01 = RED / OPEN.**

The purpose of this document is to make the closure path executable and unambiguous; it does not convert any incomplete control to DONE.

## Domain Freeze

While G01 is RED or any control is BLOCKED:

- No new business domain is approved for implementation.
- No domain-specific authentication/session/token authority may be introduced.
- No cross-domain database access is permitted.
- New engineering work is limited to Gate-01 closure, prerequisite infrastructure, tests, documentation, evidence, remediation, and governance controls.
