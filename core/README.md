# AFX-CORE Foundation

This directory contains the implementation foundation for the AFAGHX security and identity plane.

## Boundary

AFX-CORE owns identity, authentication, authorization, tenant context, membership, sessions, policy, consent, trust, and audit contracts. Business domains must consume these capabilities through explicit interfaces and must not create parallel security authorities.

## Security pipeline

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

## Initial implementation

- framework-neutral TypeScript domain contracts
- JWT access-token claim model (validation contract only)
- refresh-session model with rotation/revocation semantics
- authorization context and policy interfaces
- tenant-aware request context
- audit event contract
- security invariants and test vectors

Cryptographic signing, key storage, token persistence, and external identity-provider adapters are deliberately infrastructure adapters, not domain responsibilities.
