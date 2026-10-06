# ADR-004 — AFX-CORE Policy Evaluation

- Status: Proposed
- Date: 2026-09-27
- Branch: feat/core-policy-v1
- Base Main SHA: 15a23125052fe511714f1e5a3ff3f4698752fef7

## Decision

1. Policy is implemented inside AFX-CORE only.
2. RBAC remains the permission-grant authority. Policy is evaluated only after RBAC succeeds.
3. Policy rules support allow and deny. No matching rule returns abstain.
4. Evaluation is ordered by policy priority; at equal priority deny precedes allow, followed by stable policy/rule order.
5. Missing SecurityContext or resource-tenant mismatch returns deny and never trusts a request tenant identifier.
6. Every decision is immutable and contains effect, reason, policyId, evaluatedAt and subject/resource/action inputs.
7. Every PersistentAfxCore policy decision is stored in afx_policy_audit and emitted through the Core audit sink.
8. Policies are tenant-scoped and persisted in afx_policies.
9. Gateway calls Core for RBAC and Policy and only enforces the returned decision.
10. Gateway maps deny and abstain to HTTP 403 and allows only explicit allow.
11. Search remains deferred to Step 4.
12. No merge to Main is authorized by this ADR.

## Contract

evaluatePolicy(securityContext, resource, action) -> PolicyDecision

PolicyDecision = { effect: allow | deny | abstain; reason; policyId; evaluatedAt; inputs }

## Verification required

- AFX-CORE unit tests
- PostgreSQL persistence + audit test
- Gateway allow/deny/abstain tests
- Gateway -> Core -> Policy -> endpoint integration
- Multi-tenant isolation
- Priority ordering
- CI evidence on exact PR head SHA
- PR #181 remains Draft until all gates are proven