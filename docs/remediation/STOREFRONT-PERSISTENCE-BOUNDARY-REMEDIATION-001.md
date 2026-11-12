# Storefront Persistence Boundary Remediation 001

- Base: main at `af6d40ce84b726c71406c3517081e11331fbb42a`
- Scope: persistence scaffold and Experience-to-API boundary
- Status: remediation scope established; usage investigation pending

## Verified findings

1. `experience/storefront/prisma/schema.prisma` declares a SQLite datasource and generic `User`/`Post` models.
2. `experience/storefront/src/lib/db.ts` constructs and exports a PrismaClient.
3. The storefront architecture document describes Experience as a consumer of Platform/Search and Domain contracts; the canonical architecture forbids Experience-owned business persistence.
4. Repository code search did not find an import/use of `@/lib/db`, `db.user`, or `new PrismaClient` beyond the helper/schema. Treat the Prisma/SQLite path as apparently orphaned until a full build/runtime check proves otherwise.
5. `experience/storefront/src/app/api/products/route.ts` serves an in-process catalog imported from `src/lib/catalog.ts`; this is demo/static catalog behavior, not an authoritative Product/Commerce API.
6. No evidence from this audit establishes that this SQLite database is deployed or contains production business data.

## Required implementation

- Perform a complete import/reference/build/runtime trace for Prisma helper, generated client, DATABASE_URL and all API routes.
- If the helper/schema are unused, remove or quarantine the scaffold, dependencies and environment contract in a separate reviewable change.
- If any UI/API route uses Prisma for canonical user, product, order, inventory, payment or tenant data, replace that path with versioned canonical API/application contracts.
- Do not migrate or delete user data: no data-bearing deployment was proven.
- Keep all identity, authorization and tenant context under AFX-CORE; all business truth under its owning DOMAIN.
- Replace static demo catalog with a fail-closed non-production state or canonical API integration before presenting it as live offers.
- Add architecture-boundary tests that fail if Experience imports Prisma/database adapters or opens direct database connections.

## Acceptance gates

- Zero direct Experience-to-business-database paths.
- All catalog/order/account reads and writes use the approved API boundary and typed contracts.
- Tests prove that missing API configuration does not silently return fabricated live commercial data.
- Build, typecheck, lint, contract tests and relevant security gates pass on exact SHA.
- Documentation accurately distinguishes demo fixture data from live Product/Commerce records.

## Non-goals

- Changing AFX-CORE PostgreSQL persistence.
- Changing the Domain PostgreSQL adapter or PR #282.
- Claiming SQLite is a production database without evidence.
- Deleting schema/assets before reference and runtime analysis is complete.
