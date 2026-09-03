# AFX-CORE

AFX-CORE is the trust foundation of AFAGHX. Business domains consume its contracts; they do not recreate its authorities.

## Bounded contexts

`identity` · `authentication` · `authorization` · `organizations` · `memberships` · `tenant-context` · `rbac` · `policy` · `audit` · `consent` · `trust` · `configuration` · `feature-flags` · `module-registry`

Implementation work must introduce each context behind explicit contracts and tests rather than creating a distributed identity model.
