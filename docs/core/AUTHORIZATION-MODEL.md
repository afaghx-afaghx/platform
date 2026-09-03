# AFX-CORE Authorization Model

## Decision pipeline

```text
subject
  + authentication assurance
  + tenant context
  + membership
  + roles/permissions
  + action
  + resource
  + policy context
        |
        v
   authorization
        |
   ALLOW / DENY
```

## RBAC

RBAC is the baseline assignment mechanism. Roles aggregate permissions; memberships connect subjects to organizations. Roles must be scoped explicitly and must not silently grant global authority.

## Permission naming

Use a stable resource/action convention, for example:

`organization.read`
`organization.manage`
`member.invite`
`member.remove`

Domain permissions follow the same convention and are owned by their domain.

## Policy

Policy can add contextual constraints such as resource ownership, organization scope, lifecycle state, risk, assurance level, or administrative conditions.

## Deny by default

Unknown permission, missing tenant context, invalid membership, failed policy, or insufficient authentication assurance results in denial for protected operations.

## Service-to-service authorization

Internal services are not implicitly trusted. Service identities require explicit permissions and auditable identity propagation where acting on behalf of a subject.

## No authorization duplication

Applications and domains may perform business-state validation, but the core authorization contract remains authoritative for access decisions.
