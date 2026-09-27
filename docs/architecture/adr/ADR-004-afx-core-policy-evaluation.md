# ADR-004 — AFX-CORE Policy Evaluation

- **Status:** Proposed
- **Date:** 2026-09-27
- **Branch:** `feat/core-policy-v1`
- **Base Main SHA:** `15a23125052fe511714f1e5a3ff3f4698752fef7`

## Context

AFX-CORE currently owns the policy boundary architecturally, but Main contains no Policy evaluation implementation. Step 2 therefore leaves `SecurityContext.policy` as null and defers Policy to Step 3.

The existing authorization model is already tenant-aware and deny-by-default at RBAC. Policy must not become a second authentication or RBAC authority.

## Decision

1. Policy is implemented inside **AFX-CORE**.
2. RBAC remains the grant authority. Policy is an additional gate that can restrict an already RBAC-authorized action.
3. This first contract supports **deny policies only**. A policy cannot grant access by itself.
4. An applicable deny policy returns:
   - `decision: deny`
   - ordered `policyIds`
   - explicit `reasons`
   - `evaluatedAt`
5. When no applicable deny policy exists, policy evaluation returns:
   - `decision: allow`
   - reason `no_applicable_deny_policy`
6. A missing security context or tenant mismatch fails closed with `decision: deny`.
7. Policies may be scoped by tenant, subject, role, permission and resource state.
8. Policy definitions are persisted in PostgreSQL for the persistent Core.
9. Policy definitions are immutable after normalization; updates replace the stored definition by stable policy ID.
10. Gateway remains the enforcement boundary; it does not implement policy logic.
11. Search remains outside this ADR and will consume the same SecurityContext in its dedicated integration step.
12. No Main merge is authorized by this ADR.

## Contract

```text
evaluatePolicy(securityContext, {
  permission,
  resourceTenantId,
  resourceState
})
    -> {
      decision: allow | deny,
      reasons: string[],
      policyIds: string[],
      evaluatedAt: ISO-8601
    }
```

## Security rules

```text
RBAC deny       -> deny
Tenant mismatch -> deny
Matching policy -> deny
No matching deny policy -> allow
```

The policy layer never obtains tenant authority from a request parameter.

## Consequences

- The canonical security chain now has a concrete Policy owner in AFX-CORE.
- Existing RBAC grants remain valid unless a matching deny policy blocks them.
- Policy decisions become auditable and reproducible.
- Persistent policy state survives Core object recreation.
- Future Policy evolution (for example richer condition expressions) must remain inside AFX-CORE and receive its own contract/ADR.

## Verification

Required evidence before merge:

- AFX-CORE policy unit tests.
- PostgreSQL policy persistence test.
- Existing AFX-CORE security suite remains green.
- CI evidence with the exact PR head SHA.
- No production path uses mock policy state.
