# AFAGHX Baseline and Open-PR Triage — AFX-BASELINE-001

**Status:** CANDIDATE / REVIEW REQUIRED  
**Snapshot date:** 2026-10-17  
**Canonical repository:** `afaghx-afaghx/platform`  
**Canonical main SHA at inventory time:** `15f266a1ff3fc1c52c169c8922ea09278142d960`

## Decision

This phase establishes a reviewable baseline; it does not authorize bulk merge or bulk closure. No PR may be considered accepted merely because it is open, old, green on another SHA, or described as complete in its body.

## Verified inventory scope

The GitHub open-PR API was read across both pages (`per_page=100`): **133 unique open PRs**. The detailed metadata-first inventory is `.ai/governance/pr-triage-manifest.json`.

### PRs by workstream (title-based heuristic, must be confirmed)

| Workstream | Count |
|---|---:|
| AFX_CORE_SECURITY | 42 |
| AI_ENGINEERING_GOVERNANCE | 33 |
| EXPERIENCE_AND_MODULES | 17 |
| GENERAL_FOUNDATION | 16 |
| ARCHITECTURE_AND_GOVERNANCE | 14 |
| PLATFORM_INFRASTRUCTURE_RUNTIME | 10 |
| DOMAIN_AND_INTELLIGENCE | 1 |

### Recommended triage state

| Triage class | Count |
|---|---:|
| STALE_DRAFT_DECISION_REQUIRED | 49 |
| STALE_CANDIDATE_REVALIDATE | 31 |
| STACKED_BRANCH_DEPENDENCY | 19 |
| AGING_REVIEW | 19 |
| CURRENT_WINDOW_REVIEW | 10 |
| DRAFT_HOLD_FOR_OWNER_DECISION | 4 |
| EXPLICIT_SUPERSESSION_REVIEW | 1 |

### Priority (title-based initial heuristic)

| Priority | Count |
|---|---:|
| P1_SECURITY_FOUNDATION | 42 |
| P2_GOVERNED_ENGINEERING | 33 |
| P3_STALE_TRIAGE | 30 |
| P2_EXPERIENCE | 17 |
| P1_PLATFORM_RUNTIME | 9 |
| P3_BACKLOG_TRIAGE | 1 |
| P0_PRODUCTION_OR_SECURITY_BLOCKER | 1 |

## Known classification limits

- All 133 rows have owner/branch/SHA/dates/draft/base/size metadata captured.
- The inventory **does not claim** a line-by-line technical diff audit of all 133 PRs.
- CI and independent review columns are deliberately `NOT_AUDITED_IN_THIS_INVENTORY`; fetch and verify them on the exact current PR head during disposition.
- Primary workstream and priority use title-based keyword heuristics; potential-overlap clusters and stacked branches are review prompts, not duplicate findings. A human maintainer must confirm classification and accountable owner.
- The manifest detects base branches that exactly match the head ref of another open PR where that relation can be mapped. Other dependency relationships remain to be established from changesets and contracts.
- No PR has been merged or closed by this inventory.
- Current-main and current-head SHAs must be re-read before each decision; this manifest is a timestamped snapshot.

## Triage workflow — mandatory order

1. **Normalize scope:** map each PR to an internal module, Experience entrypoint, shared platform/security control, or governance artifact.
2. **Resolve base dependencies:** a PR whose base branch is not `main` is a stacked candidate; identify and approve the base PR first.
3. **Detect replacement/overlap:** search explicit supersedes references, Gate IDs, changed-file overlap, duplicated acceptance scope and conflicting source-of-truth edits. A suspected duplicate is not auto-closed.
4. **Revalidate against canonical main:** compare merge-base and changed files; rebase only after conflict/scope review. Never trust checks from a prior SHA.
5. **Verify acceptance evidence:** required CI green on exact HEAD, security/contract/test scans, review, evidence provenance/freshness/integrity, and runtime checks when applicable.
6. **Make a disposition:** merge only when every applicable merge gate passes; otherwise keep active with named owner and concrete blocker, or close only after proving its unique scope/evidence is retained elsewhere.
7. **Publish audit trail:** record the decision, reviewer/owner, absorbed PR or commit, exact SHA, CI URLs, tests and evidence hashes.

## Official module acceptance source

The structured mapping is `.ai/governance/module-acceptance-manifest.json`. It preserves the canonical distinction between:

- **18 internal architecture modules** in `.ai/architecture/module-map.yaml`;
- **18 public Experience entrypoints** in `experience/module-registry.json` (main + 17 modules, including the shared API spine).

They are not interchangeable registries. Existing runtime matrix `experience/module-runtime-matrix.json` remains the source of detailed runtime acceptance and must not be overwritten with inferred success.

Each module record includes technical ownership boundary, layer dependencies, required acceptance checks, test-command mapping status and evidence state. Accountable human/team owner and unmapped intra-layer dependencies are explicitly flagged rather than invented. Module-specific tests must be executable and machine-verifiable.

## Mandatory module completion criteria

- Architecture and dependency boundary conforms to `AGENTS.md` and the approved master architecture.
- Data/domain ownership and versioned API/event contracts are explicit.
- AFX-CORE remains the sole security authority; tenant isolation and deny-by-default authorization are tested.
- Threat model/security tests, contract validation, secret scan and dependency scan pass.
- Module-specific tests and CI evidence correspond to the exact candidate SHA.
- Observability, documentation and ADR are present when applicable.
- Independent review is recorded.
- Runtime modules additionally provide raw DNS/TLS/HTTP, served identity, canonical API, tenant/RBAC, and deployed-SHA evidence.
- Missing, stale, mocked, unsigned or SHA-mismatched required evidence leaves state RED/UNKNOWN.

## Merge / close rules

**Merge only:** mapped acceptance criteria + dependencies resolved + exact-head required CI green + independent review + fresh verifiable evidence + release/rollback controls for production changes.

**Close only:** a canonical replacement is identified; all unique requirements/tests/docs/evidence are retained or explicitly superseded; dependent branches are handled; no acceptance coverage is lost; decision owner is recorded.

## Snapshot and next action

This inventory is a candidate governance artifact on branch `governance/afx-baseline-triage-2026-10-17`. It should enter normal PR review and validation. It does not modify `main`, change production state, or promote any module/control to GREEN/PROVEN.

## Changed-file overlap audit (GitHub API snapshot)

The changed-filename endpoint was queried for **all 133 open PRs**; all 133 succeeded. Detailed normalized records live in `.ai/governance/pr-changed-files-inventory.json`; pairwise analysis lives in `.ai/governance/pr-overlap-report.json`.

| Measured item | Result |
|---|---:|
| PRs with changed-file lists fetched | 133/133 |
| Unique changed paths | 981 |
| Paths touched by 2+ open PRs | 353 |
| PR pairs sharing ≥1 path | 1288 |
| PRs participating in any path overlap | 116 |

### Highest-overlap examples requiring diff-level disposition

| PR pair | Shared paths | Decision use |
|---|---:|---|
| [#198](https://github.com/afaghx-afaghx/platform/pull/198) / [#200](https://github.com/afaghx-afaghx/platform/pull/200) | 75 | Shared files; inspect exact diff before disposition |
| [#6](https://github.com/afaghx-afaghx/platform/pull/6) / [#7](https://github.com/afaghx-afaghx/platform/pull/7) | 72 | Shared files; inspect exact diff before disposition |
| [#71](https://github.com/afaghx-afaghx/platform/pull/71) / [#76](https://github.com/afaghx-afaghx/platform/pull/76) | 50 | Shared files; inspect exact diff before disposition |
| [#220](https://github.com/afaghx-afaghx/platform/pull/220) / [#221](https://github.com/afaghx-afaghx/platform/pull/221) | 33 | Same topic cluster; compare scope and acceptance |
| [#21](https://github.com/afaghx-afaghx/platform/pull/21) / [#23](https://github.com/afaghx-afaghx/platform/pull/23) | 30 | Shared files; inspect exact diff before disposition |
| [#3](https://github.com/afaghx-afaghx/platform/pull/3) / [#6](https://github.com/afaghx-afaghx/platform/pull/6) | 29 | Shared files; inspect exact diff before disposition |
| [#3](https://github.com/afaghx-afaghx/platform/pull/3) / [#7](https://github.com/afaghx-afaghx/platform/pull/7) | 29 | Shared files; inspect exact diff before disposition |
| [#36](https://github.com/afaghx-afaghx/platform/pull/36) / [#37](https://github.com/afaghx-afaghx/platform/pull/37) | 29 | Shared files; inspect exact diff before disposition |
| [#184](https://github.com/afaghx-afaghx/platform/pull/184) / [#198](https://github.com/afaghx-afaghx/platform/pull/198) | 26 | Shared files; inspect exact diff before disposition |
| [#184](https://github.com/afaghx-afaghx/platform/pull/184) / [#200](https://github.com/afaghx-afaghx/platform/pull/200) | 26 | Shared files; inspect exact diff before disposition |
| [#4](https://github.com/afaghx-afaghx/platform/pull/4) / [#6](https://github.com/afaghx-afaghx/platform/pull/6) | 25 | Same topic cluster; compare scope and acceptance |
| [#4](https://github.com/afaghx-afaghx/platform/pull/4) / [#7](https://github.com/afaghx-afaghx/platform/pull/7) | 25 | Shared files; inspect exact diff before disposition |
| [#20](https://github.com/afaghx-afaghx/platform/pull/20) / [#21](https://github.com/afaghx-afaghx/platform/pull/21) | 25 | Shared files; inspect exact diff before disposition |
| [#20](https://github.com/afaghx-afaghx/platform/pull/20) / [#23](https://github.com/afaghx-afaghx/platform/pull/23) | 25 | Shared files; inspect exact diff before disposition |
| [#19](https://github.com/afaghx-afaghx/platform/pull/19) / [#20](https://github.com/afaghx-afaghx/platform/pull/20) | 21 | Shared files; inspect exact diff before disposition |

**Interpretation:** path intersection is a concrete signal for joint review, not proof that PRs are duplicates or that Git has a conflict. Decisions to close or merge must preserve unique code, requirements, tests and evidence.

## Snapshot and next action

This inventory is a candidate governance artifact on branch `governance/afx-baseline-triage-2026-10-17`. It does not modify `main`, change production state, or promote any module/control to GREEN/PROVEN.
