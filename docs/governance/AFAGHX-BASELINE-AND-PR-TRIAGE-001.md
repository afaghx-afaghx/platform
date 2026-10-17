# AFAGHX Baseline and Open-PR Triage — AFX-BASELINE-001

**Status:** CANDIDATE / REVIEW REQUIRED  
**Snapshot date:** 2026-10-17  
**Canonical repository:** `afaghx-afaghx/platform`  
**Canonical main SHA at inventory time:** `15f266a1ff3fc1c52c169c8922ea09278142d960`

## Decision

This phase establishes a reviewable baseline; it does not authorize bulk merge or bulk closure. No PR may be considered accepted merely because it is open, old, green on another SHA, or described as complete in its body.

## Verified inventory scope

The GitHub open-PR API was read across both pages (`per_page=100`): **133 unique open PRs**. The detailed metadata-first inventory is `.ai/governance/pr-triage-manifest.json`.

### PRs by workstream (heuristic, must be confirmed)

| Workstream | Count |
|---|---:|
| AFX_CORE_SECURITY | 68 |
| PLATFORM_INFRASTRUCTURE_RUNTIME | 42 |
| AI_ENGINEERING_GOVERNANCE | 16 |
| GENERAL_FOUNDATION | 3 |
| EXPERIENCE_AND_MODULES | 3 |
| ARCHITECTURE_AND_GOVERNANCE | 1 |

### Recommended triage state

| Triage class | Count |
|---|---:|
| STALE_DRAFT_DECISION_REQUIRED | 39 |
| STALE_CANDIDATE_REVALIDATE | 31 |
| STACKED_BRANCH_DEPENDENCY | 30 |
| AGING_REVIEW | 19 |
| CURRENT_WINDOW_REVIEW | 10 |
| DRAFT_HOLD_FOR_OWNER_DECISION | 3 |
| EXPLICIT_SUPERSESSION_REVIEW | 1 |

### Priority (initial, heuristic)

| Priority | Count |
|---|---:|
| P0_BLOCKER_OR_PRODUCTION_RISK | 63 |
| P1_SECURITY_FOUNDATION | 37 |
| P2_GOVERNED_ENGINEERING | 15 |
| P1_RUNTIME_FOUNDATION | 11 |
| P3_BACKLOG_TRIAGE | 3 |
| P2_EXPERIENCE | 3 |
| P3_STALE_DRAFT_DECISION | 1 |

## Known classification limits

- All 133 rows have owner/branch/SHA/dates/draft/base/size metadata captured.
- The inventory **does not claim** a line-by-line technical diff audit of all 133 PRs.
- CI and independent review columns are deliberately `NOT_AUDITED_IN_THIS_INVENTORY`; fetch and verify them on the exact current PR head during disposition.
- Area and priority come from title/body keyword heuristics. The human maintainer must confirm the classification and accountable owner.
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
