# @afaghx/contracts

Canonical cross-layer TypeScript contracts for AFAGHX.

## Ownership

This package is owned by Engineering & Governance and defines stable, domain-neutral contracts shared by AFX-CORE, AFX-PLATFORM, DOMAIN, INTELLIGENCE, and EXPERIENCE.

It is a contract package only. It does not own authentication, authorization logic, persistence, domain business rules, HTTP transport, or database access.

## Contract rules

- Public contracts are explicitly versioned under `v1`.
- IDs are branded at the type level to reduce accidental cross-entity assignment.
- Security context is descriptive data produced by AFX-CORE; this package never authenticates or authorizes.
- DTOs describe transport shapes only.
- Events use explicit names, versions, aggregate identifiers, tenant context, and correlation metadata.
- Event consumers must treat delivery as at-least-once and therefore implement idempotency.
- No secrets, raw credentials, bearer tokens, or private keys are defined here.
- Domain-specific business payloads belong to their owning domain package.

## Package entrypoint

Import stable contracts from:

```ts
import type {
  User,
  Membership,
  ApiResponse,
  UserCreatedEvent,
} from "@afaghx/contracts";
```

The v1 contract surface is exported from `src/index.ts`.

## Configuration boundary

The repository currently has no root workspace configuration or `packages/config` package on `main`. This package therefore uses a self-contained TypeScript configuration for this isolated foundation commit. Once `packages/config` is introduced, this package's compiler configuration is intentionally migrated there in the configuration phase; no contract surface changes are required.

## Validation

`test/contracts.test.ts` verifies the runtime-safe contract constants and representative DTO/event shapes using Node's test runner through `tsx`.
