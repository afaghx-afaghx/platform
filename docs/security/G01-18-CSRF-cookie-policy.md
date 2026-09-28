# G01-18 — CSRF and Secure Cookie Strategy

## Decision

AFAGHX API authentication is bearer-header based:

`Authorization: Bearer <opaque access token>`

The authenticated session is not represented by an ambient browser authentication cookie.

### Consequence

A cross-site request cannot authenticate merely by causing the browser to attach an AFAGHX authentication cookie because no such authentication cookie exists.

The API still requires:

- authenticated SecurityContext for protected routes;
- strict CORS allowlisting;
- deny-by-default authorization;
- no token in URL query parameters;
- no raw token in application logs.

## Current evidence

- Gateway authentication tests reject missing/invalid Bearer credentials.
- CORS boundary tests reject untrusted origins.
- Tenant spoofing via query/header is ignored and audited.

## Remaining acceptance work

If cookie-based authentication is introduced later, HttpOnly/Secure/SameSite and an explicit CSRF token strategy become mandatory before the feature can ship.

Status: implementation strategy documented; browser-level security review remains required by G01-18.
