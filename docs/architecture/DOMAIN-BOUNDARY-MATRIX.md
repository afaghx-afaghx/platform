# AFAGHX Domain Boundary & Ownership Matrix

This document is the enforcement map for module ownership. It prevents duplicated authorities and accidental cross-domain coupling.

| Capability | Owner | May own persistence | Depends on | Explicitly forbidden |
|---|---|---:|---|---|
| Identity | AFX-CORE Identity | Yes | Trust primitives | Domain-owned users/credentials |
| Authentication | AFX-CORE Authentication | Yes | Identity, Trust | Domain login/session stores |
| Authorization | AFX-CORE Authorization | Yes | Identity, Membership, Policy | Local role authority that overrides CORE |
| Organization | AFX-CORE Organizations | Yes | Identity | Domain-owned organization authority |
| Membership | AFX-CORE Memberships | Yes | Organization, Identity | Client-controlled tenant membership |
| Tenant Context | AFX-CORE Tenant Context | No/derived | Authentication, Membership | Trusting tenant IDs from clients |
| Audit | AFX-CORE Audit | Yes | Security context | Silent security-critical mutations |
| Consent | AFX-CORE Consent | Yes | Identity, Tenant Context | Untracked consent state |
| Trust | AFX-CORE Trust | Yes | Identity | Embedded signing/secret stores |
| Configuration | AFX-CORE Configuration | Yes | Tenant Context, Policy | Secrets in source |
| Feature Flags | AFX-CORE Feature Flags | Yes | Tenant Context | Business logic reading raw flag storage |
| Module Registry | AFX-CORE Module Registry | Yes | Trust | Ad-hoc module discovery |
| Gateway/API management | AFX-PLATFORM | Derived | CORE security context | Reimplementing authorization authority |
| Messaging | AFX-PLATFORM | Yes | Contracts, Observability | Unversioned events |
| Notifications | AFX-PLATFORM | Yes | CORE, Messaging | Direct domain-owned delivery infrastructure |
| Search | AFX-PLATFORM | Derived | Domain contracts/events | Cross-domain database reads |
| Files | AFX-PLATFORM | Yes | Tenant Context, Policy | Unscoped object storage |
| Workflow | AFX-PLATFORM | Yes | Policy, Messaging | Hidden business authority |
| Billing | AFX-PLATFORM/Domain | Yes | CORE security contracts | Credential ownership outside Trust |
| Business domains | DOMAIN | Yes | CORE + approved PLATFORM contracts | Identity/authentication authority |
| AI/Analytics | INTELLIGENCE | Derived | Approved events/data products | Direct access to private domain stores |
| Web/Admin/Partner apps | EXPERIENCE | No authority | Public APIs/contracts | Direct persistence access |

## Mandatory dependency rule

`EXPERIENCE → DOMAIN/PLATFORM → CORE`

`INTELLIGENCE → approved contracts/events/data products`

CORE never depends on business domains.

## Enforcement

Every new capability must declare:

1. owning bounded context;
2. authoritative data it owns;
3. public commands/queries/events;
4. dependencies;
5. tenant isolation strategy;
6. authorization policy boundary;
7. audit requirements;
8. extraction criteria if independent deployment may eventually be justified.
