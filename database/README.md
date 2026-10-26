# AFAGHX Database Foundation

Canonical home for AFAGHX database governance, schemas, migrations, seeds, and database tooling.

## Architectural boundary

The database is a persistence implementation and evidence surface. It is **not** an application-layer authority.

- AFX-CORE owns identity, membership, tenant context, authorization and trust primitives.
- Each DOMAIN owns its business data and invariants.
- PLATFORM owns shared runtime capabilities, not domain truth.
- EXPERIENCE never connects directly to the database.
- INTELLIGENCE consumes approved contracts, events, or governed data products.
- Infrastructure may operate the database but must not redefine business truth.

Canonical request flow remains:

`Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State`

## Database rules

1. No frontend or Experience application may access PostgreSQL directly.
2. No cross-domain database writes.
3. Every persistent schema has an explicit owning boundary.
4. Migrations are forward-only, reviewable, reproducible, and versioned.
5. Destructive or high-risk migrations require explicit review and rollback/restore evidence where rollback is not technically safe.
6. Tenant isolation is a foundational security property; database-level controls such as PostgreSQL RLS are used where required by the owning boundary.
7. Secrets and credentials never belong in schema, migration, seed, or documentation files.
8. Seeds are deterministic and must never contain production secrets or real personal data.
9. Database changes must be covered by the owning package/domain tests and repository CI gates.
10. Schema changes must not silently redefine API or event contracts; affected contracts must be versioned explicitly.

## Technology baseline

The target persistence baseline is PostgreSQL 16 with PostgreSQL RLS and pgvector where justified by the owning capability.

Redis, object storage, search engines, and event infrastructure are separate PLATFORM/INFRASTRUCTURE concerns and are not treated as PostgreSQL tables.

## Canonical subdirectories

- `schema/` — schema ownership and database design documentation.
- `migrations/` — versioned migration policy and migration artifacts.
- `seeds/` — deterministic non-production seed policy and seed artifacts.
- `tooling/` — database validation, migration, backup/restore, and evidence tooling.

No business-domain schema is invented in this foundation PR. Domain schemas must be introduced by their owning bounded context with the required architecture and evidence.
