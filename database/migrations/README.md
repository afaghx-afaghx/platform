# Database Migrations

Migration artifacts are versioned, deterministic, reviewable changes to the persistent schema.

## Required properties

- explicit ordering/version
- idempotence where the migration framework supports it
- transactional execution where PostgreSQL semantics allow it
- safe handling of indexes, constraints, and locks
- clear ownership
- test coverage for affected persistence behavior
- CI evidence for the migration path

Destructive changes require explicit review and appropriate backup/restore evidence.

Do not place secrets, production credentials, or ad-hoc manual SQL here.
