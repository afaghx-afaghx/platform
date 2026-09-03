# Tenant Isolation Standard

Tenant isolation is a security invariant, not merely a database convention.

## Enforcement points

- **API:** tenant context is resolved and validated before protected handlers.
- **Application:** repositories and use cases receive explicit tenant context.
- **Database:** tenant-scoped records carry an unambiguous ownership key; stronger database isolation is introduced for higher-risk workloads.
- **Cache:** keys are tenant-qualified; shared caches never permit accidental cross-tenant reads.
- **Messaging:** tenant context travels with applicable events and commands.
- **Search:** indexes and filters preserve tenant boundaries.
- **Files:** object paths/claims are tenant-scoped and access is policy-checked.
- **Observability:** sensitive tenant data is minimized; access and security events remain attributable.

## Cross-tenant access

Cross-tenant access is exceptional, explicitly authorized, narrowly scoped, and auditable. Administrative capability does not imply unrestricted data access.

## Testing requirement

Isolation tests must attempt unauthorized cross-tenant reads and writes at the API/application boundary and at persistence boundaries where practical.
