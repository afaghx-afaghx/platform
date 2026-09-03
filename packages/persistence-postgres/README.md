# AFX PostgreSQL Persistence Adapter

This package is an infrastructure adapter for AFX-CORE. It contains no authentication policy of its own.

## Guarantees

- Parameterized SQL through the `postgres` driver.
- Tenant-aware membership resolution.
- `SELECT ... FOR UPDATE` for refresh-token and session state that participates in rotation.
- Refresh-token hashes only; plaintext refresh tokens never reach persistence.
- Rotation is expected to run through `PostgresTransactionRunner`, which maps the security runtime transaction boundary to one PostgreSQL transaction.
- Session revocation is idempotent.

The adapter must remain outside `core/identity`; the Core package owns security contracts and policy, while this package owns SQL and connection management.
