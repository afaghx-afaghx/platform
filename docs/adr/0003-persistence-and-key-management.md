# ADR-0003: Persistence and Signing-Key Boundaries

## Status
Accepted

## Decisions
1. AFX-CORE exposes persistence through repository interfaces; business/security logic does not depend directly on an ORM or database driver.
2. PostgreSQL is the bootstrap persistence target.
3. Refresh-token rotation requires a transaction and row-level locking at the adapter boundary.
4. Access-token verification uses a JWKS endpoint and explicit issuer/audience/algorithm validation.
5. Signing-key rotation is represented as an active key plus a bounded set of previous verification keys. Private signing material is runtime-managed and never stored in Git.
6. Key type and algorithm must be bound by deployment configuration; the verifier must not silently widen the accepted algorithm set.

## Rationale
These boundaries keep AFX-CORE portable while preserving the security properties required for multi-tenant production operation. Persistence and cryptographic key lifecycle are infrastructure concerns and therefore remain adapters around the security authority.

## Operational requirements
- Database credentials come from a secret manager/environment injection.
- JWKS endpoints must use TLS and be controlled by trusted configuration.
- Key rotation must support overlap so existing short-lived access tokens remain verifiable during rollover.
- Revoked sessions must be checked according to the selected access-token/session architecture; JWT validation alone is not equivalent to session revocation.
- Database migrations use expand/contract where compatibility is required and destructive changes require rollback planning.
