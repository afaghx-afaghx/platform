# AFAGHX Routes Layer

## Purpose
Canonical inventory and ownership boundary for routes. This layer documents route ownership and validates that declared routes follow AFAGHX architectural constraints.

## Investigation findings
- `platform/Gateway/` contains a canonical runtime implementation and integration tests; no production endpoint list was inferred where the repository does not declare one.
- `core/AFX-CORE/` is a library/persistence core and does not expose an HTTP endpoint inventory.
- `experience/web/server.js` is an HTTP server for the Experience web surface. Its existing server route is the root request surface; no new application endpoint is invented here.

## Boundaries
Owns route inventory, ownership metadata, boundary validation, and canonical-flow declarations.
Does not own HTTP business logic, authentication implementation, authorization implementation, persistence, domain rules, or database access.

## Canonical request flow
`Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State`

## Adding a new route
1. Verify the route exists in its owning runtime.
2. Declare path, owner, layer, and security requirements in `ownership.json`.
3. Ensure the route follows canonical dependency direction.
4. Run `routes/scripts/validate.sh`.
5. For structural ownership changes, update the applicable ADR.

## Validation
Run:
```sh
./routes/scripts/validate.sh
```
