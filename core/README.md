# AFX-CORE Boundary

This directory is the authoritative trust foundation. Identity, authentication, authorization, tenant context, membership, RBAC, policy, audit, consent, trust, configuration, feature flags and registry belong here.

**Rule:** business domains may consume CORE contracts but may not create competing identity/authentication authorities.

**Security invariant:** protected access follows `Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`.
