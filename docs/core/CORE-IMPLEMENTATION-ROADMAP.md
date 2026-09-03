# AFX-CORE Implementation Roadmap

## Wave 1 — Trust foundation

1. Identity
2. Authentication boundary
3. Organizations
4. Tenant Context
5. Memberships

## Wave 2 — Access control

6. RBAC
7. Permissions
8. Policy evaluation boundary
9. Service-to-service authorization

## Wave 3 — Governance

10. Audit
11. Consent
12. Trust/verification

## Wave 4 — Runtime governance

13. Configuration
14. Feature Flags
15. Module Registry

## Required acceptance criteria

Every wave must have:

- unit tests for core invariants
- integration tests for security boundaries
- contract tests where external contracts exist
- tenant-isolation tests
- negative authorization tests
- migration and rollback notes
- observability requirements
- ADR references for irreversible decisions

## Explicit non-goals

Do not implement business domains, recommendation logic, or UI-specific authorization inside CORE. CORE remains small, trusted, and boring by design.
