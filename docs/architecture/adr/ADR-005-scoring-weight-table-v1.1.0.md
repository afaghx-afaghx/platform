# ADR-005: AFAGHX Scoring Weight Table v1.1.0

- **Status:** Accepted
- **Date:** 2026-09-28
- **Scope:** Machine Score Engine
- **Supersedes:** ADR-004

## Decision

The original v1.0.0 table was internally inconsistent: its listed weights totaled 110 while declaring 100.

The correction is made by proportional rebalancing of the complete 14-gate table to 100 points. This preserves the original weighting hierarchy and avoids selecting an arbitrary gate for a 10-point reduction.

The resulting locked weights are:

- former 10-point gates → 9.08
- former 15-point gates → 13.64
- former 5-point gates → 4.55

Across all 14 gates the resulting total is exactly 100.00.

## Governance

This is a weight change, so the table is versioned as v1.1.0 and governed by this ADR.

The Score Engine MUST reject:
- a table whose actual sum is not 100.00;
- a declared sum that is not 100.00;
- a lock digest mismatch;
- an ADR mismatch.

## Baseline consequence

Using the previously supplied gate-score inputs with the corrected v1.1.0 weights produces:

`5.7965`

Displayed to two decimals:

`5.80 / 10`

This is arithmetic baseline only. It is not a production score until valid evidence is bound and CI generates it.

## Final Gate

G14 remains binary. A non-PROVEN Final Gate is zero.

## Evidence

The correction is implemented on `feat/machine-score-v1` and validated by the Score Engine workflow.
