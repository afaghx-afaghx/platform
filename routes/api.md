# API Routes

## Purpose
Document declared API route ownership at the Platform/Domain boundary without inventing endpoints.

## Route ownership table

| Path | Owner | Layer | Auth | Tenant | RBAC |
|---|---|---|---|---|---|
| _No API endpoint is declared by the inspected source inventory_ | — | — | — | — | — |

## Constraints
- API routes must resolve security context before resource access.
- Public APIs are explicit, versioned contracts.
- No frontend-to-database path is permitted.
- Ownership must remain explicit.

## Examples
An example route is not included because this phase forbids inventing endpoints absent from the inspected Gateway/Core source.
