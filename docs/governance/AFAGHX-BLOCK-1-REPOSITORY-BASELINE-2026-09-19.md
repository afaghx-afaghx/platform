# AFAGHX Block 1 — Repository Baseline

**Baseline date:** 2026-09-19  
**Repository:** `afaghx-afaghx/platform`  
**Baseline commit:** `1d53c964444f485d93fbabd7bf09e7b4e5315f20`  
**Default branch:** `main`  
**Baseline branch:** `governance/block1-baseline`

## Purpose

This document records the repository state verified before Block 2 engineering work. It is evidence, not a release declaration.

## 1. Governance

- `AGENTS.md` is present and defines the AFAGHX Engineering Constitution.
- `docs/architecture/AFX-ARCHITECTURE-100-LOCK.md` is present and marked LOCKED.
- `docs/architecture/adr/ADR-001-canonical-architecture-baseline.md` is accepted.
- `.ai/command-center.yaml` defines evidence-first operation, protected `main`, pull-request-only execution, and human review before merge.
- A repository ruleset named `afaghx-afaghx/platform` is active.
- Direct branch-protection details could not be independently read through the connected GitHub integration; therefore no stronger claim is made here.

## 2. Canonical repository

The repository is the declared canonical mother repository and Source of Truth for AFAGHX.

The verified HEAD is:

`1d53c964444f485d93fbabd7bf09e7b4e5315f20`

Commit subject:

`feat: implement AFAGHX reference commerce header`

## 3. Architecture baseline

The repository contains the declared major boundaries:

- `core/` — AFX-CORE
- `platform/` — shared platform capabilities
- `domains/` — bounded business capabilities
- `intelligence/` — governed intelligence
- `experience/` — user-facing applications
- `infrastructure/` — runtime/infrastructure boundary
- `database/` — database tooling/migrations
- `tests/` — cross-cutting validation
- `docs/` — architecture/security/contracts/operations
- `.github/` — CI and governance
- `.ai/` — AI engineering control-plane policy

The repository also contains AFX-CORE persistence/security implementation and Experience test/runtime assets.

## 4. CI / deployment evidence

The latest observed main-branch GitHub Pages run for the baseline commit was:

- Workflow: `AFAGHX Pages`
- Run: `35377221422`
- Result: `completed / success`
- Trigger: push to `main`

This is Pages evidence only. It is not evidence that G01 or production security is closed.

## 5. Security gate / Domain Freeze

`docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md` is present.

Verified current gate state:

**GATE 01 = RED / OPEN**

The matrix explicitly reports:

- DONE: G01-01 through G01-09
- IN PROGRESS: G01-10 through G01-19, G01-21 through G01-24, G01-26
- BLOCKED: G01-20 and G01-25

The matrix states that **Domain Freeze is ACTIVE** until Gate 01 passes.

Therefore this baseline does not authorize Domain expansion.

## 6. Open work visible at baseline

The repository currently has open pull requests including:

- PR #103 — English header refinement
- PR #102 — manual GitHub Pages deployment

These are recorded as repository state and are not treated as approved work by this baseline.

## 7. AI governance

The repository currently contains an AI provider registry with multiple provider entries. This baseline records the repository state only; it does not grant any provider architecture or release authority.

The repository's own AI control-plane policy states that AI does not become the security, architecture, merge, or production deployment authority.

## 8. Baseline decision

Block 1 baseline is **ESTABLISHED AS AN EVIDENCE RECORD**, but Block 1 is **not GREEN**.

Reason: the security closure matrix is explicitly RED/OPEN and Domain Freeze is active.

### Gate to Block 2

Block 2 may begin only under the existing freeze rule and only for:

- Canonical Runtime
- AFX-CORE authentication/security closure
- PostgreSQL persistence
- G01 controls
- required tests
- CI/evidence
- required architecture/security documentation

No new business-domain expansion is authorized by this baseline.
