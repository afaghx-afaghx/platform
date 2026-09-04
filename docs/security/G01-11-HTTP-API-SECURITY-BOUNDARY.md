# G01-11 — HTTP/API Security Boundary

**Gate:** G01 — Authentication + Identity + Authorization Security Foundation  
**Control:** G01-11 — HTTP/API authentication integration  
**Status:** IMPLEMENTATION PLAN / EVIDENCE CONTRACT

## Purpose

Define the production HTTP/API security boundary for AFX-CORE without creating a second authentication authority in domain services.

## Canonical request flow

`Client → HTTP/API Edge → Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State → Domain Service`

A protected request MUST NOT reach protected domain state before the security context is resolved and validated.

## Boundary requirements

1. Authentication is authoritative in AFX-CORE.
2. The API boundary must reject missing, malformed, expired, revoked, or otherwise invalid access credentials.
3. A validated request must carry an explicit security context containing at minimum subject identity, tenant context, membership context, and authorization context.
4. Tenant context must be validated independently of token validity; cross-tenant access is denied by default.
5. Authorization remains deny-by-default and must not be replaced by endpoint-local role checks.
6. Raw access and refresh tokens MUST NOT be written to logs, audit records, responses other than their intended credential issuance response, or persistent storage.
7. Error responses must not disclose whether a credential, identity, tenant, or membership record exists beyond the approved public contract.
8. CORS, CSRF, cookie, TLS, and security-header controls remain part of the HTTP security boundary and must be validated by the HTTP security CI job.
9. Domain services MUST NOT implement an independent login, session, token issuance, or token-validation authority.

## Required implementation evidence

- Real HTTP/API middleware or equivalent request pipeline in `core/AFX-CORE`.
- Deterministic HTTP integration tests covering accepted and rejected authentication contexts.
- Tenant isolation and authorization tests at the HTTP boundary.
- Redaction tests proving credentials are absent from logs/audit output.
- CI job named `http-security` executing the complete HTTP security test suite.
- Machine-readable request/response integration report retained as CI evidence.

## Minimum acceptance tests

- unauthenticated protected request → `401`.
- malformed/invalid access credential → `401`.
- expired/revoked access credential → `401`.
- authenticated request without required permission → `403`.
- authenticated request with a different tenant context → `403`.
- valid authenticated request with required tenant, membership, permission and policy context → success.
- credential-bearing headers/cookies are not copied into audit/log records.
- security-sensitive CORS/CSRF/cookie/header behavior matches the approved policy.

## Validation commands

The exact commands MUST be taken from the repository's package/workflow definitions; no command is considered evidence until it has executed successfully in CI.

Expected categories:

```text
npm test
npm run lint
npm audit --audit-level=high
```

plus the repository-defined HTTP security integration command and the `http-security` GitHub Actions job.

## Evidence rule

A passing local test alone is insufficient for G01-11 closure. The control becomes DONE only when implementation, deterministic tests, CI execution, and reviewable CI artifact evidence all exist on the protected branch.
