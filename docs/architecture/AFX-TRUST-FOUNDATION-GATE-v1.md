# AFAGHX Trust Foundation Gate v1

## Objective

AFX-CORE is the single trust authority for the AFAGHX ecosystem. No domain may bypass the security context, authorization, tenant isolation, audit, or credential lifecycle controls defined here.

## Mandatory request pipeline

`Authentication -> Identity -> Tenant/Organization Context -> Membership -> RBAC/Permission -> Policy -> Resource State -> Audit`

A request is denied when any required context or policy cannot be established.

## Policy engine contract

Authorization decisions are explicit objects containing:

- `decision`: allow | deny
- `reasonCode`: stable machine-readable reason
- `policyVersion`: version of evaluated policy
- `decisionId`: unique decision identifier
- `evaluatedAt`: timestamp

The engine must validate subject, active session/membership, organization and tenant alignment, requested action/resource, role-derived permissions, authentication assurance, and policy context. Future policy attributes must be additive and must not weaken the default-deny model.

## Tenant isolation

`x-afx-tenant-id` is request context, not proof of access. The server must validate it against the authenticated membership and organization before authorization. Tenant scope must be preserved in persistence, cache, messages, search, files, logs, metrics and traces whenever those systems carry tenant-owned data.

## Authentication assurance

Authentication assurance is represented in the security context and access token. Sensitive operations may require `aal2` or stronger step-up authentication. A token without a valid assurance claim is invalid.

## Credential lifecycle

- Passwords: Argon2id.
- Refresh credentials: opaque, high entropy, hashed at rest.
- Refresh rotation: atomic and single-use.
- Reuse detection: revoke token family and session.
- Access tokens: short-lived RS256 with `kid`, issuer and audience validation.
- Signing keys: provider abstraction, JWKS publication and rotation overlap; production provider must be KMS/HSM-ready.

## Audit

Authentication and authorization security events are auditable. Audit records must be sanitized and must not contain passwords, bearer tokens, refresh credentials, private keys or secrets. Audit persistence is fail-safe for the protected operation while failures remain observable.

## Required test gate

No trust-foundation release is accepted without automated coverage for:

1. invalid JWT signature/issuer/audience/algorithm/expiry
2. missing or invalid assurance level
3. revoked/expired session
4. inactive identity or membership
5. tenant breakout / IDOR
6. unknown permission
7. default-deny authorization
8. refresh rotation/reuse/concurrency
9. public endpoint explicit opt-in only
10. audit redaction/failure isolation
11. outbox atomicity and inbox idempotency

## Completion criterion

The trust foundation is complete only when these controls are implemented, exercised by automated tests, and enforced by CI. Documentation alone is not completion evidence.
