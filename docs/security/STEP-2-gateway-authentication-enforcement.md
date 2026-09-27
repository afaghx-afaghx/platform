# AFAGHX — STEP 2 REPORT

## SECTION 8

```text
STEP:          2 — Gateway Authentication Enforcement
STATUS:        needs-decision
BRANCH:        feat/gateway-authn-enforcement
HEAD SHA:      8abf21cedfefca0f8489d670c26c2190705bc023
FILES:         +2 / ~3 / -0
DISCOVERY:     root cause confirmed
DECISION:      enforce authn in Gateway; keep current Core contract gaps explicit; no Core feature invention
SECURITY:      authn ✅ | tenant ✅ | membership ✅ | rbac ⚠️ per-check | policy null
NEGATIVE:      pending CI execution
CHECKS:        pending CI; local clone unavailable in this environment
EVIDENCE:      branch commits + GitHub Actions to be captured by Draft PR
BLOCKERS:      final proof pending; no Main merge permitted
NEXT STEP:     3 — Core Policy Implementation
```

## 2.1 Discovery Evidence

Main SHA:

`15a23125052fe511714f1e5a3ff3f4698752fef7`

Observed Gateway root cause:

- `platform/Gateway/runtime.mjs` supplied authentication/authorization callbacks to `security.process()`.
- `platform/Gateway/security-boundary.js` previously returned HTTP 200 after CORS/rate-limit/payload/header checks without invoking the authentication callback.
- `PersistentAfxCore.authenticateAccessToken()` is real and validates session, expiry, revocation, user state, and membership.
- Core output is `{ userId, tenantId, sessionId, roles }`.

## 2.2 Decision

No Core feature is invented.

The Step 2 implementation therefore:

- calls the existing Core authentication method;
- constructs a partial SecurityContext from real Core output;
- marks unavailable identity/RBAC/Policy data as partial/null;
- keeps Policy deferred;
- keeps Search deferred.

## 2.3 Implementation

Changed:

- `platform/Gateway/security-boundary.js`
- `platform/Gateway/runtime.mjs`
- `platform/Gateway/security-boundary.test.js`
- `platform/Gateway/runtime.integration.test.mjs`

Added:

- `docs/architecture/adr/ADR-003-gateway-authentication-enforcement.md`
- `docs/security/STEP-2-gateway-authentication-enforcement.md`

Gateway behavior:

`protected request -> bearer extraction -> await Core auth -> SecurityContext -> protected handler`

Public exceptions are explicit: OPTIONS, health, login, refresh.

## 2.4 SecurityContext

The Context is deeply frozen. Its Request property is non-writable/non-configurable.

Tenant source:

`session.tenant_id -> principal.tenantId -> SecurityContext.tenant.tenantId`

Query/header tenant values are not accepted as authority; they are ignored and audited.

## 2.5 Negative Test Coverage

Implemented test coverage for:

1. missing Authorization -> 401
2. fake token -> 401
3. expired/invalid token path -> 401
4. query tenantId -> ignored + audit
5. header tenantId -> ignored + audit
6. tenant mismatch -> 403
7. RBAC deny -> 403

Additional checks cover immutable SecurityContext propagation and public-route pre-flight behavior.

Membership-revoked semantics remain Core-owned; current Core collapses inactive membership into authentication failure (401). No Gateway remapping was invented.

## 2.6 Known Contract Gaps

- Core does not expose `authenticatedAt` from the authentication result.
- Core does not expose `expiresAt` from the authentication result, even though the session persistence layer stores an expiration timestamp.
- Core does not expose aggregate permissions.
- Core currently has no Policy evaluation API.
- Core currently exposes a session-based authentication model, not JWT/API-Key methods.

These gaps are explicit and are not filled by synthetic values.

## 2.7 Merge Gate

```text
Main changed directly:      NO
Branch created from Main:   YES
Merge to Main:              NO
PR:                          Draft / pending creation
Local network test clone:   BLOCKED (DNS/network unavailable)
CI evidence:                 PENDING
Final Gate:                  NOT PROVEN
```

## Raw Evidence References

- Main: `15a23125052fe511714f1e5a3ff3f4698752fef7`
- Gateway security repair commit: `753007795213abe84ce77e5340ab9842296d72e6`
- Runtime repair commit: `cb326fa4638bb1df28aed2eb91ccf49715f9bd03`
- Tests/CI alignment head: `8abf21cedfefca0f8489d670c26c2190705bc023`

## Status

Step 2 implementation is complete on the isolated branch, but completion is **not yet PROVEN** until GitHub Actions execution produces green evidence.
