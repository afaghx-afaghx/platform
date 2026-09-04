# AFX-CORE Authentication

Authentication proves control of an account; it does not decide what the account may do.

## Credential lifecycle

1. Receive identifier/password over TLS.
2. Normalize the identifier according to the identity policy.
3. Load the identity and credential record.
4. Verify the password using the configured memory-hard password hashing algorithm.
5. Apply account status, email/phone verification, MFA, risk, and rate-limit policies.
6. Create a server-side session record with a unique session identifier.
7. Issue a short-lived asymmetric access token containing only stable authorization context identifiers and token metadata.
8. Issue a cryptographically random opaque refresh token. Persist only a hash of the refresh token.

## Refresh-token rotation

Every refresh request consumes the current refresh-token family member and creates a new member. Reuse of an already-consumed token is treated as replay: revoke the entire token family and require re-authentication.

## Access tokens

- Short lived (target: 5–15 minutes).
- Asymmetrically signed (for example RS256 or ES256; final algorithm is an ADR decision).
- Include `iss`, `sub`, `aud`, `exp`, `iat`, `jti`, and a session identifier.
- Never contain passwords, refresh tokens, secrets, or unnecessary personal data.

## Browser security

Refresh credentials should be delivered through a Secure, HttpOnly, SameSite cookie when the browser architecture permits it. CSRF protection is required for cookie-authenticated state-changing requests.

Access tokens must not be persisted in localStorage.

## Required protections

- Generic authentication failure responses to reduce account enumeration.
- Login and refresh rate limits.
- MFA capability at the authentication boundary.
- Password reset tokens are single-use, short-lived, random, and hashed at rest.
- Session revocation and device/session visibility.
- Security audit events without secret material.
