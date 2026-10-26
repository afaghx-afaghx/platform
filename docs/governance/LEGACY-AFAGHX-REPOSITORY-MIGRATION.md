# AFAGHX Legacy Repository Consolidation Record

## Decision

`afaghx-afaghx/platform` is the canonical mother repository and Source of Truth for AFAGHX.

The legacy repository `afaghx-afaghx/afaghx` is treated as a bootstrap/legacy repository only. No new AFAGHX implementation is to be developed there.

## Source inventory verified on 2026-09-04

The legacy repository is currently empty at its `main` contents endpoint. Its recent history confirms that its previously committed bootstrap material was deliberately removed after consolidation into `platform`.

Verified legacy history includes:

- `27dd95af76996e8c5d84020b7db505147fdff4a7` — AFAGHX platform README
- `bb4de8fc3600367d642daa0f14433ef54b1e0048` — AFAGHX engineering constitution
- `b1c4605870c6f32578bb621ef3a87b169889de92` — repository security `.gitignore`
- `a51e2ad60c13c6917e7f2705b99304d06b48dd88` — reference architecture
- `67d2d2a932e0e0e4ce2b3b8dcb58cc5e6a8777fb` — repository strategy
- `f98fccfee80dd68b62c6882b7d2cb3fca56b01a5` — legacy architecture file removed after migration
- `3550475713333b39110daa0a1a40a2289f13b1b1` — legacy repository strategy removed after consolidation
- `d1f62025ebb8150e42e5a4532eb97a073ec8363b` — legacy engineering constitution removed after consolidation
- `2965c9377c846969e3d4a24c1cdf4d3750bcc91a` — legacy README removed after consolidation
- `9a9f13810bc86d4abf4d3efb101d8e1ab1a7b42e` — legacy `.gitignore` removed after consolidation

## Consolidation mapping

| Legacy material | Canonical location in `platform` | Status |
|---|---|---|
| Platform README / ecosystem definition | `README.md` | Consolidated |
| Engineering constitution | `AGENTS.md` | Consolidated and expanded |
| Reference architecture | `docs/architecture/README.md` | Consolidated and strengthened with canonical-source-of-truth rule |
| Repository strategy | `docs/governance/REPOSITORY-STRATEGY.md` | Consolidated and expanded |
| Security `.gitignore` rules | Repository security configuration | Superseded by canonical repository configuration; verify against current tree before any deletion |

## Important historical preservation rule

The legacy Git history is evidence of provenance, not an active source tree. Its historical commits must not be recreated as duplicate implementation in `platform` when the authoritative content already exists there.

## Safety rule before deleting the legacy repository

Deletion of `afaghx-afaghx/afaghx` must remain a separate GitHub administrative action after:

1. This consolidation record is reviewed.
2. The canonical files in `platform` are verified.
3. Required Git history/provenance has been recorded.
4. No active branch, PR, release, workflow, deployment, webhook, or external reference still depends on the legacy repository.
5. A final repository-level backup/export is retained if historical recovery is required.

Until those checks are complete, the legacy repository should be frozen rather than deleted.
