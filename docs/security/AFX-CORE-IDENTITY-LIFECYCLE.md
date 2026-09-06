# AFX-CORE Identity Lifecycle

## Authority

AFX-CORE is the sole authority for identity state. Authentication, tenant membership, authorization, and experience layers consume identity state; they do not define a second identity lifecycle.

## Identity contract

Each identity has:

- a stable opaque identifier (`id`)
- a normalized canonical email
- a lifecycle status
- credentials stored separately from the public identity representation

The public identity representation never exposes password hashes or bearer credentials.

## Statuses

| Status | Meaning |
| --- | --- |
| `active` | Identity may authenticate and use active memberships. |
| `disabled` | Administrative suspension; authentication is denied. |
| `locked` | Security lock; authentication is denied. |
| `deleted` | Terminal soft-deletion state; authentication is permanently denied. |

## Allowed transitions

```text
active   -> disabled | locked | deleted
locked   -> active | disabled | deleted
disabled -> active | deleted
deleted  -> terminal
```

No implicit or undocumented transition is permitted.

## Security invariant

Any transition away from `active` revokes the identity's active sessions and refresh-token families. This prevents already-issued credentials from surviving an identity suspension or deletion.

## Compatibility

The lifecycle is additive to the existing authentication contract. Authentication continues to accept only `active` identities, and authorization remains delegated to AFX-CORE.

## Evidence requirements

Lifecycle behavior must be covered by deterministic tests for identifier stability, normalization, legal transitions, terminal deletion, credential invalidation, session revocation, refresh-family revocation, and audit leakage resistance.
