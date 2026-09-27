# Experience Routes

## Purpose
Document routes owned by the Experience layer without inventing application endpoints.

## Route ownership table

| Path | Owner | Layer | Auth | Tenant | RBAC |
|---|---|---|---|---|---|
| / | experience-web | EXPERIENCE | false | false | false |

## Constraints
- Experience owns presentation/navigation surfaces only.
- Experience must never connect directly to a database.
- Authentication and authorization authority remains outside the Experience layer.

## Examples
`/` is the existing web server root request surface in `experience/web/server.js`.
