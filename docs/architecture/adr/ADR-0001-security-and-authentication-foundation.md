# ADR-0001: Security and Authentication Foundation

- Status: Accepted
- Scope: AFX-CORE

## Decision

AFAGHX uses one central security foundation in AFX-CORE. Authentication establishes an authenticated principal; authorization is evaluated separately using tenant context, membership, RBAC/permissions, policy and resource state.

Target request pipeline:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

## Credential handling

- Passwords, when enabled, are stored only as strong password hashes (Argon2id target).
- Raw passwords are never logged, persisted or returned.
- MFA/WebAuthn and account recovery are first-class security capabilities.
- Secrets, signing keys and production credentials are managed outside source control through an approved secret/KMS mechanism.

## Token/session model

- Access credentials are short-lived and scoped.
- Refresh credentials are high-entropy, preferably opaque, stored server-side as hashes, rotated on use and bound to a revocable session family.
- Refresh-token reuse triggers session-family revocation and a security event.
- Signing keys support `kid` and controlled rotation.
- Browser-sensitive credentials use secure HttpOnly cookies where the client architecture permits; CSRF protection is required for cookie-authenticated state-changing requests.

## Authorization

An access token is evidence of authentication, not a complete authorization decision. Tenant and membership context must be validated against server-side state. High-risk operations must evaluate current policy and resource state.

## Service boundary

Domain services consume CORE security contracts. They do not own users, credentials, sessions or independent login authorities.

## Consequences

This centralizes trust, prevents authentication silos, supports multi-tenancy, enables consistent audit/revocation, and keeps domain services focused on business rules.
