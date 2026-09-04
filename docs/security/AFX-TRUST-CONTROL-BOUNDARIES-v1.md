# AFX Trust Control Boundaries v1

## Purpose
This document closes the architectural boundaries around the controls that must never be implemented as ad-hoc domain features.

## WebAuthn / Passkeys
WebAuthn is an AFX-CORE authentication capability. The platform must store credential identifiers and public-key material only; private keys remain exclusively in the authenticator. Registration requires a server-generated challenge, origin/RP-ID validation, user verification policy, signature-counter handling and atomic credential activation. Authentication requires a fresh server challenge, origin/RP-ID validation and assertion verification before an AAL2 security context is issued. Domain applications consume the resulting authentication assurance; they never verify WebAuthn assertions themselves.

The repository intentionally keeps the cryptographic WebAuthn implementation behind an adapter boundary so the final implementation can use a vetted WebAuthn library without coupling business modules to a credential protocol.

## Key lifecycle / KMS-HSM
JWT signing keys are configuration/runtime secrets and are never committed. `kid` is mandatory in tokens and JWKS. The current code exposes a JWKS boundary and rejects placeholder signing keys. Production key storage must be backed by KMS/HSM or an equivalent managed key boundary; application code must receive signing/verification capabilities, not raw production private-key material.

Rotation requirements:
- publish the new public key before issuing tokens with the new `kid`;
- accept old and new verification keys during an overlap window;
- stop issuing with the retired key;
- remove the retired key only after all access tokens signed with it have expired;
- audit every rotation and emergency revocation.

## Recovery
Recovery codes are generated with CSPRNG material, stored as SHA-256 hashes, single-use, and regenerated as a replacement set. Recovery is an authentication event and must produce an audit record.

## Security invariants
- Default authorization is deny.
- Tenant context is validated server-side.
- Authentication credentials and secrets never appear in logs, events or audit metadata.
- MFA completion upgrades assurance; refresh preserves the session assurance level.
- High-impact account/security changes require step-up authentication according to policy.
