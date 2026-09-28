# ADR-003: AFAGHX Machine Score Formula v1

- **Status:** Proposed
- **Date:** 2026-09-28
- **Branch:** `feat/machine-score-v1`
- **Base main SHA:** `15a23125052fe511714f1e5a3ff3f4698752fef7`

## Context

AFAGHX requires a machine-defined score that is reproducible, auditable, evidence-bound, CI-integrated, and independent of subjective human scoring.

The supplied scoring mandate defines exactly 14 gates, a fixed 100-point weight table, evidence requirements, three scoring modes (`controls`, `runtime_proof`, `binary`), a normalized 0-10 total, and a binary Final Gate.

The existing `main` branch contains no `docs/scoring/` implementation and no machine-score branch. The score-engine work therefore starts from the actual `main` commit recorded above.

## Decision recorded by this ADR

Record the supplied v1.0.0 weight table verbatim in:

`docs/scoring/weights.yml`

The table contains exactly 14 gates and sums to 100. Future weight changes require a new ADR and version bump.

This ADR does **not** authorize any merge to `main`, does **not** implement the score engine, and does **not** alter the supplied weights or stated formulas.

## Weight integrity check

The supplied weights sum to:

`10 + 10 + 15 + 5 + 5 + 5 + 5 + 5 + 5 + 5 + 5 + 10 + 10 + 15 = 100`

Therefore the weight-table total is valid.

## Baseline arithmetic discrepancy

The supplied baseline section states:

`TOTAL_SCORE = 7.38 / 10`

Using the supplied gate scores and the supplied weights exactly, with no intermediate rounding:

- G1 = 10.0 × 0.10 = 1.000
- G2 = 10.0 × 0.10 = 1.000
- G3 = 1.5 × 0.15 = 0.225
- G4 = 10.0 × 0.05 = 0.500
- G5 = 10.0 × 0.05 = 0.500
- G6 = 10.0 × 0.05 = 0.500
- G7 = 10.0 × 0.05 = 0.500
- G8 = 10.0 × 0.05 = 0.500
- G9 = 9.0 × 0.05 = 0.450
- G10 = 9.0 × 0.05 = 0.450
- G11 = 9.0 × 0.05 = 0.450
- G12 = 0.0 × 0.10 = 0.000
- G13 = 3.0 × 0.10 = 0.300
- G14 = 0.0 × 0.15 = 0.000

Exact total:

`6.375 / 10`

Two-decimal presentation:

`6.38 / 10`

Accordingly, `7.38` is not reproducible from the supplied baseline inputs. The scoring implementation must not fabricate or silently correct this discrepancy.

## Consequence

Day 1 establishes the weight-table artifact and records the arithmetic discrepancy as evidence. The discrepancy remains an explicit validation condition for the later Score Engine and CI gates.

No manual override, hidden adjustment, weight mutation, or rounding workaround is permitted.

## Evidence

- Base commit: `15a23125052fe511714f1e5a3ff3f4698752fef7`
- Weight-table artifact: `docs/scoring/weights.yml`
- Working branch: `feat/machine-score-v1`

## Next non-blocking work

The subsequent implementation phase may proceed on the branch using the supplied formula contract, while the baseline-target discrepancy remains visible and machine-testable. No merge to `main` is authorized by this ADR.
