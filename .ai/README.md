# AFAGHX AI Engineering Governance

The `.ai` tree contains reusable engineering governance and evidence contracts for AFAGHX. It does not contain an active autonomous agent runtime.

## Preserved governance

- `architecture/` — system, ownership, dependency and module maps
- `contracts/` — agent/module/evidence contracts
- `evidence/` — evidence schema and provenance rules
- `policies/` — repository-wide engineering policy

## Agent runtime status

The former AFAGHX Chief Engineering Agent, its local-provider/OpenCode runtime, execution scripts, task queue and autonomous workflow entrypoints have been removed.

A future ready-made agent must consume these governance artifacts rather than replace AFAGHX architecture or become an authority over security, architecture, merge or production deployment.

## Operating principle

AI accelerates engineering; it does not become the security authority, architecture authority, merge authority or production deployment authority.
