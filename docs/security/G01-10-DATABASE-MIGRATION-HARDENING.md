# G01-10 Database Migration Hardening

## Objective

G01-10 requires durable AFX-CORE state with production-safe schema evolution. The repository therefore uses a versioned PostgreSQL migration registry instead of an untracked one-shot schema bootstrap.

## Migration contract

- Migration IDs are immutable and ordered by repository declaration.
- Applied migrations are recorded in `afx_schema_migrations`.
- Each migration executes inside one PostgreSQL transaction with its registry record.
- A PostgreSQL transaction-scoped advisory lock serializes concurrent migration runners.
- A failed migration rolls back both schema changes and its registry record.
- Re-running an already applied migration is a no-op.
- Existing databases are compatible with the baseline because migrations use idempotent `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` operations.

## Current versions

| ID | Scope | Destructive | Rollback model |
|---|---|---:|---|
| `001_core_identity_auth_baseline` | identity, membership, RBAC mapping, sessions, refresh families/tokens | No | transaction rollback before commit |
| `002_account_lifecycle_recovery` | recovery tokens and required indexes | No | transaction rollback before commit |

## Rollback / recovery policy

These initial migrations are non-destructive. PostgreSQL transaction rollback is the failure-safety mechanism during application. Production rollback of an already committed schema version is **not** implemented as an automatic down-migration: destructive down-migrations can cause irreversible data loss and must instead be introduced only with an explicit reviewed compensating migration, backup/restore plan, and release approval.

A migration must never silently rewrite or delete security state. Any future destructive migration requires:

1. a new immutable version;
2. a documented data-preserving/compensating path;
3. tested backup and restore evidence;
4. a staged deployment plan;
5. explicit production approval.

## Evidence

The PostgreSQL persistence test suite verifies the migration registry contains both versions and that a second migration run leaves the registry unchanged. The same CI job also exercises durable identity/session state and concurrent refresh-token rotation.
