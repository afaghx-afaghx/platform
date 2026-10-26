# G01-18 / G01-19 — HTTP Security Boundary

**Status:** REVIEW_REQUIRED

## G01-18 — CSRF / cookie posture

AFAGHX's current canonical Gateway authentication transport is Bearer authorization. The Gateway does not read ambient browser cookies and does not emit `Set-Cookie`. Because authentication is not ambient-cookie based, the primary CSRF attack path is structurally excluded by the current transport contract.

This is not permission to introduce cookie authentication later. Any future cookie-based session must add an explicit CSRF design, SameSite/Secure/HttpOnly policy, browser integration tests and new evidence before release.

## G01-19 — TLS, security headers and CORS

The Gateway now provides:

- strict transport security header;
- anti-MIME-sniffing and clickjacking headers;
- explicit origin allow-list;
- explicit allowed methods/headers for CORS;
- no credentialed CORS mode.

The local CI proves the application-layer policy. It does **not** prove the deployed TLS certificate, protocol/cipher policy, CDN/edge behavior, HSTS preload posture, or production hostname routing. Those require deployment evidence.

## Closure rule

G01-18/G01-19 remain REVIEW_REQUIRED until the security architecture reviewer accepts the bearer-only CSRF posture and real deployed-edge evidence is attached for TLS/CORS/security headers.
