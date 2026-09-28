# ADR-004: Scoring Weight Table Integrity Block

- **Status:** Superseded by ADR-005
- **Date:** 2026-09-28
- **Scope:** AFAGHX Machine Score Engine v1

## Finding

Machine execution of `docs/scoring/weights.yml` detected actual weight sum `110`, while the file declares `sum_weights: 100`.

The 14 listed weights violate the mandatory 100-point invariant.

## Enforcement

The Score Engine MUST fail closed.

Automation MUST NOT choose which weight to change.

Automation MUST NOT normalize 110 to 100 because that would change the canonical formula.

## Required governance action

An owner-approved correction must establish an internally consistent v1 weight table.

Any actual weight change requires:
1. a new ADR;
2. a version bump;
3. an updated lock digest.

## Current gate state

Machine Score = NOT GENERATED
FINAL GATE = NOT PROVEN
Release = NOT READY

## Non-blocking continuation

The following may continue independently:

- Evidence contract
- Evidence verification
- Score Engine code
- Score output generation
- CI wiring
- test harness
- dashboard generation
- artifact generation

No component may bypass the weight-integrity gate.
