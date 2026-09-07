# AFX-CORE-001 — Canonical Core Specification

**Status:** LOCKED ARCHITECTURAL SPECIFICATION
**Version:** 1.0.0
**Authority:** AFAGHX Architecture Governance
**Parent:** `docs/architecture/AFX-MASTER-ARCH-001.md`

## 1. Purpose

AFX-CORE is the single trust foundation of AFAGHX. It owns identity and security context; it does not own business-domain truth.

This specification freezes the Core boundary for implementation. New capabilities must map to an existing Core bounded context or be introduced through an ADR. No domain may create a parallel identity, authentication, authorization, tenant, policy, or trust authority.

## 2. Bounded contexts and ownership

| Context | Owns | Must not own |
|---|---|---|
| Identity | public identity, lifecycle, status, identity providers | business profiles or domain truth |
| Credential | password/passkey/credential metadata and verification state | raw secrets |
| Authentication | authentication mechanisms, login, step-up, session establishment | business authorization |
| Session | sessions, access-token state, revocation | raw bearer persistence |
| Refresh Token | refresh families, rotation, reuse detection | business state |
| Organization | organizations and organization lifecycle | domain-specific entities |
| Membership | user-to-organization/tenant membership and status | domain roles outside Core |
| Tenant Context | validated request tenant context | caller-supplied authority |
| RBAC | roles, permissions, role-permission bindings | business resource rules |
| Authorization | access decisions and security context composition | transaction execution |
| Policy | policy definitions, conditions, policy evaluation | business-domain persistence |
| Audit | security/audit evidence and immutable event semantics | arbitrary application logging |
| Consent | consent records and versioned purposes | authentication decisions |
| Trust | verification state/evidence references and trust primitives | full certification/KYC/KYB domain truth |
| Configuration | governed platform configuration | secrets/private keys |
| Feature Flags | controlled feature activation state | authorization bypass |
| Module Registry | registered modules/capabilities and lifecycle metadata | business-domain ownership |

## 3. Canonical actor and security model

```text
User
  → Individual Context OR Organization Context
  → Membership
  → Role / Permission
  → Policy
  → Resource Authorization
```

A user may belong to multiple organizations/tenants and may have different memberships and roles in each context. Organization and Tenant are distinct concepts; an organization is a business entity and is not automatically a tenant.

## 4. Canonical protected-request flow

```text
Client
  → Gateway
  → Authentication
  → Identity
  → Tenant Context
  → Membership
  → RBAC / Permission
  → Policy
  → Resource State
  → Application Service
  → Domain
  → Owned Persistence
```

The client is untrusted. Caller-supplied tenant IDs, roles, permissions, or policy claims are inputs only and never authoritative.

## 5. Authorization contract

Authorization is **deny-by-default**. A protected decision is allowed only when all required security predicates succeed:

```text
identity active
AND tenant context valid
AND membership active
AND required permission granted
AND policy permits
AND resource state permits
AND tenant/resource ownership matches
```

Missing context, missing permission, policy failure, stale membership, resource mismatch, or security subsystem failure produces denial.

## 6. Credential and token rules

- Passwords use a memory-hard password hashing scheme with production-calibrated parameters.
- Credentials are never logged or stored in plaintext.
- Access tokens are opaque, short-lived bearer values.
- Persisted access-token and refresh-token values are stored only as cryptographic digests.
- Refresh tokens rotate on use.
- Refresh-token reuse is a family-compromise signal and revokes the affected family and associated sessions.
- Session revocation invalidates the associated refresh family.
- Cryptographic signing/encryption keys and WebAuthn secrets live behind the KMS/secrets boundary.
- Key rotation is an infrastructure/security concern, not a domain concern.

## 7. Identity lifecycle

Canonical lifecycle states are:

```text
active → disabled
active → locked
active → deleted

disabled → active
locked → active
```

Deletion is terminal for the identity record and immediately invalidates active sessions and refresh families. Every security-sensitive transition is auditable.

## 8. Multi-tenancy invariants

Tenant isolation applies at every applicable boundary: API, application, database, cache, messaging, search, files, and observability.

No Core or domain repository may return resource state solely because an ID matches; tenant ownership/context must also match. Cross-domain persistence access is prohibited.

## 9. Audit invariants

Security-sensitive actions generate structured audit evidence with:

- event/action type
- actor identity when available
- tenant/organization context when available
- outcome
- correlation/request identifier
- timestamp
- target/resource reference when safe
- reason/error classification when safe

Secrets, passwords, raw tokens, private keys, and sensitive authentication material are never included.

## 10. Recovery, MFA and WebAuthn

Recovery, MFA, WebAuthn/passkeys and step-up authentication are Core authentication capabilities. They must integrate with the same Identity, Session, Tenant Context and Audit authorities; they must not create independent identity stores or session authorities.

Recovery operations must be rate-limited, auditable, single-use where applicable, and must revoke compromised sessions/refresh families according to the recovery policy.

## 11. API boundary

External Core APIs are versioned (`/api/v1/...`) and must define authentication, authorization, validation, rate limiting, idempotency where required, correlation identifiers, pagination/filtering where applicable, and stable error semantics.

No Experience application may connect directly to Core persistence.

## 12. Events

Core publishes explicit, versioned security/identity events when downstream consumers require them. Examples:

- `IdentityCreated.v1`
- `IdentityStatusChanged.v1`
- `MembershipChanged.v1`
- `SessionRevoked.v1`
- `RefreshFamilyRevoked.v1`
- `ConsentRecorded.v1`
- `TrustStatusChanged.v1`

Events are facts, not commands. Consumers must tolerate duplicate delivery.

## 13. Persistence boundary

Core owns its persistence model and repositories. PostgreSQL is the transactional source of truth for durable Core state. Tokens are represented by digests. Transactional security state changes that must be atomic are performed within a database transaction.

## 14. Failure semantics

Security failures fail closed. Authentication, tenant resolution, authorization, policy evaluation, or required security persistence failures must not silently downgrade to an allow decision.

Operational telemetry may record a failure, but observability must never become an authorization dependency that can accidentally grant access.

## 15. Dependency rules

```text
Experience → API/Application → Core
Domain → Core interfaces/contracts
Core → Platform primitives only
Core ↛ Business Domains
AI/Analytics → approved contracts/events/governed data products
```

Core must not import business-domain logic or persistence.

## 16. Definition of Done for AFX-CORE capabilities

A Core capability is complete only when its boundary, invariants, data ownership, API/event contract, authorization behavior, tenant rules, automated tests, observability, security evidence, and documentation are present. Production-sensitive controls additionally require environment evidence and explicit acceptance.

## 17. Architecture lock

The following are frozen until an ADR is approved:

1. Core security authority.
2. Identity/user lifecycle authority.
3. Tenant isolation model.
4. Authorization decision semantics.
5. Persistence ownership.
6. Token/credential storage model.
7. Core-to-domain dependency direction.
8. Public API/event contract governance.
9. KMS/secrets trust boundary.
10. Seven-layer master architecture.

This document is the implementation contract for AFX-CORE-001. It does not declare production readiness by itself; production readiness requires executable evidence under the security closure gate.
