# AFAGHX Engineering Standards Firewall

## Status

Proposed for Governance review.

## Precedence

These standards are subordinate to the AFAGHX Engineering Constitution, Master Architecture and accepted ADRs.

A coding standard, framework preference, deployment preference or external checklist must not weaken or replace a higher-level AFAGHX architectural invariant.

## Adopted engineering requirements

- Hexagonal boundaries are the default implementation shape for application/domain/infrastructure code.
- Protected API operations must authenticate and authorize through the canonical security flow.
- Database queries must be parameterized; SQL string concatenation is forbidden.
- User input must be validated at the appropriate boundary.
- Every PR must contain a meaningful change description.
- Test coverage target is at least 80 percent for production code, but coverage is considered proven only when a real coverage report is produced by CI.

## Architecture protection

The following are not permitted as automatic architecture rules:

- Forcing User Management into an independent microservice.
- Forcing Seller Management into an independent microservice.
- Forcing all internal communication through the API Gateway when an explicit application interface, versioned contract, or event is the correct boundary.

Microservice extraction is allowed only through an accepted ADR that demonstrates:

1. explicit bounded-context ownership;
2. independent persistence ownership;
3. preserved AFX-CORE security authority;
4. explicit versioned APIs/events;
5. tenant-isolation behavior;
6. deployment and observability requirements;
7. migration and rollback strategy;
8. reproducible CI/runtime evidence.

## Security invariants

Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State

Experience applications must not connect directly to Core or domain databases. Domain ownership must remain explicit. CORE must not depend on business DOMAIN.

## Enforcement

AFAGHX Architecture Constitution Guard is the minimum automated boundary.

The release gate remains a separate proof layer. Static analysis does not replace runtime, integration, security, or deployment evidence.

## Failure posture

Architectural ambiguity, unauthorized boundary crossing, missing ADR for structural change, or unverifiable coverage is not reported as green. The system must fail closed rather than downgrade the architecture.