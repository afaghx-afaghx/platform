# ADR-007 — Canonical Domain Event Ownership

- Status: Accepted
- Date: 2026-09-25
- Scope: Contracts / Shared Kernel

## Decision

AFAGHX has one canonical `DomainEvent` contract.

The authoritative definition is:

`packages/contracts/src/events.ts`

The duplicate definition in:

`packages/shared-kernel/src/domain-event.ts`

is removed.

Shared Kernel does not redefine, wrap, or fork the cross-layer DomainEvent contract. Domain implementations that need the event contract consume the canonical Contracts definition.

## Rationale

The two previous definitions had materially different shapes. The Contracts version carries contract version, aggregate identity, producer, and optional tenant context; the Shared Kernel version used a separate eventVersion model and omitted required contract fields.

Keeping both would create two sources of truth and permit incompatible event shapes to cross layer boundaries.

## Consequences

- Contracts owns cross-layer event schema and versioning.
- Shared Kernel remains domain-neutral and dependency-light.
- Domain-specific event payloads remain owned by their bounded contexts.
- Platform owns transport, delivery, outbox, and broker concerns.
- No compatibility alias is retained for the removed Shared Kernel `DomainEvent`.

## Verification rule

Any future event schema/type addition must first be checked against `packages/contracts`. Duplicate event contracts are prohibited.
