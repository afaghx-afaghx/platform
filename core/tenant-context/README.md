# Tenant Context

Tenant context is derived from authenticated identity and validated membership, never accepted as an authorization fact from an arbitrary client value.

## Resolution

`authenticated principal → requested tenant context → membership lookup → active membership → organization/tenant policy → validated Security Context`

## Isolation requirements

Tenant scope must be preserved across API handlers, application services, database queries, cache keys, messages, search indexes, files, and relevant observability dimensions.

Any intentional cross-tenant administrative operation must use an explicit privileged contract and produce an audit record.
