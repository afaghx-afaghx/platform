# AFAGHX Platform — Tests Foundation

tests/ is the canonical Engineering & Governance home for cross-cutting verification. It verifies boundaries between AFX-CORE, AFX-PLATFORM, DOMAIN, INTELLIGENCE, EXPERIENCE, and persistence/runtime surfaces without becoming an implementation authority.

## Categories
- integration — Core↔Platform, Platform↔Domain, and Domain↔Database boundary behavior.
- contract — versioned package, API, and event contract compatibility.
- security — authentication, tenant isolation, RBAC, fail-closed behavior, and secret scanning.
- performance — reproducible local benchmarks with explicit workloads; not production-capacity claims.
- e2e — complete user-facing flows across approved API boundaries.

## How to run
From tests/ after dependencies are installed:
- pnpm test
- pnpm test:coverage
- pnpm test:security
- pnpm test:contract
- pnpm test:e2e
- pnpm test:performance

The test package owns its runner configuration under tests/ and does not modify repository-wide package management.

## Evidence requirements
A completion claim requires actual test output, CI evidence, security checks, and reviewable documentation. A test file existing is not evidence of correctness. Coverage is enabled by default; CI must publish the resulting report. Runtime-dependent tests must fail clearly when their required runtime is unavailable rather than silently fabricating success.

## Boundaries
This directory may verify behavior across layers, but it does not own identity, authentication, authorization, tenant policy, business rules, persistence truth, routes, infrastructure, secrets, or deployment configuration. Experience tests use approved API boundaries and never connect directly to a database.

Canonical protected-request flow: Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State.

No test introduces a second authentication authority, cross-domain persistence access, or alternate business truth. Destructive database operations require explicit setup/teardown ownership and restore evidence.
