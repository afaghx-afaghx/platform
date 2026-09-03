# AFX-CORE Identity Runtime

The framework-neutral security kernel for AFAGHX.

## Canonical request pipeline

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State → Audit`

Transport, persistence, external IdP, and key-management adapters consume these contracts; they do not create competing security authorities.

## Token policy

- Access tokens are short-lived signed JWTs.
- Verification validates issuer, audience, signature, lifetime, and an explicit algorithm allow-list.
- Refresh tokens are opaque random secrets; only SHA-256 digests are persisted.
- Refresh-token rotation must be atomic and reuse detection must revoke the complete token family.
- Secrets, signing keys, passwords, and production configuration never enter Git.
- Tenant boundaries are enforced before policy evaluation.
- Authorization defaults to deny when no policy matches.
