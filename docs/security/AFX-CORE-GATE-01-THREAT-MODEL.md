# AFX-CORE Gate 01 Threat Model

**Status:** Draft for security architecture review
**Gate:** G01 — Authentication + Identity + Authorization Security Foundation
**Decision:** Gate remains RED / Domain Freeze ACTIVE until all controls have implementation, test, CI, reviewable evidence, and production acceptance evidence.

## 1. Security objectives

1. Establish AFX-CORE as the single authority for identity, authentication, session, tenant context, authorization and security audit.
2. Prevent credential disclosure, account enumeration, token theft/replay and refresh-token family abuse.
3. Enforce tenant isolation and deny-by-default authorization.
4. Ensure browser authentication has explicit CSRF, cookie, origin and transport protections.
5. Ensure service-to-service authentication uses workload identity rather than shared static credentials.
6. Ensure security events are durable, redacted, attributable and reviewable.

## 2. Assets

| Asset | Security property | Primary controls |
|---|---|---|
| Password verifier | Confidentiality/integrity | G01-01, G01-02, G01-13 |
| Access token digest | Confidentiality/integrity | G01-03, G01-04, G01-07 |
| Refresh-token family | Integrity/replay resistance | G01-05, G01-06, G01-12 |
| Session state | Integrity/availability | G01-07, G01-10, G01-12, G01-18 |
| MFA secret/recovery codes | Confidentiality/one-time use | G01-14, G01-16, G01-20 |
| WebAuthn credentials | Authenticity/integrity | G01-15 |
| Tenant membership/roles | Authorization integrity | G01-08 |
| Audit events | Integrity/confidentiality | G01-09, G01-22 |
| Signing/encryption keys | Confidentiality/integrity | G01-20, G01-21 |

## 3. Trust boundaries

```text
Untrusted Client
      |
      | HTTPS / Origin / CORS / CSRF
      v
HTTP/API Boundary
      |
      v
AFX-CORE Authentication
      |
      +--> Identity / MFA / WebAuthn
      |
      v
Session + Token State
      |
      v
Tenant Context + Membership
      |
      v
RBAC / Policy
      |
      v
Resource State
      |
      +--> Durable Audit
      |
      +--> Key Management / Workload Identity
```

## 4. Primary abuse cases

### TM-01 Credential stuffing
**Threat:** attacker submits large numbers of passwords against known or guessed identities.
**Controls:** G01-02, G01-17, G01-13.
**Residual risk:** distributed rate limiting requires production shared enforcement and observability evidence.

### TM-02 Refresh-token replay
**Threat:** stolen refresh token is replayed after legitimate rotation.
**Controls:** G01-05, G01-06, G01-12.
**Expected outcome:** reuse detection revokes the token family and associated sessions.

### TM-03 Cross-tenant authorization
**Threat:** valid identity attempts to access another tenant's resource.
**Controls:** G01-08, tenant-bound session context, deny-by-default authorization.

### TM-04 Browser session abuse / CSRF
**Threat:** attacker induces unsafe state-changing requests from an authenticated browser.
**Controls:** G01-18, Secure/HttpOnly/SameSite `__Host-` cookie policy, unsafe-method CSRF enforcement.

### TM-05 Origin confusion / CORS abuse
**Threat:** hostile origin attempts credentialed cross-origin API access.
**Controls:** G01-19 explicit HTTPS origin allowlist; wildcard origin rejected.

### TM-06 Account recovery takeover
**Threat:** attacker abuses recovery flow to bypass MFA or tenant authorization.
**Controls:** G01-16 one-time digest-backed recovery tokens, expiry, generic responses, session revocation and MFA-aware recovery policy.

### TM-07 Service credential theft
**Threat:** static service secret is leaked from source, environment or logs.
**Controls:** G01-21 workload identity; G01-20 KMS/HSM key management.
**Residual risk:** production closure requires real workload-identity and KMS evidence.

### TM-08 Audit tampering or secret leakage
**Threat:** security logs are altered or contain passwords/tokens/secrets.
**Controls:** G01-09 redaction, G01-22 durable audit, integrity/retention controls.

### TM-09 Supply-chain compromise
**Threat:** vulnerable or malicious dependency enters the build.
**Controls:** G01-23 dependency scanning, lockfile-based installation, SAST/secret scanning and CI release gate.

## 5. Security assumptions

- Production TLS is terminated by an approved infrastructure component and HTTPS is enforced end-to-end to the application boundary.
- Production rate limiting uses a shared/atomic backend rather than process-local memory.
- KMS/HSM and workload identity are supplied by the deployment environment and are not emulated as production evidence.
- WebAuthn production RP ID/origin and durable credential persistence are explicitly configured per deployment environment.
- Protected-branch rules require the Gate 01 security checks before release.

## 6. Residual risks requiring explicit closure

| Risk | Gate item | Closure evidence |
|---|---|---|
| No real KMS/HSM rotation evidence | G01-20 | End-to-end key creation, rotation, use and revocation record |
| Workload identity environment not proven | G01-21 | Real service identity exchange and authorization evidence |
| Durable audit acceptance incomplete | G01-22 | Persistence, retention, access-control and redaction evidence |
| Scanner baseline incomplete | G01-23 | CI SARIF/reports with reviewed high/critical findings |
| Independent penetration test absent | G01-25 | Qualified third-party assessment and remediation record |
| Production release policy not fully evidenced | G01-26 | Machine-readable gate report on protected branch |

## 7. Review rule

This document is not a substitute for an independent security review. A reviewer must validate the trust boundaries, abuse cases, assumptions, control mapping and residual risks before G01 can become GREEN.
