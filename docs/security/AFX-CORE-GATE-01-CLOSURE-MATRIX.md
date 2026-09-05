# AFX-CORE Gate 01 Closure Matrix

**Gate:** G01 — Authentication + Identity + Authorization Security Foundation
**Status:** OPEN — Domain Freeze ACTIVE
**Rule:** No new AFAGHX Domain may enter architecture until every RED/BLOCKED Gate-01 item is closed with code, test, CI and reviewable evidence.

## Status model

- **DONE** — implementation exists, automated test exists, CI job exists, and evidence is reviewable in the repository or CI.
- **IN PROGRESS** — implementation/design exists but one or more production acceptance conditions are missing.
- **BLOCKED** — cannot be closed because a required dependency, environment, infrastructure capability, or decision is unavailable.

## Closure matrix

| ID | Control / Deliverable | Status | Owner | Primary file(s) | Required test | CI job | Evidence required | Exit criterion |
|---|---|---|---|---|---|---|---|---|
| G01-01 | Password hashing baseline | DONE | AFX-CORE Security | `core/AFX-CORE/src/security.js` | `core/AFX-CORE/test/security.test.js` | `security-tests` | Passing test run | Argon2id hashing + constant-time verification |
| G01-02 | Credential enumeration resistance | DONE | AFX-CORE Auth | `core/AFX-CORE/src/core.js` | `security.test.js` | `security-tests` | Login rejection tests | Existing/missing user returns same public credential error |
| G01-03 | Opaque access tokens + digest storage | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` + `security.js` | access-token tests | `security-tests` | CI test evidence | Raw token returned once; SHA-256 digest retained |
| G01-04 | Access-token expiry | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | expiry test | `security-tests` | CI test evidence | Expired access token is rejected |
| G01-05 | Refresh-token rotation | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | refresh rotation test | `security-tests` | CI test evidence | Every successful refresh invalidates previous refresh token |
| G01-06 | Refresh-token reuse detection + family revocation | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | reuse test | `security-tests` | CI test evidence | Reuse revokes family and associated sessions |
| G01-07 | Session revocation | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | revocation test | `security-tests` | CI test evidence | Access + refresh credentials become unusable |
| G01-08 | Tenant isolation + deny-by-default RBAC | DONE | AFX-CORE Authorization | `core/AFX-CORE/src/core.js` | tenant/RBAC tests | `security-tests` | CI test evidence | Cross-tenant and ungranted permission requests are denied |
| G01-09 | Credential/audit redaction | DONE | AFX-CORE Audit | `core/AFX-CORE/src/core.js` | audit redaction test | `security-tests` | CI test evidence | Passwords and raw tokens absent from audit events |
| G01-10 | Durable DB-backed identity/membership/session state | DONE | AFX-CORE Data | `core/AFX-CORE/` | DB integration + transaction tests | `security-tests` | Migration + schema + transaction CI artifact `33917223250` | Durable store, unique constraints and atomic refresh rotation; evidence artifact `9953634355` |
| G01-11 | HTTP/API authentication integration | IN PROGRESS | AFX-CORE API | `core/AFX-CORE/` | HTTP integration tests | `security-tests` | Request/response integration report | Real middleware/API path validates auth context |
| G01-12 | Concurrency-safe refresh rotation | DONE | AFX-CORE Session | `core/AFX-CORE/src/repository.js` + `persistent-core.js` | `g01-12-refresh-concurrency.test.js` | `security-tests` | CI run `33918659248`, artifact `9954146881`, digest `sha256:c8cefb72e152efeaffe1ec43b77807cc7a63dbd56212cc63f176e2c60d047445` | Concurrent refresh cannot mint multiple valid successors; family/session revocation verified |
| G01-13 | Production password hashing calibration | IN PROGRESS | AFX-CORE Security | `core/AFX-CORE/src/security.js` | calibration/security tests | `security-tests` | Benchmark + reviewed parameters | Production-like benchmark and approved parameters selected and documented |
| G01-14 | MFA foundation | IN PROGRESS | AFX-CORE Identity | `core/AFX-CORE/src/mfa.js` + `core/AFX-CORE/src/core.js` | `g01-14-mfa-foundation.test.js` | `security-tests` | MFA abuse/recovery artifact | Enrollment, challenge, recovery and revocation are production tested |
| G01-15 | Browser WebAuthn / Passkeys | IN PROGRESS | AFX-CORE Identity | `core/AFX-CORE/src/webauthn.js` + `core/AFX-CORE/src/core.js` | `g01-15-webauthn.test.js` + Chromium browser evidence | `security-tests` + browser evidence step | Browser trace/log + machine-readable security artifact | Registration, authentication, origin/RP-ID validation and credential lifecycle pass; durable production deployment verified |
| G01-16 | Secure account recovery | IN PROGRESS | AFX-CORE Identity | `core/AFX-CORE/` | recovery abuse tests | `identity-security` | Abuse-case report | Recovery cannot bypass MFA/tenant authorization or enable account takeover |
| G01-17 | Login/refresh rate limiting + credential stuffing defense | IN PROGRESS | AFX-CORE Edge | `core/AFX-CORE/` | rate-limit tests | `abuse-security` | Load/abuse report | Limits and lock/risk controls are enforced and observable |
| G01-18 | CSRF + secure cookie policy | IN PROGRESS | AFX-CORE API | `core/AFX-CORE/` | CSRF integration tests | `http-security` | Browser/security report | HttpOnly/Secure/SameSite and CSRF defenses pass |
| G01-19 | TLS, security headers and strict CORS | IN PROGRESS | Platform Security | deployment/configuration | HTTP security tests | `http-security` | Header/CORS report | TLS policy, headers and allowlist CORS are verified |
| G01-20 | KMS/HSM-backed key management + rotation | BLOCKED | Platform Security | infrastructure/security | KMS integration + rotation tests | `kms-rotation` | Real KMS rotation evidence | Approved KMS/HSM environment and IAM/workload identity available; rotation tested end-to-end |
| G01-21 | Service-to-service workload identity | IN PROGRESS | Platform Security | infrastructure/security | service-auth integration tests | `service-identity` | Service identity report | No shared static credentials; short-lived workload identity verified |
| G01-22 | Persistent security audit + retention | IN PROGRESS | AFX-CORE Audit | `core/AFX-CORE/` | audit integration tests | `audit-security` | Redaction + retention evidence | Durable audit stream, retention and access controls verified |
| G01-23 | Secret/dependency/SAST/DAST/container/IaC scanning | IN PROGRESS | DevSecOps | `.github/workflows/` | pipeline validation | `security-scans` | SARIF/artifacts + zero unreviewed high/critical findings | Required scanners run on PR and protected branch |
| G01-24 | Threat model | IN PROGRESS | Security Architecture | `docs/security/` | threat-model review | `security-governance` | Reviewed threat model | Authentication abuse cases mapped to controls/tests |
| G01-25 | External penetration test | BLOCKED | Security Architecture | `docs/security/` | External assessment | `security-governance` | Independent pentest report | Test environment, scope and qualified assessor available; no open critical/high findings |
| G01-26 | Production release security gate | IN PROGRESS | Platform Security | `.github/workflows/` | gate-policy test | `afx-core-gate-01` | Machine-readable gate report | Any RED/BLOCKED control prevents protected-branch release |

## Current gate decision

**GATE 01 = RED / OPEN.**

G01-10 and G01-12 are closed at the individual-control level with implementation, deterministic tests, CI and reviewable artifacts. G01-14 has a real AFX-CORE MFA foundation with dedicated CI tests but remains IN PROGRESS pending persistence, key-management and HTTP/review closure. G01-15 has a server-side WebAuthn verification foundation, AFX-CORE facade methods, policy tests, and a real Chromium/CTAP2 browser evidence harness; it remains IN PROGRESS until production persistence/deployment/security review are complete. G01-20 and G01-25 remain explicitly BLOCKED until their external/environmental prerequisites exist. Therefore Domain Freeze remains active.

## Required evidence contract

Every control must produce all four evidence classes before becoming DONE:

1. **Implementation evidence** — exact file/path and reviewed commit.
2. **Test evidence** — deterministic automated test proving the acceptance criterion.
3. **CI evidence** — named GitHub Actions job that executes the test/control.
4. **Artifact/evidence record** — machine-readable report, log, SARIF, browser trace, migration result, KMS rotation record, or signed review as applicable.

A green unit test alone is insufficient for production closure.

## Domain Freeze Policy

Until `afx-core-gate-01` reports **PASS**:

- No new Domain is approved for implementation.
- No Domain-specific authorization model may bypass AFX-CORE.
- No service may introduce its own identity/session/token mechanism.
- New work is limited to closing Gate-01 controls, required infrastructure, tests, documentation and evidence.

## Closure rule

Gate 01 can move from **RED → GREEN** only when every row is `DONE`, every `BLOCKED` row has been resolved and reclassified `IN PROGRESS` then `DONE`, CI evidence is green on the protected branch, and the final security architecture review is recorded.
