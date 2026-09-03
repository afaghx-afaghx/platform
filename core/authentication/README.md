# Authentication Context

## Responsibility

Authenticate an identity using approved authentication methods and establish authenticated sessions.

## Security baseline

- Password hashes target Argon2id.
- Raw passwords are never persisted, returned, or logged.
- Access credentials are short-lived.
- Refresh credentials are opaque, high entropy, stored only as hashes, rotated on use, and bound to a session family.
- Refresh-token reuse detection revokes the affected session family.
- Signing keys support `kid`-based rotation.
- Browser cookie flows use Secure + HttpOnly + appropriate SameSite settings and CSRF defenses for state-changing requests.
- MFA, WebAuthn, recovery, rate limiting, and risk controls are first-class extension points.

## Boundary

Authentication proves identity. It does not decide tenant access or business authorization. Authorization is performed by the authorization and tenant-context contexts.
