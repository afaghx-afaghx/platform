# G01-19 — TLS, Security Headers and Strict CORS Policy

## Required production policy

- TLS terminates at the approved edge/load-balancer boundary.
- Plain HTTP must redirect or be rejected at the edge; authenticated traffic must never rely on cleartext transport.
- HSTS must be enabled only after the production HTTPS topology is verified.
- API responses must preserve the AFAGHX security headers already enforced by Gateway.
- CORS must use an explicit origin allowlist; wildcard credentialed CORS is prohibited.

## Repository-level evidence

Gateway tests already exercise security headers and CORS rejection.

The production TLS portion cannot be marked DONE until the actual deployment/edge endpoint and certificate policy are available for verification.

Status: repository policy defined; production endpoint verification pending.
