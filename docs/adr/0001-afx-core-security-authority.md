# ADR-0001: Establish AFX-CORE as the security authority

- Status: Accepted
- Date: 2026-09-04

## Context

AFAGHX requires a single security authority across a multi-tenant ecosystem. Independent authentication implementations in domains would create inconsistent identity, authorization, audit, and tenant-isolation behavior.

## Decision

AFX-CORE is the canonical owner of identity, authentication, authorization, tenant context, membership, sessions, RBAC, policy, consent, trust, and audit contracts. Domain services consume these contracts and never establish competing authentication authorities.

The canonical protected-request pipeline is:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

Access tokens are short-lived. Refresh sessions use rotation and replay detection. Policy is the final authorization authority; roles and scopes are inputs, not an unconditional allow decision.

## Consequences

- Security behavior becomes centrally governed.
- Domain services remain focused on business rules.
- Tenant boundaries become an explicit platform invariant.
- Infrastructure adapters can evolve without changing domain contracts.
- Initial implementation is framework-neutral so the runtime stack can be selected without coupling the architecture to a single web framework.
