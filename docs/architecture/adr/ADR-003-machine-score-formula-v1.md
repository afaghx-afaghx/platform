# ADR-003: AFAGHX Machine Score Formula v1

- **Status:** Superseded by ADR-004
- **Date:** 2026-09-28
- **Branch:** `feat/machine-score-v1`
- **Base main SHA:** `15a23125052fe511714f1e5a3ff3f4698752fef7`

## Context

AFAGHX requires a machine-defined score that is reproducible, auditable, evidence-bound, CI-integrated, and independent of subjective human scoring.

## Recorded artifact

The supplied weight table was copied to `docs/scoring/weights.yml`. No weight value was silently changed.

## Machine finding

Listed weights:

`10, 10, 15, 5, 5, 5, 5, 5, 5, 5, 5, 10, 10, 15`

Actual sum: `110`

Declared sum: `100`

The weight table therefore violates its own 100-point invariant.

## Baseline arithmetic

The listed baseline gate scores produce a raw weighted contribution sum of `6.375`.

However, the scoring contract requires a valid 100-point weight table. Because the current table totals 110, no normalized machine score is valid until the weight-table integrity defect is corrected through governance.

The previous `7.38` statement is not reproducible. The previous `6.38` value is only the arithmetic result of the listed gate scores treated against the listed percentages; it is not a valid normalized score under the complete contract.

## Decision

Do not mutate any locked weight value through automation.

The Score Engine fails closed whenever the actual weight sum, declared sum, and lock metadata are inconsistent.

A corrected weight table requires owner approval, a new ADR, and a version bump.

## Evidence

- Main base SHA: `15a23125052fe511714f1e5a3ff3f4698752fef7`
- Weight table: `docs/scoring/weights.yml`
- Declared sum: `100`
- Actual sum: `110`
- CI run: `36467234903`
- CI failure point: weight validation

## Consequence

Non-weight-dependent Score Engine components may continue, but a valid machine score and FINAL GATE remain unavailable until the weight table is internally consistent.
