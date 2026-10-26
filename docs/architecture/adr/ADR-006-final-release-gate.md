# ADR-006 — AFAGHX Final Release Gate

Status: Proposed
Date: 2026-09-28

## Decision

AFAGHX shall recognize a release as final only when the canonical release gate proves the complete execution chain:

Main SHA → Pages Deployment → Production URL → Browser Runtime → Final Verification.

The release gate is implemented as `AFAGHX FINAL RELEASE GATE` and executes after a successful `AFAGHX Pages` workflow on `main`.

## Mandatory proof

A final release must prove all of the following:

1. The exact released SHA is checked out and verified.
2. The canonical Pages deployment completed successfully.
3. The canonical HTTPS Pages URL returns HTTP 200.
4. The Persian homepage loads with `lang=fa` and `dir=rtl`.
5. The approved AFAGHX logo asset is present and has source dimensions 1024×341.
6. Desktop and mobile browser runtime render the logo within the locked display-height contract.
7. The homepage exposes the 34-basket surface.
8. Browser runtime screenshots are captured as evidence.
9. A release manifest is generated with `FINAL_RELEASE_PROVEN`.
10. A GitHub Release tagged from the exact main SHA is created.

## Fail-closed rule

Any failed mandatory check blocks final release creation. CI success without Pages deployment or browser-runtime proof is not a final release.

## Non-goals

This ADR does not declare backend/domain completion, machine-score completion, or production readiness beyond the exact evidence proven by the gate.
