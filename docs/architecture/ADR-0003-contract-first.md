# ADR-0003: Contract-First Integration

- Status: Accepted
- Date: 2026-09-04

## Decision

Cross-boundary APIs and events are governed contracts. OpenAPI is the canonical description for synchronous HTTP APIs; event schemas are canonical for asynchronous messages.

## Rules

- Breaking changes require an explicit migration strategy.
- Contracts are versioned when compatibility requires it.
- Producers own published contract evolution.
- Consumers must be resilient to additive evolution and duplicate events where delivery semantics permit retries.
- Generated SDKs and clients must be derived from approved contracts rather than handwritten assumptions.

## Consequence

`contracts/` becomes a first-class architectural area and no domain may silently create an undocumented external contract.
