# AFAGHX — Step 4 Search Integration with SecurityContext

## Scope

Implement the Search integration required by the canonical security contract:

`Search(query, securityContext)`

with no independent authentication and no request-controlled tenant authority.

## Branch

`feat/search-securitycontext-v1`

## Base

Step 3 proven head:

`9e0e584c600b90c0559b5e1d0caf839d17531d81`

## Changes

- Added a `GET /v1/search` Gateway security policy mapping:
  - permission: `search.read`
  - action: `read`
  - resource type: `search`
- Passed the Gateway's immutable SecurityContext into the Search route.
- Search route now requires:
  - SecurityContext,
  - RBAC allow,
  - explicit Policy allow,
  - trusted tenant context.
- Meilisearch adapter now derives a mandatory `tenant_id` filter from `securityContext.tenant.tenantId`.
- Updated unit and live integration tests for tenant isolation and fail-closed behavior.
- Added ADR-005 for the canonical integration boundary.

## Security properties

- No Search-specific authentication.
- No Search-specific tenant resolution.
- No request tenant override.
- No Policy logic duplicated inside Search.
- No direct frontend → Search data path is introduced.

## Proof matrix

| Control | Test target | Status |
|---|---|---|
| Missing SecurityContext | Search route | pending CI |
| RBAC deny | Search route | pending CI |
| Policy deny/abstain | Search route | pending CI |
| Allowed Context propagation | Gateway → Search | pending CI |
| Trusted tenant filter | Meilisearch unit | pending CI |
| Live tenant isolation | Meilisearch integration | pending CI |

## Current Gate

Implementation complete on branch. Fresh GitHub Actions evidence is required on the final HEAD before Step 4 can be called proven.

PR target: remain Draft / Unmerged.

## Stop conditions

- No merge to `main`.
- No independent Search authentication.
- No request-supplied tenant authority.
- No claim of PROVEN without fresh CI evidence.
