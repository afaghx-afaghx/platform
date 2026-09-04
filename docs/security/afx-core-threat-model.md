# AFX-CORE Security Threat Model

## Security acceptance tests

| ID | Threat | Required control |
|---|---|---|
| AUTH-01 | Password database disclosure | Memory-hard password hashing; no plaintext/reversible passwords |
| AUTH-02 | Credential stuffing | Per-identity + network rate limiting and progressive controls |
| AUTH-03 | Account enumeration | Generic authentication failures and consistent response behavior |
| AUTH-04 | Access-token theft | Short expiry, audience/issuer validation, session binding metadata, revocation strategy |
| AUTH-05 | Refresh-token theft | Opaque tokens, hash-at-rest, rotation, family revocation |
| AUTH-06 | Refresh replay | Reuse detection revokes token family and emits security event |
| AUTH-07 | Cross-tenant access | Tenant resolved from trusted membership; resource query scoped by tenant |
| AUTH-08 | Privilege escalation | Deny-by-default permission evaluation and policy enforcement |
| AUTH-09 | Token algorithm confusion | Allow-list signing algorithms and reject unexpected algorithms |
| AUTH-10 | Key compromise | External key management, key IDs, rotation, bounded token lifetime |
| AUTH-11 | CSRF | SameSite/HttpOnly/Secure cookie strategy plus CSRF protection for cookie-authenticated mutations |
| AUTH-12 | Secret leakage | Secret scanning; no keys/tokens/passwords in source or logs |
| AUTH-13 | Session persistence abuse | Server-side session state with revocation and device/session visibility |
| AUTH-14 | Password reset takeover | Single-use, short-lived, random reset tokens hashed at rest |
| AUTH-15 | Audit leakage | Audit records contain identifiers and outcomes, never passwords/raw tokens |

## Mandatory negative tests

1. A valid user from tenant A cannot read a resource owned by tenant B.
2. A user with no required permission receives a denial even when authenticated.
3. A disabled identity cannot obtain a new access token.
4. An expired access token is rejected.
5. A token with an invalid issuer or audience is rejected.
6. A refresh token used twice is detected as replay and its family is revoked.
7. A revoked session cannot refresh.
8. A malformed bearer token cannot reach a protected domain handler.
9. Client-provided roles/permissions cannot elevate authorization.
10. Logs and audit events do not contain raw credentials or bearer/refresh tokens.
