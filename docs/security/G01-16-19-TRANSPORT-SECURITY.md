# G01-16 → G01-19 Transport Security

## Scope

This increment adds executable, framework-neutral controls for account recovery, credential-stuffing resistance, browser session transport, CSRF, HTTPS, security headers, and strict CORS.

## G01-16 Secure recovery

The durable recovery implementation from G01-10 stores only token digests, makes recovery responses non-enumerating, consumes tokens once, expires them, and revokes existing sessions after password reset. The transport boundary must never return or log the raw recovery token.

## G01-17 Rate limiting

`SlidingWindowRateLimiter` provides bounded per-key credential throttling. `credentialRateLimitKey()` hashes the composite IP/email/user identifier so logs and telemetry do not expose the credential identifier. Production deployment must use a shared durable limiter (for example Redis) rather than process-local state when multiple application instances exist.

## G01-18 CSRF and cookies

Unsafe methods using cookie authentication require a CSRF token. Session cookies are emitted as `__Host-` cookies with `Secure`, `HttpOnly`, `SameSite`, and `Path=/`; insecure session cookies are rejected.

## G01-19 TLS/CORS/security headers

HTTPS is mandatory outside explicitly permitted local development. CORS uses an explicit HTTPS origin allow-list and never permits `*` with credentials. Baseline response headers include CSP, HSTS, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy and no-store.

## Evidence-first closure

This document records implementation intent and executable controls. G01-16 through G01-19 remain **IN PROGRESS** until GitHub Actions produces a successful run of `test:g01-16-19`, the artifact is retained, and the production deployment configuration is reviewed. Process-local rate limiting is not production closure evidence for a horizontally scaled deployment. TLS certificate/termination and actual origin configuration require environment evidence.

No mock, synthetic PASS, or documentation-only closure is permitted.
