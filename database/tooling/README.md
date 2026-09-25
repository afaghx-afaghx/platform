# Database Tooling

Canonical home for database-specific validation and operational tooling.

Expected responsibilities include:

- migration validation
- schema drift detection
- database test setup/teardown
- backup and restore verification
- RLS/security checks
- migration evidence generation

Operational tooling must fail closed on unsafe configuration and must never embed secrets.

Actual tooling is added only when the repository has a selected migration/runtime mechanism; this foundation does not introduce an unapproved database framework.
