# AFAGHX — STEP 3 REPORT

## SECTION 8

```text
STEP:          3 — Core Policy Implementation
STATUS:        blocked
BRANCH:        feat/core-policy-v1
HEAD SHA:      debff247f11e94b6d32fa9e72a2f906614a376fd
FILES:         +4 / ~3 / -0
DISCOVERY:     complete — no Policy implementation existed on Main
DECISION:      Policy lives in AFX-CORE as a deny-only, post-RBAC gate
SECURITY:      authn unchanged | tenant-aware | RBAC unchanged | policy implemented
NEGATIVE:      repository test suite pending CI
CHECKS:        local repository execution blocked by unavailable GitHub DNS
EVIDENCE:      branch commits + ADR + tests + CI workflow updates
BLOCKERS:      CI execution not yet registered for current head
NEXT STEP:     Gateway Policy Context Integration / SecurityContext completion
```

## Discovery

Main contained:

- RBAC via role/permission mapping.
- tenant-aware authorization.
- no `evaluatePolicy`, Policy table, or Policy model.

## Implementation

Added:

- `core/AFX-CORE/src/policy.js`
- PostgreSQL `afx_policies` persistence.
- `registerPolicy()` and `evaluatePolicy()` to in-memory and persistent Core.
- Policy enforcement after successful RBAC authorization.
- Unit and PostgreSQL persistence tests.
- CI execution/evidence steps for both policy test layers.

## Contract

Policy is deliberately deny-only in this increment.

An existing RBAC grant is still required. Policy cannot grant a permission that RBAC denied.

A matching policy can be scoped by:

- tenant
- subject
- role
- permission
- resource state

Evaluation result is explicit and immutable:

`allow | deny` + reasons + policy IDs + evaluatedAt.

## Persistence

PostgreSQL table:

`afx_policies`

The table stores the normalized policy definition, enablement, priority and timestamps. Enabled policies are selected for the current tenant or globally scoped policies.

## Tests

Added unit coverage for:

- no applicable deny policy;
- tenant-scoped deny;
- role/subject constraints;
- tenant mismatch fail-closed;
- invalid policy definitions;
- immutable policy definition.

Added PostgreSQL persistence coverage for:

- policy survives Core object recreation;
- policy denies an RBAC-authorized operation after reload.

The existing security workflow now executes these tests and captures artifacts.

## Local execution limitation

A direct repository clone/test run was attempted but failed before execution because this environment cannot resolve `github.com`. Therefore no local repository test result is being promoted to CI evidence.

## Merge Gate

```text
Main changed directly: NO
Step 2 PR merged:       NO
Step 3 branch:          YES
Step 3 PR:              pending creation
CI:                     pending
FINAL GATE:             NOT PROVEN
```
