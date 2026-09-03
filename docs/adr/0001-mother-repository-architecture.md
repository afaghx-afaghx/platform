# ADR-0001: Mother Repository Architecture

- Status: Accepted
- Date: 2026-09-04

## Decision

AFAGHX starts as a governed monorepo with five explicit architectural layers: AFX-CORE, AFX-PLATFORM, DOMAIN, INTELLIGENCE, and EXPERIENCE.

AFX-CORE is the single security/trust foundation. Business capabilities are bounded contexts under `domains/`. Contracts are first-class artifacts under `contracts/`.

## Why

This preserves strong ownership and dependency boundaries while avoiding premature repository fragmentation. Deployment boundaries can evolve independently when there is a concrete operational reason.

## Consequences

- Clear dependency direction and security ownership.
- Centralized governance without forcing every capability into one runtime.
- Future extraction of independently operated services remains possible.
- Teams must respect ownership and contract boundaries inside the monorepo.
