# Phase 0 — Foundation Governance

## Objective

Establish `afaghx-afaghx/platform` as the canonical AFAGHX Mother Repository and enforce repository, architecture, security, dependency, review, and evidence governance.

## F0 controls

| ID | Control | Status | Evidence |
|---|---|---|---|
| F0.1 | Canonical repository / Source of Truth | DONE | `docs/architecture/README.md` |
| F0.2 | Main branch protected / PR-only | BLOCKED | Requires GitHub branch protection/ruleset mutation outside available repository-content tooling |
| F0.3 | CODEOWNERS | DONE | `/CODEOWNERS` |
| F0.4 | SECURITY.md | DONE | `/SECURITY.md` |
| F0.5 | Pull request template | DONE | `/.github/pull_request_template.md` |
| F0.6 | Issue template | DONE | `/.github/ISSUE_TEMPLATE/security.md` |
| F0.7 | Dependabot | DONE | `/.github/dependabot.yml` |
| F0.8 | Security/dependency CI checks | IN PROGRESS | Gate workflow and security checks remain to be verified on GitHub Actions |
| F0.9 | Architecture / ADR governance | IN PROGRESS | Architecture rules exist; ADR operating process must be completed |
| F0.10 | Governance CI gate | IN PROGRESS | Requires real successful Actions run and enforceable branch rule |

## Non-negotiable rules

1. `main` is the protected integration branch.
2. Production changes enter through reviewed pull requests.
3. AFX-CORE is the centralized identity, authentication, authorization, tenant, policy, and trust foundation.
4. Domain services do not create independent authentication authorities.
5. Contracts are explicit and versioned.
6. Secrets never enter source control.
7. Security-sensitive changes require implementation, test, CI, and artifact evidence.
8. Destructive migrations require rollback planning and review.
9. Architecture changes require an ADR when they alter a non-negotiable boundary or cross-service contract.
10. A green test suite alone does not make a security gate green.

## Exit criteria

Phase 0 is GREEN only when all F0 controls are DONE, including enforceable main-branch protection and a successful governance/security CI execution. Until then, Phase 0 remains OPEN.
