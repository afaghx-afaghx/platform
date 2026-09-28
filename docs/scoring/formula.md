# AFAGHX Machine Score Formula v1

## Integrity gate

The engine verifies all of the following before scoring:

- exactly 14 gates are present;
- declared `sum_weights` equals 100;
- actual weight sum equals 100;
- locked SHA-256 matches `docs/scoring/weights.lock.json`.

Current supplied table:

Declared sum: 100
Actual sum: 110
Result: INVALID

The engine therefore fails closed and does not generate a normalized score.

## Calculation

Controls:
`10 × ((DONE × 1.0) + (IN_PROGRESS × 0.3)) / TOTAL`

Runtime proof:
`10 × ((PROVEN × 1.0) + (PARTIAL × 0.3)) / TOTAL_SURFACES`

Binary:
`10` only when `PROVEN=true`, otherwise `0`.

Total:
`Σ(GATE_SCORE × WEIGHT) / 100`

No manual override exists.
