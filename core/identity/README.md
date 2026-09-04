# AFX-CORE Identity

Identity is the canonical representation of a person or service principal. It is independent from authorization.

## Canonical relationship

```text
Identity
  ├── Credentials
  ├── Sessions
  └── Memberships
         └── Organization / Tenant
                └── Roles → Permissions
```

A user may belong to multiple organizations with different memberships and permissions.

## Invariants

- Identity IDs are immutable opaque identifiers.
- Login identifiers have a uniqueness policy and are normalized consistently.
- Credential records are separate from the identity profile.
- Tenant membership is explicit; absence of membership means no access.
- Disabled/suspended identities cannot authenticate.
- Sensitive identity attributes are minimized and access controlled.
