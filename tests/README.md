# AFAGHX Tests

Canonical home for cross-cutting verification that cannot be owned safely by a single package or bounded context.

## Scope

This directory covers integration, contract, security, performance, and end-to-end verification across established architecture boundaries.

It verifies behavior; it does not own application business rules, authentication, authorization, tenant policy, persistence truth, or infrastructure configuration.

## Canonical boundaries

- **CORE** remains the authority for identity and trust foundations.
- **DOMAIN** remains the authority for business rules and business data.
- **PLATFORM** remains the authority for shared runtime capabilities.
- **EXPERIENCE** never receives a direct database path.
- Cross-domain behavior is verified through approved contracts/events rather than cross-domain persistence access.
- Security and tenant-isolation failures must fail closed.

Canonical request flow:

`Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State`

## Test categories

- `integration/` — cross-component runtime behavior and boundary integration.
- `contract/` — versioned API/event contract compatibility.
- `security/` — security invariants, isolation, fail-closed behavior, and abuse-resistant paths.
- `performance/` — measurable latency/throughput/resource behavior with explicit environments and thresholds.
- `e2e/` — user-to-platform flows across real architectural boundaries.

Each category is introduced with executable tests and evidence; directories are not placeholders.

## Evidence rules

- Tests must be reproducible and deterministic where practical.
- Test data must not contain secrets or real production credentials/personal data.
- Security-sensitive tests must fail closed rather than silently skip required guarantees.
- Cross-cutting tests must identify the contract or boundary they verify.
- Completion is determined by actual CI/runtime evidence, not by the existence of test files.

## Framework policy

No new test runner, browser framework, load-testing framework, or orchestration framework is selected here without repository evidence and an explicit architecture decision. This foundation establishes ownership and boundaries first.

## Non-goals

This directory does not create:

- authentication or authorization implementations;
- RBAC or policy engines;
- tenant-resolution logic;
- business-domain models;
- database schema ownership;
- application routes;
- deployment infrastructure;
- secrets or credentials.
