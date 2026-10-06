# AFAGHX Authentication & Authorization Threat Model

## Status

Draft — executable mapping added; independent security review pending.

## Scope

Authentication, Identity, Tenant Context, Membership, RBAC, Policy, Search, Audit, API/Gateway and service-to-service security primitives.

## Abuse cases

| ID | Threat | Attack path | Primary controls | Executable evidence |
|---|---|---|---|---|
| T01 | Credential stuffing | repeated login failures | G01-17, G01-01, G01-02 | security tests + abuse workflow |
| T02 | Bearer theft/replay | stolen access token | G01-03, G01-04, G01-07 | token/revocation tests |
| T03 | Refresh replay race | simultaneous refresh | G01-05, G01-06, G01-12 | concurrency tests |
| T04 | Tenant spoofing | request header/query overrides session | G01-08, G01-11 | Gateway runtime tests |
| T05 | Cross-tenant authorization | valid user accesses another tenant | G01-08, Policy controls | tenant isolation tests |
| T06 | Privilege escalation | role lacks required permission | G01-08 | RBAC deny-by-default tests |
| T07 | Policy bypass | Search/Domain skips Core Policy | Step 3/4 controls | Gateway → Core → Policy tests |
| T08 | Search tenant leakage | search query omits tenant scope | Step 4 tenant filter | live Meilisearch isolation |
| T09 | Audit evasion | credential values written to logs | G01-09, G01-22 | audit redaction/persistence tests |
| T10 | Origin abuse | untrusted browser origin | G01-19 | CORS boundary tests |
| T11 | CSRF against ambient credentials | cross-site state-changing request | G01-18 | browser/API security tests |
| T12 | Account recovery takeover | recovery bypasses identity/MFA | G01-16 | recovery abuse tests |
| T13 | MFA bypass | challenge/enrollment abuse | G01-14 | MFA abuse tests |
| T14 | Passkey origin confusion | RP-ID/origin mismatch | G01-15 | browser WebAuthn tests |
| T15 | Key compromise | leaked signing/encryption key | G01-20 | KMS rotation evidence |
| T16 | Service impersonation | shared static service credential | G01-21 | workload identity tests |
| T17 | Supply-chain injection | dependency/action/secret compromise | G01-23 | CI scanning |
| T18 | Production release bypass | insecure artifact promoted | G01-26 | protected release gate |

## Security assumptions

- AFX-CORE is the single authority for Identity, Authentication, Membership, RBAC, Policy and Audit.
- Tenant authority is derived from authenticated session context, never from request parameters.
- Security failures fail closed.
- Search and Domain consumers receive the canonical SecurityContext rather than re-authenticating.
- External KMS/HSM and independent penetration testing are assurance dependencies, not simulated in unit tests.

## Review requirement

This document becomes review-complete only after an independent security review records disposition for every high-risk threat and verifies the mapped executable evidence.
