# Identity Context

## Responsibility

Own the canonical platform identity and its lifecycle. Identity is not a business-domain profile.

## Owns

- identity identifier
- lifecycle state
- security-relevant identity metadata
- verified contact-method references

## Does not own

- authentication sessions
- passwords as a business concern
- tenant membership
- domain profiles

## Invariants

1. Every identity has a stable canonical identifier.
2. Disabled/suspended identities cannot establish new authenticated sessions.
3. Identity lifecycle transitions are auditable.
4. Other contexts reference identity by contract; they do not duplicate the identity authority.
