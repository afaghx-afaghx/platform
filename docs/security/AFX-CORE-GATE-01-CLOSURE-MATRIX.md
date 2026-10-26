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
| G01-01 | Password hashing baseline | DONE | AFX-CORE Security | `core/AFX-CORE/src/security.js` | `core/AFX-CORE/test/security.test.js` | `security-tests` | Passing test run | Salted scrypt hashing + constant-time verification |
| G01-02 | Credential enumeration resistance | DONE | AFX-CORE Auth | `core/AFX-CORE/src/core.js` | `security.test.js` | `security-tests` | Login rejection tests | Existing/missing user returns same public credential error |
| G01-03 | Opaque access tokens + digest storage | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` + `security.js` | access-token tests | `security-tests` | CI test evidence | Raw token returned once; SHA-256 digest retained |
| G01-04 | Access-token expiry | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | expiry test | `security-tests` | CI test evidence | Expired access token is rejected |
| G01-05 | Refresh-token rotation | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | refresh rotation test | `security-tests` | CI test evidence | Every successful refresh invalidates previous refresh token |
| G01-06 | Refresh-token reuse detection + family revocation | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | reuse test | `security-tests` | CI test evidence | Reuse revokes family and associated sessions |
| G01-07 | Session revocation | DONE | AFX-CORE Session | `core/AFX-CORE/src/core.js` | revocation test | `security-tests` | CI test evidence | Access + refresh credentials become unusable |
| G01-08 | Tenant isolation + deny-by-default RBAC | DONE | AFX-CORE Authorization | `core/AFX-CORE/src/core.js` | tenant/RBAC tests | `security-tests` | CI test evidence | Cross-tenant and ungranted permission requests are denied |
| G01-09 | Credential/audit redaction | DONE | AFX-CORE Audit | `core/AFX-CORE/src/core.js` | audit redaction test | `security-tests` | CI test evidence | Passwords and raw tokens absent from audit events |
| G01-10 | Durable DB-backed identity/membership/session state | DONE | AFX-CORE Data | `core/AFX-CORE/` | DB integration + transaction tests | `security-tests` | CI run `37669567245`; artifact `11503859191` (SHA256 `41c24e80c3dc63c4e7516840f4fea36072a560c54405626026e0b11376c87ccc`); exact reviewed head `8aadacc2e15f785397444f2fd921b741614b7e61` | Durable store, unique constraints and atomic login/refresh state persistence |
| G01-11 | HTTP/API authentication integration | DONE | AFX-CORE API | `core/AFX-CORE/` + `platform/Gateway/` | HTTP/Gateway integration tests | `AFX-PLATFORM Security Boundary` + `AFX Gateway Enforcement Boundary` | Current-head Gateway CI runs `37669567192` and `37669567267`; exact reviewed head `8aadacc2e15f785397444f2fd921b741614b7e61` | Real protected middleware path validates SecurityContext and tenant-bound authorization |
| G01-12 | Concurrency-safe refresh rotation | DONE | AFX-CORE Session | `core/AFX-CORE/` | race/concurrency tests | `security-tests` | CI run `37656845455`; artifact `11499365670` (SHA256 `f6ff37e9083117c385b8e62ef925efdaacfbca572e18a97c6d1b6f69d8b7bb37`) | Concurrent refresh cannot mint multiple valid successors |
| G01-13 | Production password hashing calibration | DONE | AFX-CORE Security | `core/AFX-CORE/src/security.js` | `test/password-calibration.test.js` | `AFX-CORE Password Calibration` | Run `37669567189`; artifact `11504146363`; SHA256 `73abe6c9b105e8feb5219814fc5404462f83fc0955d216f2a2d8044773bfb03a`; exact reviewed head `8aadacc2e15f785397444f2fd921b741614b7e61` | Calibrated scrypt parameters are documented and p95 remains below 1000ms/hash on CI |
| G01-14 | MFA foundation | IN PROGRESS | AFX-CORE Identity | `core/AFX-CORE/` | MFA abuse/recovery tests | `identity-security` | MFA threat/test report | Enrollment, challenge, recovery and revocation are production tested |
| G01-15 | Browser WebAuthn / Passkeys | IN PROGRESS | AFX-CORE Identity | `core/AFX-CORE/` | browser-level WebAuthn tests | `webauthn-browser` | Playwright/browser evidence | Registration, authentication, origin/RP-ID validation and credential lifecycle pass |
| G01-16 | Secure account recovery | IN PROGRESS | AFX-CORE Identity | `core/AFX-CORE/` | recovery abuse tests | `identity-security` | Abuse-case report | Recovery cannot bypass MFA/tenant authorization or enable account takeover |
| G01-17 | Login/refresh rate limiting + credential stuffing defense | IN PROGRESS | AFX-CORE Edge | `core/AFX-CORE/` | rate-limit tests | `abuse-security` | Load/abuse report | Limits and lock/risk controls are enforced and observable |
| G01-18 | CSRF + secure cookie policy | DONE | AFX-CORE API | `platform/Gateway/` | Bearer-only integration test | `AFX Gateway Enforcement Boundary` | Gateway CI evidence on exact reviewed head `8aadacc2e15f785397444f2fd921b741614b7e61`; bearer-only/cookie-only boundary tests are executed by `37669567267` | Authentication uses Authorization bearer tokens, not ambient cookies; cookie-only authentication is rejected and no auth cookie is issued; CSRF is not relied upon for authorization |
| G01-19 | TLS, security headers and strict CORS | IN PROGRESS | Platform Security | deployment/configuration | HTTP security tests | `http-security` | Header/CORS report | TLS policy, headers and allowlist CORS are verified |
| G01-20 | KMS/HSM-backed key management + rotation | BLOCKED | Platform Security | infrastructure/security | KMS integration + rotation tests | `kms-rotation` | Real KMS rotation evidence | Approved KMS/HSM environment and IAM/workload identity available; rotation tested end-to-end |
| G01-21 | Service-to-service workload identity | IN PROGRESS | Platform Security | infrastructure/security | service-auth integration tests | `service-identity` | Service identity report | No shared static credentials; short-lived workload identity verified |
| G01-22 | Persistent security audit + retention | IN PROGRESS | AFX-CORE Audit | `core/AFX-CORE/` | audit integration tests | `audit-security` | Redaction + retention evidence | Durable audit stream, retention and access controls verified |
| G01-23 | Secret/dependency/SAST/DAST/container/IaC scanning | DONE | DevSecOps | `.github/workflows/afx-security-scans.yml` | pipeline validation | `AFAGHX Security Scans` | Run `37669567152` on exact head `8aadacc2e15f785397444f2fd921b741614b7e61`; Gitleaks artifact `11504940359` (SHA256 `3fd23c87dc439334cdf1b45354a04a297d396bcca8a1ce62371b4a6e1b230d05`) + Trivy SARIF artifact `11504925389` (SHA256 `22a8a7bc50cd5828c074efc26ae5affc2fbb831583430fe2c2a1912c99545fbd`); all blocking scan jobs SUCCESS | Current-tree and added-line Gitleaks clean; Trivy clean; CodeQL clean; high/critical dependency audit clean |
| G01-24 | Threat model | DONE | Security Architecture | `docs/security/AFX-CORE-THREAT-MODEL.md` | `security-governance` validation + architecture review | `AFX-CORE Threat Model Governance` | Internal security review recorded on PR #240; current governance run `37669567149`, artifact `11504930389` (SHA256 `88dd02b66d760f6f8145ddfcec0d516a305f9add7a35453eee9863acac27d002`), exact head `8aadacc2e15f785397444f2fd921b741614b7e61` | Authentication abuse cases mapped to executable controls/tests and reviewed internally |
| G01-25 | External penetration test | BLOCKED | Security Architecture | `docs/security/` | External assessment | `security-governance` | Independent pentest report | Test environment, scope and qualified assessor available; no open critical/high findings |
| G01-26 | Production release security gate | IN PROGRESS | Platform Security | `.github/workflows/` | gate-policy test | `afx-core-gate-01` | Machine-readable gate report | Any RED/BLOCKED control prevents protected-branch release |

## Current gate decision

**GATE 01 = RED / OPEN.**

The selected persistence/session closure controls are now evidenced. Production hardening remains incomplete outside this scope. `G01-20` and `G01-25` are explicitly BLOCKED until their external/environmental prerequisites exist. Therefore Domain Freeze remains active.

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
