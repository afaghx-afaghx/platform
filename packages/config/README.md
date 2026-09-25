# @afaghx/config

Canonical repository configuration primitives for AFAGHX.

## Scope

This package owns reusable, domain-neutral development configuration:
- strict TypeScript compiler baseline;
- neutral ESLint baseline;
- shared Prettier formatting baseline;
- Zod-based environment parsing.

## Architectural boundaries

- No business-domain rules.
- No authentication or authorization logic.
- No tenant, membership, RBAC, or policy authority.
- No database connection or persistence implementation.
- No secrets or credentials are stored here.
- Environment variables are parsed, not provisioned or persisted.
- Framework-specific applications may extend these neutral baselines without changing AFX-CORE ownership boundaries.

## Security rule

Environment parsing fails closed when an explicitly supplied value violates its schema. Secrets belong in runtime secret-management, not source control or this package.

## Current repository boundary

This package is self-contained because root workspace orchestration is not yet canonicalized on main. Later workspace work may consume these exports; it must not introduce cross-layer business ownership.
