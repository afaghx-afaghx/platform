# AFX-CORE Foundation

## Mission

AFX-CORE is the trusted foundation of AFAGHX. It provides identity, trust, access control, organizational context, governance, and platform configuration as shared primitives.

## Components

```text
core/
├── identity/
├── authentication/
├── authorization/
├── organizations/
├── memberships/
├── tenant-context/
├── rbac/
├── policy/
├── audit/
├── consent/
├── trust/
├── configuration/
├── feature-flags/
└── module-registry/
```

## Authority model

Identity answers **who is this subject?**

Authentication answers **how was the subject authenticated?**

Organization/Tenant Context answers **where is the subject operating?**

Membership answers **what relationship does the subject have with that organization?**

RBAC answers **what permissions are assigned?**

Policy answers **is this operation allowed in this context?**

Resource state answers **is the requested business operation valid now?**

Audit records the security-relevant decision and action.

## Canonical context object

A protected request should resolve a trusted context conceptually containing:

```text
subject_id
session_id / authentication_context
organization_id / tenant_id
membership_id
roles
permissions
policy_context
correlation_id
```

The exact transport representation is an implementation concern and must not become an authorization bypass.

## Identity principles

- A person, service account, and external principal are distinct subject types.
- Stable identifiers are immutable identifiers, not mutable usernames.
- Authentication credentials are separated from identity records.
- Identity records do not contain domain-specific business profiles.

## Authentication principles

- Authentication is centralized.
- Credential material is never stored in plaintext.
- Sessions/tokens have explicit lifecycle and revocation semantics.
- Authentication events are auditable where required.
- MFA and stronger assurance can be introduced without changing domain authorization contracts.

## Authorization principles

Authorization is deny-by-default and evaluated with subject, tenant, action, resource, and policy context.

Conceptual decision:

`ALLOW | DENY`

A domain may add business-state checks, but it may not bypass the core authorization boundary.

## Tenant principles

Tenant context is trusted only after membership and policy validation. Tenant identifiers supplied by clients are inputs, not proof of access.

## Audit principles

Audit is for security, compliance, and governance evidence. It is distinct from application logs and must have controlled retention and access.

## Module registry

The registry describes enabled modules, versions, capabilities, lifecycle state, and configuration references. It must not become a substitute for authorization.

## Implementation order

1. Identity model
2. Authentication boundary
3. Organization and tenant model
4. Membership model
5. Permission and role model
6. Policy evaluation boundary
7. Audit model
8. Consent and trust
9. Configuration and feature flags
10. Module registry

This order intentionally follows the security dependency chain.
