# ADR-0005: security invariants for persistence

The following invariants are mandatory for AFX-CORE persistence implementations:

- tenant and organization context is resolved before authorization;
- active membership is authoritative for roles and permissions;
- refresh tokens are opaque and only their SHA-256 digest is stored;
- refresh-token rotation is serialized with a row lock inside one transaction;
- a consumed refresh token cannot be rotated again;
- replay revokes the token family and its session;
- session revocation is idempotent;
- no persistence adapter may grant authorization independently of CORE policy;
- database credentials and signing keys are deployment secrets, never repository data.

These invariants are tested at the Core boundary and must be preserved by every infrastructure adapter.
