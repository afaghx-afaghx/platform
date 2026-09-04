# AFAGHX Quality Gate v1

## Mandatory checks for protected changes

- TypeScript strict compilation
- lint and formatting
- unit tests
- integration tests against PostgreSQL
- contract tests for public APIs/events
- security regression tests
- tenant-isolation tests
- dependency vulnerability scan
- secret scan
- CodeQL/static analysis
- migration validation
- container/IaC scanning when applicable

## Security assertions

- Invalid authentication is HTTP 401.
- Valid authentication with denied authorization is HTTP 403.
- Missing authorization policy is deny-by-default.
- Tenant context is server validated.
- Refresh credentials are never stored in plaintext.
- Sensitive audit metadata is recursively redacted.
- Event consumers are protected against duplicate delivery where required.
- Production secrets and signing keys are externalized.

## Release gate

A release candidate is eligible only when all required checks are green and no unresolved release-blocking security gap remains.

Green CI is evidence of the tested commit, not a substitute for architecture review. Architecture invariants and operational readiness must also be satisfied.
