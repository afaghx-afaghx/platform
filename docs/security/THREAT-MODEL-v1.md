# AFAGHX Security Threat Model v1

## Security objective

Protect identity, credentials, tenant boundaries, authorization decisions, business data, and platform operations against compromise, misuse, replay, leakage, and cross-tenant access.

## Primary threats and controls

| Threat | Required controls |
|---|---|
| Credential stuffing / brute force | Rate limits, progressive risk controls, MFA, credential breach checks where legally/operationally appropriate, security audit |
| Password database compromise | Argon2id password hashing, unique salts, no plaintext/password logging |
| Access-token theft | Short-lived access credentials, TLS, secure storage strategy, audience/issuer validation |
| Refresh-token theft/replay | Opaque high-entropy refresh credentials, server-side hashed storage, rotation on use, reuse detection, session-family revocation |
| Session fixation | Server-generated session IDs, rotation on authentication/privilege transitions |
| CSRF | SameSite/secure HttpOnly cookies where used, CSRF defenses for state-changing cookie-auth requests |
| Tenant breakout / IDOR | Server-derived tenant context, membership validation, policy evaluation, tenant-scoped queries and caches |
| Privilege escalation | Central RBAC/permissions, policy evaluation, resource-state checks, deny-by-default |
| Secret leakage | External secret/KMS management, secret scanning, no credentials in repository/logs/events |
| Event replay/spoofing | Authenticated producers where required, event IDs, timestamps, schema validation, idempotent consumers |
| Supply-chain compromise | Dependency pinning/updates, dependency review, vulnerability scanning, least-privilege CI |
| Malicious or unsafe file access | Tenant-scoped authorization, content validation, signed access patterns, malware scanning where required |
| Observability data leakage | Redaction, structured logging, access controls, no tokens/secrets in telemetry |

## Security invariants

1. Authentication does not equal authorization.
2. A client-provided tenant identifier is never sufficient to establish tenant context.
3. Every protected request must resolve a validated security context before resource access.
4. Authorization must be evaluated against current membership/policy/resource state for sensitive operations.
5. Secrets and credentials never enter source control, event payloads, security context, or ordinary logs.
6. Security-sensitive state changes produce auditable records.

## Security testing gate

Before production readiness, the platform must demonstrate automated tests for authentication failure paths, token rotation/reuse detection, tenant isolation, authorization denial, CSRF defenses where applicable, and secret-leak prevention, plus dependency and static security scanning.
