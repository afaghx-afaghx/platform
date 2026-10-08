# AFX-G01 Threat Model — Authentication, Authorization and Tenant Security

**Control:** G01-24
**Status:** REVIEW_REQUIRED
**Scope:** AFX-CORE identity/authentication/authorization, Gateway enforcement boundary, tenant context, session lifecycle, and production security dependencies.

This document is a threat model and control map. It does not assert that unresolved controls are PROVEN.

## Trust boundaries

1. Public client → Gateway
2. Gateway → AFX-CORE
3. AFX-CORE → PostgreSQL
4. Domain runtime → SecurityContext / Core authorization
5. CI/CD → production security infrastructure
6. Browser → authentication/session boundary
7. Security evidence → release gate

## Threat register

| ID | Threat | Attack path | Required control | Evidence required | Current disposition |
|---|---|---|---|---|---|
| TM-01 | Credential stuffing | Repeated login attempts | G01-17 | Protected abuse test + artifact | OPEN |
| TM-02 | Credential enumeration | Different responses for valid/invalid identities | G01-02 | Automated rejection tests | BASELINE CLOSED |
| TM-03 | Access-token replay | Stolen bearer token reused | G01-03/G01-04 | Digest storage + expiry tests | BASELINE CLOSED |
| TM-04 | Refresh-token replay | Reuse old refresh credential | G01-05/G01-06/G01-12 | Rotation race/reuse evidence | OPEN |
| TM-05 | Session persistence bypass | Restart service and retain insecure state | G01-10 | PostgreSQL integration evidence | OPEN |
| TM-06 | Tenant breakout | Client supplies another tenant identifier | G01-08 | Cross-tenant integration evidence | BASELINE CLOSED |
| TM-07 | RBAC privilege escalation | Missing permission reaches protected handler | G01-08/G01-11 | 401/403 integration evidence | OPEN |
| TM-08 | Gateway bypass | Protected resource reached without security context | G01-11 | Gateway integration artifact | OPEN |
| TM-09 | MFA bypass / brute force | Challenge abuse or recovery abuse | G01-14 | MFA threat and abuse tests | OPEN |
| TM-10 | Passkey origin confusion | Credential accepted for wrong origin/RP-ID | G01-15 | Browser WebAuthn evidence | OPEN |
| TM-11 | Account takeover via recovery | Recovery path bypasses stronger assurance | G01-16 | Recovery abuse evidence | OPEN |
| TM-12 | CSRF/session fixation | Browser ambient credentials abused cross-site | G01-18 | Browser CSRF/cookie evidence | OPEN |
| TM-13 | Edge downgrade / weak CORS | Insecure TLS or broad origin acceptance | G01-19 | Deployed edge + HTTP security evidence | OPEN |
| TM-14 | Cryptographic key compromise | Long-lived/shared key or unsafe rotation | G01-20 | Real KMS/HSM rotation evidence | BLOCKED_EXTERNALLY |
| TM-15 | Service credential theft | Shared/static service secret reused | G01-21 | Workload identity evidence | BLOCKED_EXTERNALLY |
| TM-16 | Audit tampering / loss | Security events altered or discarded | G01-22 | Durable audit + retention evidence | OPEN |
| TM-17 | Supply-chain/security scan gap | High/Critical issue bypasses CI | G01-23 | Scanner artifacts + policy result | OPEN |
| TM-18 | External attacker finds unknown bypass | Public attack surface exploited | G01-25 | Independent pentest + retest | BLOCKED_EXTERNALLY |
| TM-19 | Release gate bypass | RED/BLOCKED control ignored | G01-26 | Machine gate + protected branch evidence | OPEN |

## Required assumptions

- Security failures fail closed.
- AFX-CORE remains the single authority for identity, authentication, authorization, tenant context, policy and audit.
- Domains consume immutable security context and do not receive raw bearer credentials.
- Client-supplied tenant identifiers are untrusted.
- Experience clients do not access databases directly.
- Production security evidence must be tied to an exact candidate SHA.

## Abuse cases that require explicit test coverage

The final review must confirm deterministic evidence for: credential stuffing, refresh replay under concurrency, cross-tenant authorization attempts, permission escalation, Gateway bypass, MFA brute force/recovery abuse, passkey origin/RP-ID validation, CSRF/session misuse, CORS/TLS policy failures, key rotation continuity, workload identity misuse, audit retention failure and release-gate bypass.

## Review decision

**Not approved for closure yet.**

G01-24 can move to DONE only when a security architecture reviewer records acceptance of this threat model against the exact candidate SHA and the mapped controls/tests/evidence are traceable.
