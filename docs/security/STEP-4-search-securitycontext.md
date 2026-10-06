# AFAGHX — Step 4 Search Integration with SecurityContext

## STATUS

PROVEN — Step 4 scope is green on the final branch HEAD.

## HEAD

`5e99ba38046b90c0559b5e1d0caf839b99b7f8174c3b20b5323979`

## Base

Step 3 proven parent:

`9e0e584c600b90c0559b5e1d0caf839d17531d81`

## Implementation

- `GET /v1/search` is now governed by Gateway RBAC + Core Policy.
- Permission: `search.read`.
- Action: `read`.
- Resource type: `search`.
- The exact immutable Gateway SecurityContext is passed into Search.
- Search fails closed without SecurityContext, RBAC allow, explicit Policy allow, or tenant context.
- Meilisearch applies a mandatory `tenant_id` filter derived only from `securityContext.tenant.tenantId`.
- Request query/header tenant identifiers remain ignored and audited by the Gateway.

## Fresh CI evidence

| Workflow | Run | Result |
|---|---:|---|
| AFAGHX Search Runtime | 36346969988 | SUCCESS |
| AFX-PLATFORM Security Boundary | 36346970043 | SUCCESS |
| AFAGHX B2C Product Runtime | 36346970011 | SUCCESS |
| AFX-CORE Security | 36346970034 | SUCCESS |

The Search Runtime job completed both Search adapter tests and Gateway search-route tests successfully.

The Gateway Security Boundary job completed gateway security tests, canonical runtime integration proof, and evidence upload successfully.

The B2C Product Runtime job completed its product contract/runtime checks successfully.

AFX-CORE Security completed bootstrap security tests, policy tests, PostgreSQL policy persistence tests, refresh-race tests, and evidence upload successfully.

## Step 4 proof matrix

| Control | Evidence | Result |
|---|---|---|
| Missing SecurityContext | search-route test | PASS |
| RBAC deny blocks Search | search-route test | PASS |
| Policy deny/abstain blocks Search | search-route test | PASS |
| Allowed Context propagation | Gateway runtime integration | PASS |
| Trusted tenant filter | Meilisearch adapter test | PASS |
| Live tenant isolation | Meilisearch integration | PASS |
| Gateway → Core → Policy → Search | canonical runtime integration | PASS |

## Repository-wide blocker

`AFX-CORE Gate 01` run `36346969979` remains FAILURE in its closure-matrix validation. This is a repository-wide blocker independent of the Step 4 implementation.

Therefore:

- Step 4 scope: PROVEN.
- PR #182: DRAFT / UNMERGED.
- PR #181: remains DRAFT / UNMERGED.
- Main merge: prohibited until the AFAGHX Final Gate is satisfied.
