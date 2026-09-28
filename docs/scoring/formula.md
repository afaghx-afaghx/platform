# AFAGHX Machine Score Formula v1

Controls:
`10 × ((DONE × 1.0) + (IN_PROGRESS × 0.3)) / TOTAL`

Runtime proof:
`10 × ((PROVEN × 1.0) + (PARTIAL × 0.3)) / TOTAL_SURFACES`

Binary:
`10` only when `PROVEN=true`, otherwise `0`.

Total:
`Σ(GATE_SCORE × WEIGHT) / 100`

MISSING evidence is always zero. INVALID evidence fails verification. No manual override exists.

The supplied baseline arithmetic is `6.375 → 6.38`; `7.38` is not reproducible.
