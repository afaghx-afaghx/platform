# AFX-CORE Security Foundation

AFX-CORE is the single security authority for AFAGHX identity, authentication, authorization, tenant context, membership, policy and audit.

## Security boundary

```text
Client
  -> Authentication
  -> Identity
  -> Tenant Context
  -> Membership
  -> Permission / RBAC
  -> Policy
  -> Resource State
  -> Audit
```

No domain may create its own authentication authority.

## Bootstrap implementation

This package establishes the framework-independent security contracts and reference implementation boundaries before binding them to a web framework or database.

### Identity

- Stable `UserId` and `TenantId` value objects.
- Explicit tenant membership model.
- No business-domain ownership of identity.

### Credentials

Passwords are represented only as password hashes. Plaintext passwords must never enter persistence, logs, events, telemetry or audit records.

The production password hasher MUST be Argon2id (or another reviewed password hashing function with equivalent resistance). This repository intentionally does not implement cryptography from scratch.

### Sessions and tokens

The reference contract requires:

- short-lived access tokens;
- refresh-token rotation;
- server-side refresh-token family/reuse detection;
- revocation by session/family;
- audience and issuer validation;
- explicit token type and expiry validation;
- no secrets in source control.

Access tokens are authorization artifacts, not identity databases. The canonical identity remains server-side.

### Authorization

Authorization is deny-by-default and evaluates:

1. authenticated principal;
2. tenant context;
3. active membership;
4. permission;
5. policy conditions;
6. resource state.

A permission check without tenant context is invalid for tenant-scoped resources.

## Security test baseline

The security suite must cover:

- password hashing and verification;
- timing-safe credential verification behavior;
- invalid/expired/revoked tokens;
- refresh rotation and reuse detection;
- issuer/audience/signature/algorithm validation;
- cross-tenant access denial;
- inactive membership denial;
- deny-by-default authorization;
- privilege escalation attempts;
- session revocation;
- audit event integrity and redaction;
- secret/token leakage checks.

## Production rule

This bootstrap is a security contract, not a claim of production readiness. A production deployment requires a concrete runtime, vetted libraries, persistence, key management, rate limiting, MFA/recovery controls, observability, threat modeling and passing CI security gates.
