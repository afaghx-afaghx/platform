# ADR-0004: Event-Driven Cross-Domain Integration

- Status: Accepted
- Date: 2026-09-04

## Decision

Use synchronous APIs for immediate request/response needs and asynchronous events for decoupled workflows, projections, notifications, integration, and downstream processing.

## Event requirements

Every production event should define:

- event name and version
- producer and owner
- aggregate/resource identifier
- tenant context where applicable
- occurred-at timestamp
- correlation and causation identifiers
- schema version
- idempotency expectations
- retry/dead-letter behavior

## Consequence

Domain boundaries remain independent while the platform can react to state changes without creating synchronous dependency chains.
