# AFAGHX Architecture

## Canonical repository

`afaghx-afaghx/platform` is the single canonical mother repository and Source of Truth for the AFAGHX Ecosystem Platform.

No production implementation, architecture decision, security control, contract, infrastructure definition, or operational evidence may be maintained in a parallel AFAGHX repository unless an explicit architecture decision authorizes a separately owned repository.

## Layer model

```text
AFX-EXPERIENCE
      |
AFX-EDGE / API GATEWAY
      |
+----------------------+
| AFX-CORE             |
| Identity             |
| Authentication       |
| Authorization/RBAC   |
| Organization/Tenant  |
| Policy/Audit/Consent |
| Trust/Config/Flags   |
| Module Registry      |
+----------------------+
      |
AFX-PLATFORM
      |
DOMAIN SERVICES
      |
INTELLIGENCE
```

## Non-negotiable boundaries

1. Authentication is centralized in AFX-CORE.
2. Every request resolves identity and tenant context before authorization.
3. Domain services own domain state and business rules, not platform identity.
4. API and event contracts are explicit and versioned.
5. Infrastructure is declarative and environment-specific configuration stays outside source control.

## Initial AFX-CORE bounded contexts

- identity
- authentication
- authorization
- organizations
- memberships
- tenant-context
- rbac
- policy
- audit
- consent
- trust
- configuration
- feature-flags
- module-registry
