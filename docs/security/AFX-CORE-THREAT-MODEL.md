# AFX-CORE Authentication Threat Model

**Scope:** Identity, Authentication, Tenant Context, Membership, RBAC, Session and Refresh lifecycle.

## Trust boundaries

1. Untrusted client input reaches the Gateway/API boundary.
2. Gateway authentication establishes immutable SecurityContext.
3. AFX-CORE resolves identity, tenant membership and RBAC.
4. Persistent state is stored in PostgreSQL.
5. Domain resource access consumes SecurityContext and never receives bearer tokens.

## High-risk abuse cases and controls

| Threat ID | Abuse case | Primary control | Executable evidence |
|---|---|---|---|
| TM-01 | Credential enumeration | uniform invalid-credential result | `core/AFX-CORE/test/security.test.js` |
| TM-02 | Password database disclosure | salted memory-hard password hashing | `security.test.js` + calibration CI |
| TM-03 | Bearer token theft | opaque short-lived access tokens; digest persistence | `security.test.js` + Gateway CI |
| TM-04 | Refresh token replay | rotation + reuse detection + family revocation | persistence race/reuse tests |
| TM-05 | Concurrent refresh race | row locks + transaction boundary | PostgreSQL concurrent-refresh test |
| TM-06 | Cross-tenant authorization | session-bound tenant + deny-by-default RBAC | tenant isolation tests + Gateway integration |
| TM-07 | Client-supplied tenant override | trusted SecurityContext tenant; protected path ignores override | Gateway integration evidence |
| TM-08 | Privilege escalation | explicit role/permission lookup, deny-by-default | RBAC tests |
| TM-09 | Audit credential leakage | explicit audit allowlist and durable redaction | persistence audit tests |
| TM-10 | Partial login state | atomic Family + Session + RefreshToken transaction | rollback test |
| TM-11 | Orphan session/family state | session→family foreign key | PostgreSQL schema test |
| TM-12 | Edge bypass of authn/authz | Gateway callbacks enforced and fail closed | Gateway boundary tests |

## Residual production threats

MFA/passkeys, secure account recovery, adaptive abuse controls, CSRF/cookie policy, TLS deployment, workload identity, KMS/HSM lifecycle and independent penetration testing remain separately gated controls.

## Review rule

This threat model is considered reviewed only when the associated PR contains an explicit security-architecture review record. A document without review evidence is not a closed control.