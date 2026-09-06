# AFX-CORE Organization / Tenant Foundation

AFX-CORE is the authoritative owner of organization and tenant identity boundaries.

## Authority model

```text
Organization
  └── Tenant
       └── Membership
            └── Identity
```

- An organization is the top-level administrative boundary.
- A tenant is an explicit isolation context owned by exactly one organization.
- A membership binds an identity to a tenant.
- Authentication and authorization must resolve an active tenant and active organization before granting tenant-scoped access.
- No domain module may create an independent tenant authority.

## Lifecycle

Organizations and tenants use explicit states:

- `active`
- `suspended`
- `deleted`

`deleted` is terminal. Suspension or deletion of an organization propagates to its tenants and revokes sessions and refresh families in those tenant contexts.

## Integrity rules

- Organization slugs are normalized to lowercase and validated.
- Tenant slugs are normalized to lowercase and unique within an organization.
- A tenant cannot be created under a missing or inactive organization.
- A membership cannot be created for a missing or inactive tenant.
- PostgreSQL foreign keys bind memberships, sessions and refresh families to an existing tenant.
- Tenant context is mandatory for tenant-scoped authorization.

## Security boundary

A valid identity alone is insufficient for tenant access. The runtime must establish:

1. active identity;
2. active organization;
3. active tenant;
4. active membership;
5. permission and policy evaluation.

This foundation does not introduce JWT, token, session, RBAC or domain redesign. It makes the existing tenant context explicit and durable.
