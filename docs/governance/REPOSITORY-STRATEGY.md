# AFAGHX Repository Strategy

## Canonical source of truth

`afaghx-afaghx/platform` is the canonical mother repository for AFAGHX during the current architecture and implementation phase.

All core architecture, production code, security implementation, CI/CD, infrastructure, contracts, tests, evidence and engineering governance belong under this repository.

Parallel repositories must not contain competing or duplicate AFAGHX implementation. A separate repository may exist only after an explicit architecture decision establishes independent ownership, release lifecycle, security boundary, or operational need.

## Legacy bootstrap repository

`afaghx-afaghx/afaghx` was an earlier bootstrap repository. Its useful architecture/governance material has been consolidated into `afaghx-afaghx/platform`.

It is no longer a development source of truth and must not receive new AFAGHX implementation work.

## Migration principle

Migration is consolidation, not blind copying:

1. Inventory the source repository.
2. Classify architecture, code, documentation, configuration and obsolete material.
3. Preserve the authoritative/better version in `platform`.
4. Remove duplicates and temporary artifacts.
5. Validate references, tests and CI.
6. Freeze the legacy repository.
7. Archive or delete the legacy repository only after verification and required GitHub administrative action.

## Canonical monorepo layout

- `apps/` user-facing applications and API edge
- `core/` AFX-CORE bounded contexts
- `platform/` shared platform capabilities
- `domains/` business domains
- `intelligence/` AI/data/intelligence capabilities
- `packages/` shared libraries and SDKs
- `contracts/` API and event contracts
- `infra/` infrastructure and deployment
- `docs/` architecture, ADRs, security and operations
- `.github/` CI, governance and repository automation

## Branch model

`main` is the canonical release line. Short-lived feature/fix/chore branches and mandatory review are preferred.
