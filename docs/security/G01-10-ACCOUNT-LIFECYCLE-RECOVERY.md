# G01-10 — Durable Identity, Account Lifecycle & Recovery

## Status

Implementation branch: `feat/g01-10-account-lifecycle-recovery-hardening`

Status: **IMPLEMENTED — CI VERIFICATION REQUIRED**

This control extends the existing AFX-CORE PostgreSQL persistence baseline with durable account lifecycle and password recovery semantics. It does not close Gate-01 by itself.

## Implemented

- PostgreSQL-backed users, memberships, sessions and refresh-token families remain the source of durable security state.
- Account status can be changed between `active` and `disabled`.
- Disabling an account revokes its sessions and refresh families.
- Password recovery uses a random one-time token whose SHA-256 digest is persisted; plaintext recovery tokens are not persisted.
- Recovery requests are non-enumerating at the service response boundary.
- A recovery token expires after 15 minutes and is single-use under row locking.
- Raw recovery tokens are delivered only through an injected delivery boundary and are never returned by the Core API or written to audit events.
- Successful password recovery replaces the password hash and revokes all existing sessions/refresh families.
- Recovery and lifecycle operations emit redacted audit events.

## Security invariants

1. Disabled users cannot authenticate.
2. Existing sessions are invalidated when an account is disabled or its password is recovered.
3. Recovery tokens are stored only as digests.
4. Recovery tokens cannot be replayed.
5. Unknown and known recovery requests return the same public response shape.
6. Recovery credentials never appear in Core return values or audit payloads.
7. Tenant authorization remains delegated to the existing AFX-CORE authorization contract.

## Production hardening still required

- Production-grade migration runner with rollback policy and schema-version tracking.
- Password hashing calibration and Argon2id decision/implementation per G01-13.
- MFA/WebAuthn, abuse/rate limiting, CSRF/cookie controls and KMS/HSM remain separate Gate-01 controls.
- Recovery delivery provider must be an approved external boundary with secure template/link handling and delivery telemetry that excludes the secret.
- Full architecture review and CI evidence are required before marking G01-10 DONE.
