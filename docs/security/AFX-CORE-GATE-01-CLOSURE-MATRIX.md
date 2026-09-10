# AFX-CORE Gate 01 — Closure Matrix

**Gate:** G01 — Authentication + Identity + Authorization Security Foundation  
**Decision:** `RED / OPEN` until every required control is independently evidenced.  
**Domain Freeze:** `ACTIVE` while G01 is `RED` or any control is `BLOCKED`.

> This matrix is the authoritative human-readable Gate-01 control register. It never promotes a control to `DONE` merely because implementation exists or a unit test is green.

## Four-Team ownership

| Team | Scope | Authority boundary |
|---|---|---|
| **Team 1 — Architecture & Core Security** | G01-10 → G01-16 | AFX-CORE identity, authentication, authorization, sessions, MFA, recovery and WebAuthn |
| **Team 2 — Platform, Reliability & DevSecOps** | G01-17 → G01-23 | Edge/transport, abuse controls, cookies/CSRF, TLS/CORS, KMS/HSM, workload identity, scanning |
| **Team 3 — Domain & Product Engineering** | Gate-wide conformance | No Domain implementation while freeze is active; no competing security authority or direct cross-domain persistence |
| **Team 4 — Data, Intelligence & AI** | G01-24 → G01-26 + evidence integrity | Threat model, evidence contract, governance automation, release-gate enforcement; cannot self-authorize GREEN |

## Status semantics

- **DONE** — implementation, deterministic test, named CI job, reviewable evidence artifact, and all applicable production acceptance conditions are proven.
- **IN PROGRESS** — implementation exists but one or more closure conditions/evidence classes remain open.
- **BLOCKED** — closure depends on unavailable external infrastructure, environment, assessor, or required decision. A blocked item cannot be silently treated as green.
- **RED / OPEN** — Gate decision while any required control is not `DONE`.
- **UNKNOWN** — evidence is missing or unverifiable. `UNKNOWN` is never equivalent to `GREEN`.

## Closure requirements for every control

Every control must have these evidence classes where applicable:

1. **Implementation evidence** — exact path(s) and reviewed commit.
2. **Test evidence** — deterministic automated test proving the acceptance criterion.
3. **CI evidence** — named GitHub Actions job with a successful run on the relevant head.
4. **Artifact/evidence record** — machine-readable report, log, SARIF, browser trace, migration result, rotation record, or signed review.
5. **Production/environment evidence** — mandatory when the exit criterion depends on deployment, cloud infrastructure, operational configuration, or independent assessment.

A green unit test or green documentation check alone is insufficient.

## Control matrix

| ID | Control | Team | Status | Required closure proof | Current blocker / gap |
|---|---|---|---|---|---|
| G01-01 | Password hashing baseline | Team 1 | DONE | Security implementation + deterministic security CI | — |
| G01-02 | Credential enumeration resistance | Team 1 | DONE | Negative-auth tests + CI | — |
| G01-03 | Opaque access tokens + digest storage | Team 1 | DONE | Token lifecycle tests + CI | — |
| G01-04 | Access-token expiry | Team 1 | DONE | Expiry rejection test + CI | — |
| G01-05 | Refresh-token rotation | Team 1 | DONE | Rotation test + CI | — |
| G01-06 | Refresh reuse detection + family revocation | Team 1 | DONE | Replay/family/session revocation proof + CI | — |
| G01-07 | Session revocation | Team 1 | DONE | Access/refresh revocation proof + CI | — |
| G01-08 | Tenant isolation + deny-by-default RBAC | Team 1 | DONE | Cross-tenant and permission denial tests + CI | — |
| G01-09 | Credential/audit redaction | Team 1 | DONE | Recursive redaction tests + CI | — |
| G01-10 | Durable DB-backed identity/membership/session state | Team 1 | IN PROGRESS | PostgreSQL migration, persistence, uniqueness and transaction evidence | Canonical mainline evidence must be reconciled and recorded |
| G01-11 | HTTP/API authentication integration | Team 1 | IN PROGRESS | Real HTTP request path, auth/tenant/RBAC results, artifact | CI proof exists on feature work but is not yet canonical on main |
| G01-12 | Concurrency-safe refresh rotation | Team 1 | IN PROGRESS | PostgreSQL race with one valid successor and reuse revocation | Canonical mainline concurrency evidence not yet recorded |
| G01-13 | Production password hashing calibration | Team 1 | IN PROGRESS | Production-like benchmark, approved parameters, architecture review | Production calibration/review still open |
| G01-14 | MFA foundation | Team 1 | IN PROGRESS | Durable MFA, abuse/recovery/revocation tests and review | Production integration/review still open |
| G01-15 | Browser WebAuthn / Passkeys | Team 1 | IN PROGRESS | Playwright/virtual-authenticator evidence, persistence and production RP/origin review | PR remains unmerged/draft; final production acceptance open |
| G01-16 | Secure account recovery | Team 1 | IN PROGRESS | Abuse cases proving no MFA bypass or account takeover | Production policy/evidence still open |
| G01-17 | Login/refresh rate limiting + credential stuffing defense | Team 2 | IN PROGRESS | Abuse/load evidence, shared backend, observability | Current implementation path is not production-proven |
| G01-18 | CSRF + secure cookie policy | Team 2 | IN PROGRESS | Browser/HTTP integration evidence | Production/browser proof still open |
| G01-19 | TLS, security headers and strict CORS | Team 2 | IN PROGRESS | Actual TLS termination + approved origin/header evidence | Deployment verification still open |
| G01-20 | KMS/HSM-backed key management + rotation | Team 2 | BLOCKED | End-to-end real KMS/HSM rotation evidence | Approved KMS/HSM environment + IAM/workload prerequisites unavailable |
| G01-21 | Service-to-service workload identity | Team 2 | IN PROGRESS | Short-lived workload identity integration proof | Runtime environment evidence still open |
| G01-22 | Persistent security audit + retention | Team 2 | IN PROGRESS | Durable audit, retention and access-control evidence | Production retention/access proof still open |
| G01-23 | Secret/dependency/SAST/DAST/container/IaC scanning | Team 2 | IN PROGRESS | Required scanners + SARIF/artifacts + reviewed findings | Full required pipeline/review closure pending |
| G01-24 | Threat model | Team 4 | IN PROGRESS | Reviewed threat model mapped to abuse cases, controls and tests | Final independent review pending |
| G01-25 | External penetration test | Team 4 | BLOCKED | Independent qualified pentest report with no unresolved critical/high findings | Assessor/report/test environment unavailable |
| G01-26 | Production release security gate | Team 4 | IN PROGRESS | Machine-readable fail-closed gate, protected-branch enforcement, final review | Depends on complete current matrix and all controls reaching DONE |

## Gate decision algorithm

`G01 = GREEN` **only if all** of the following are true:

- Every row G01-01 through G01-26 is `DONE`.
- No row is `IN PROGRESS`, `BLOCKED`, or `UNKNOWN`.
- Required CI jobs are green on the protected branch.
- Evidence artifacts are present and reviewable.
- All required production/environment dependencies are verified.
- Final security architecture review is recorded.
- G01-26 release gate returns `PASS`.

Otherwise:

**`G01 = RED / OPEN`.**

## Fail-closed rules

- Missing evidence → `UNKNOWN`, never `GREEN`.
- Failed required check → `RED`.
- Unavailable mandatory infrastructure → `BLOCKED`.
- Documentation-only evidence cannot close an implementation control.
- Mock/local-only evidence cannot close a production-specific exit criterion.
- AI agents can analyze, implement, test and remediate, but cannot self-approve Gate-01 GREEN.
- No domain may introduce its own identity/session/token/authorization authority.
- No direct frontend-to-database path and no cross-domain database writes are permitted.

## Domain Freeze

Until G01 returns `PASS`:

- No new business Domain is approved for implementation.
- Domain-specific authorization models cannot bypass AFX-CORE.
- Services cannot introduce separate identity/session/token mechanisms.
- Engineering scope is restricted to Gate-01 closure, prerequisite infrastructure, testing, security review, evidence and governance remediation.

## Current authoritative decision

**GATE 01 = RED / OPEN.**  
**Domain Freeze = ACTIVE.**

This matrix is intentionally strict. Its purpose is to make completion measurable and auditable, not to make the status appear green.
