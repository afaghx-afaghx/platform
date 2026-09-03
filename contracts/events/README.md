# Event Contracts

Events are public integration contracts inside AFAGHX.

## Required conventions

- Version event types explicitly, e.g. `identity.user-created.v1`.
- Include a unique event ID and occurrence timestamp.
- Include tenant and correlation identifiers when applicable.
- Consumers must be idempotent.
- Producers must not expose secrets, raw credentials or tokens.
- Schema changes must preserve compatibility or introduce a new version.
