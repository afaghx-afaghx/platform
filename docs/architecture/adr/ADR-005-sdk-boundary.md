# ADR-005: Canonical SDK Boundary

**Status:** Proposed

## Context
AFAGHX needs a consumer-facing typed SDK without moving authentication, tenant, persistence, or business authority into a client package.

## Decision
Create `packages/sdk` as a typed transport and helper package. It consumes `@afaghx/contracts`, targets the canonical API boundary, and exposes only transport plus authentication-context and tenant-context helpers. It does not own identity, authorization, tenant policy, persistence, domain rules, or secrets.

## Consequences
Consumers receive stable TypeScript types and a single transport abstraction. Runtime authority remains in AFX-CORE and the canonical API boundary. The SDK cannot be used as a substitute for server-side authorization.

## Alternatives
1. Per-application API clients — rejected because they duplicate transport and contract handling.
2. Business logic in the SDK — rejected because it would move domain authority out of the server architecture.
3. Direct database client — rejected because it violates the Experience/data boundary.
