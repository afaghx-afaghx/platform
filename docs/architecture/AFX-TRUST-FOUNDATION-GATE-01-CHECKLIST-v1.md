# AFX Trust Foundation — Gate 01 Implementation Checklist v1

## Purpose
This document is the executable checklist for the first AFAGHX production-security gate. Gate 01 is complete only when the trust boundary is implemented and automated evidence exists.

## Non-negotiable invariants
- AFX-CORE is the single authentication and authorization trust foundation.
- Protected requests are denied by default.
- Authentication establishes identity and session validity; authorization establishes permission.
- Tenant context is untrusted until server-side membership validation succeeds.
- Organization and tenant identifiers must agree with the authenticated membership.
- Identity and membership must be active at authorization time.
- Resource-level authorization must never trust a client-supplied resource identifier without policy evaluation.
- Audit persistence must never convert a valid security decision into an availability failure.
- Sensitive credentials, tokens, secrets and private keys are never written to audit metadata.

## Gate 01 work packages

### G01.1 Security Context
- [x] Bearer access-token validation
- [x] issuer/audience/algorithm validation
- [x] session validity check
- [x] identity/membership/tenant binding
- [x] request security context
- [ ] authentication assurance enforcement per endpoint

### G01.2 Authorization / Policy
- [x] explicit authorization metadata
- [x] default deny when policy is missing
- [x] permission lookup
- [x] membership/tenant validation
- [x] active identity enforcement
- [x] resource identifier propagation
- [ ] resource-level policy predicates
- [ ] explicit policy version registry
- [ ] step-up authentication requirements
- [ ] policy decision audit taxonomy

### G01.3 Credentials
- [x] Argon2id password hashing
- [x] short-lived signed access tokens
- [x] opaque refresh credentials stored as hashes
- [x] refresh rotation/reuse family revocation
- [x] session revocation
- [ ] password reset lifecycle
- [ ] email/phone verification lifecycle
- [ ] MFA/TOTP
- [ ] WebAuthn/passkeys
- [ ] recovery codes/account recovery

### G01.4 Key Lifecycle
- [x] JWT `kid` contract
- [ ] JWKS publication
- [ ] key provider abstraction
- [ ] overlapping rotation window
- [ ] retired-key verification policy
- [ ] KMS/HSM integration boundary
- [ ] operational key rotation runbook

### G01.5 Tenant Isolation
- [x] server-side membership validation
- [x] organization/tenant binding
- [ ] automated tenant-breakout tests
- [ ] repository/data-access tenant guardrails
- [ ] cache namespace isolation
- [ ] search projection isolation
- [ ] event tenant propagation tests

### G01.6 Audit
- [x] best-effort audit persistence
- [x] sensitive metadata redaction
- [x] authentication rejection events
- [x] authorization denial events
- [ ] immutable/append-only operational controls
- [ ] audit event taxonomy/versioning
- [ ] audit delivery failure monitoring

## Mandatory automated evidence before Gate 01 approval
1. Invalid signature is rejected.
2. Invalid issuer/audience is rejected.
3. Expired access token is rejected.
4. Revoked session is rejected.
5. Inactive identity is rejected.
6. Inactive membership is rejected.
7. Tenant A credentials cannot access tenant B resources.
8. Organization/tenant mismatch is rejected.
9. Missing authorization metadata is denied.
10. Unknown permission is denied.
11. Missing role permission is denied.
12. Resource-level mismatch is denied.
13. Refresh-token replay revokes the token family.
14. Concurrent refresh cannot mint multiple valid successors.
15. Public endpoints remain reachable without authentication.
16. Protected endpoints are inaccessible without authentication.
17. Audit metadata redacts sensitive fields recursively.
18. Audit storage failure does not break authentication/authorization availability.

## Exit criterion
Gate 01 cannot be marked complete based on code review alone. The repository must contain executable security tests and CI evidence for the mandatory cases above. Until then AFAGHX remains a foundation-stage system and must not be represented as production-ready.
