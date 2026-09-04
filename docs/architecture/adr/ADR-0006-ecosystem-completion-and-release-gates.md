# ADR-0006 — Ecosystem Completion and Release Gates

**Status:** Accepted

## Decision

AFAGHX development is governed as a sequence of executable foundation gates. The repository must never represent architectural documentation or scaffolding as production completion.

The canonical dependency direction is:

`EXPERIENCE → DOMAIN/PLATFORM → CORE`

with governed Intelligence/Data consumption and infrastructure supporting all layers.

## Rules

1. AFX-CORE is the sole trust foundation.
2. Organization and Tenant remain distinct concepts.
3. Authorization is deny-by-default and returns an explicit versioned decision contract.
4. Public APIs and events are versioned contracts.
5. Outbox/Inbox semantics protect event reliability and idempotency.
6. Security-sensitive state is server-derived and audited.
7. Production readiness requires executable evidence, not documentation alone.
8. Domain implementation must not bypass unresolved Gate 01–03 security and platform controls.

## Release gates

- **Gate 01:** Trust Foundation
- **Gate 02:** Platform Foundation
- **Gate 03:** Data Foundation
- **Gate 04:** Domain Foundation
- **Gate 05:** Intelligence & Experience
- **Gate 06:** Production Readiness

A release candidate may proceed only when its applicable gate has implementation, tests, operational behavior and review evidence.
