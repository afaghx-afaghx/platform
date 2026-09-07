# AFX-CORE G01 Threat Model

**Status:** Draft for security review
**Scope:** Authentication, identity lifecycle, session management, authorization, tenant isolation, browser boundary, recovery, abuse resistance, workload identity and security evidence.

## Trust boundaries

1. Browser / untrusted client → HTTP/API boundary
2. API/application → AFX-CORE security context
3. AFX-CORE → PostgreSQL persistence
4. Service → service communication
5. CI/CD → deployment and secret/KMS boundaries
6. Security telemetry → durable audit storage

## Primary assets

- Identity records and credential verifiers
- Access and refresh session material
- Tenant and membership context
- Roles, permissions and policy decisions
- Recovery and MFA factors
- Security audit evidence
- Cryptographic keys and signing/encryption material

## Abuse cases and required controls

| Threat | Required control | Verification |
|---|---|---|
| Credential stuffing | Rate limits, lock/risk controls, generic login errors | Automated abuse/load tests |
| Token theft/replay | Opaque tokens, digest storage, short TTL, refresh rotation/reuse detection | Security + concurrency tests |
| Cross-tenant access | Tenant context before resource access; deny-by-default authorization | Cross-tenant tests |
| Privilege escalation | Membership/role/permission checks; policy enforcement | Authorization tests |
| Account takeover through recovery | MFA-aware recovery, single-use expiring recovery state | Recovery abuse tests |
| CSRF/session riding | Secure cookies, SameSite policy, CSRF protection | Browser integration tests |
| WebAuthn origin confusion | RP-ID/origin validation and credential lifecycle controls | Browser WebAuthn tests |
| Secret exposure | Secret manager/KMS boundary; no secrets in source or logs | Secret scanning + review |
| Service impersonation | Short-lived workload identity; no shared static credentials | Service identity integration tests |
| Audit tampering | Durable append-oriented audit storage and access controls | Audit integration tests |
| Supply-chain compromise | Locked dependencies, dependency/SAST/container/IaC scanning | CI security scans |

## Security invariants

- Authentication precedes authorization.
- Authorization is deny-by-default.
- A protected operation has an explicit validated tenant context.
- Raw bearer tokens and passwords never enter audit output.
- Refresh-token reuse revokes the affected family/session set.
- Identity leaving active state invalidates active sessions/families.
- Domain services do not create independent authentication authorities.
- AI/intelligence components cannot become transactional authorization authorities.

## Residual external dependencies

G01-20 requires an approved real KMS/HSM environment and end-to-end rotation evidence. G01-25 requires an independent qualified penetration test and report. Neither may be self-certified by repository tests.

## Review decision

This document is evidence input for G01-24. Final closure requires an independent security architecture review confirming that threats map to implemented controls and executable evidence.
