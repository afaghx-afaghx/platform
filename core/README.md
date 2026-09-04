# AFX-CORE

AFX-CORE is the single security and trust foundation for AFAGHX.

## Initial security boundary

```text
Authentication
      ↓
Identity
      ↓
Tenant / Organization Context
      ↓
Membership
      ↓
RBAC / Permission
      ↓
Policy
      ↓
Resource State
```

No DOMAIN service may create an independent authentication authority.

## Security invariants

- Passwords are never stored in plaintext; credential storage must use a memory-hard password hash.
- Access tokens are short-lived and signed by an asymmetric key managed outside source control.
- Refresh tokens are opaque, hashed at rest, rotated on use, and revocable.
- Authentication and authorization are separate concerns.
- Tenant context is resolved before protected resource access.
- Membership is evaluated inside the requested tenant; a user's membership in one tenant never implies membership in another.
- Authorization is deny-by-default.
- Security events are auditable without recording passwords, raw tokens, or other secrets.
- Login, token refresh, password reset, and verification endpoints are rate-limited.

See `docs/security/` and `contracts/security/` for the implementation contract and threat model.