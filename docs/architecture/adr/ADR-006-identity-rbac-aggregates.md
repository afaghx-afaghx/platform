# ADR-006 — Canonical Identity and RBAC Aggregates

## Status

Proposed — Step 5 implementation.

## Problem

After Steps 3–4, Authentication correctly established the user and tenant, but the canonical SecurityContext still exposed only `userId` for Identity and role names for Membership. The actual RBAC permission aggregate was not present in the Context.

## Decision

AFX-CORE is the only source for the aggregates.

Identity:
- `userId`
- `email`
- `status`

Membership:
- `userId`
- `tenantId`
- `roles`
- `status`
- `permissions` derived from all membership roles

RBAC:
- `allowed` remains the per-request authorization result.
- `permissions` contains the Core-derived aggregate.

Gateway:
- resolves Identity and Membership aggregates from Core after authentication;
- validates principal/tenant consistency;
- builds and freezes the canonical SecurityContext;
- fails closed when aggregate resolution fails;
- does not compute permissions itself.

Persistent Core reads Identity from `afx_users`, Membership from `afx_memberships`, and aggregate permissions from `afx_role_permissions`.

No request field can override the tenant used for aggregate resolution.

## Consequences

Downstream Domain/Search consumers can rely on one canonical Context without re-querying Identity/RBAC or implementing parallel authorization logic.

The existing boolean RBAC check remains distinct from the permission aggregate; Step 5 does not merge RBAC semantics into Policy.

## Proof target

- Core returns authoritative Identity and permission aggregates.
- Cross-tenant Membership resolution fails closed.
- Gateway propagates Core aggregates into immutable SecurityContext.
- Aggregate resolution failures fail closed.
- Existing Step 3 Policy and Step 4 Search flows remain green.
