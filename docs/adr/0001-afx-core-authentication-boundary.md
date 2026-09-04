# ADR-0001: AFX-CORE Authentication Boundary

## Status
Accepted for implementation baseline.

## Decision
AFX-CORE is the only authentication authority in AFAGHX. Authentication, identity, tenant context, membership, authorization, policy, and audit are separated as explicit components while sharing one trust boundary.

Authentication issues a short-lived asymmetric access token and a rotating opaque refresh-token family. Refresh tokens are stored only as hashes. Authorization never trusts client-supplied roles, permissions, or tenant identifiers without resolving them against trusted server-side membership data.

## Request pipeline

```text
Edge
 → Authentication
 → Identity
 → Tenant Context
 → Membership
 → RBAC / Permission
 → Policy
 → Resource State
 → Domain
```

## Rejected alternatives

- Per-domain login/authentication services: creates multiple trust authorities and inconsistent security policy.
- Long-lived bearer access tokens: increases replay impact.
- Plaintext or reversible password storage: unacceptable credential exposure.
- Raw refresh-token storage: increases session takeover impact after database compromise.

## Consequences

The first production implementation must provide credential hashing, session persistence, refresh rotation/replay detection, token signing/key rotation, authentication middleware, tenant-aware authorization, audit events, rate limiting, and security tests before being considered production-ready.
