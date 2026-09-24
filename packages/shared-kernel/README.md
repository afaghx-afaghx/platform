# @afaghx/shared-kernel

Canonical domain-neutral primitives for AFAGHX bounded contexts.

## Scope

This package contains only reusable domain primitives:

- Result for explicit success/failure flow.
- Entity for identity-based domain objects.
- ValueObject for immutable value semantics.
- DomainEvent for domain-event structure and metadata.
- Clock for deterministic time access.
- IdGenerator for injectable identifier generation.

## Architectural rules

1. The shared kernel is domain-neutral; it must not own Product, Order, Payment, Shop, Factory, or other business rules.
2. It must not contain authentication, authorization, tenant policy, persistence, HTTP, database, or infrastructure adapters.
3. Domain-specific invariants remain inside the owning bounded context.
4. Implementations are dependency-light and deterministic where dependencies are injectable.
5. No secrets, credentials, or configuration values belong here.
6. This package does not replace AFX-CORE. Identity, tenant context, RBAC, policy, audit, and trust authority remain owned by AFX-CORE.
7. This package is intentionally independent of @afaghx/contracts; cross-layer transport contracts remain owned by packages/contracts.

## Validation

Run the package check, build, and test scripts once repository workspace tooling is available.
