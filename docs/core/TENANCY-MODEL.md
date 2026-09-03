# AFX-CORE Tenancy Model

## Tenant hierarchy

The canonical organizational model is:

```text
Platform
  └── Organization
        └── Tenant Context
              └── Memberships
                    └── Subjects
```

An organization is the primary ownership boundary for organizational resources. Individual domains may introduce more specific scopes only when documented.

## Request requirements

Protected requests must resolve:

- subject
- authentication context
- tenant/organization
- membership
- roles/permissions
- policy context

before protected resource access.

## Isolation requirements

Tenant boundaries must be preserved across:

- API authorization
- persistence
- caches
- asynchronous messages
- search indexes
- file/object storage metadata
- analytics/data products
- observability where tenant data is present

## Cross-tenant access

Cross-tenant access is exceptional. It requires explicit permission/policy, a declared operational purpose, and appropriate audit evidence.

## Data rule

Every tenant-scoped entity must have an enforceable tenant ownership strategy. The absence of a tenant column alone is not evidence of isolation; the enforcement mechanism must be explicit.
