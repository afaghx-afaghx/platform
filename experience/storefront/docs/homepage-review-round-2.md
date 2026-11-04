# AFAGHX Homepage — Independent Review Readiness (Round 2)

**Disposition:** BLOCKED — DO NOT MERGE / DO NOT DEPLOY  
**Review candidate before this report:** `9b9c3acae640805658dab88c396843712f55ad15`  
**PR:** [#288](https://github.com/afaghx-afaghx/platform/pull/288)  
**Purpose:** Record evidence separately from assumptions and prevent a successful build from being mistaken for design or security approval.

## Evidence snapshot

| Evidence | Observed result | What it proves | What it does not prove |
|---|---|---|---|
| Storefront Experience Gate run [41513778435](https://github.com/afaghx-afaghx/platform/actions/runs/41513778435) | Success | Contract/taxonomy tests, TypeScript, ESLint, production build, route smoke checks and browser checks completed successfully for the recorded candidate | Independent architecture/security approval or a 9.8/10 visual score |
| Visual artifact [13174706911](https://github.com/afaghx-afaghx/platform/actions/runs/41513778435) | Uploaded; SHA-256 `697938dd852c965d0b1ef707f9405ffaa3ca0cc32ba61eb83cd83583075f7f27` | A review artifact exists for the recorded candidate | That every screenshot has been manually approved |
| PR review submissions | None recorded at audit time | No submitted review is available as evidence | Approval |
| Inline review threads | None recorded at audit time | No inline review findings are available as evidence | Approval |
| Central Core reference architecture | Explicitly proposed in PR documentation | Architecture intent is documented | Runtime enforcement, security correctness or independent approval |

## Round-2 visual findings

These are qualitative findings, not a numeric score:

1. **Identity and positioning — promising, not approved.** The hero and ecosystem overview communicate industry, suppliers, procurement, global trade and consumer commerce as distinct journeys.
2. **Information density — needs focused review.** The header/search/navigation stack and the number of page sections compete for attention. Inspect the first viewport at 1024 px and 390 px, prioritizing one primary action per audience.
3. **Mobile page rhythm — needs focused review.** The full page is long by design because it contains the ecosystem overview, procurement path, product discovery, advertising disclosure and the canonical basket directory. Length alone is not a defect; repetitive spacing, tiny text, card compression or excessive scrolling to reach key tasks are defects to measure and correct.
4. **Trust and data integrity — partial by design.** The implementation discloses preview-only RFQ/advertising capabilities and target architecture. Keep those disclosures adjacent to the relevant actions; do not present sample catalog records as live inventory.
5. **Architecture/security — blocked.** CI passing is not an independent security review. A qualified reviewer must inspect authorization boundaries, tenant isolation, server-side enforcement, data provenance and preview/live separation, then submit a review against the exact final SHA.

## Mandatory evidence matrix for the next SHA

Capture and inspect all combinations below from the same exact commit:

- Persian RTL: 1440×1000, 1024×768, 768×1024, 390×844.
- English LTR: 1440×1000, 1024×768, 768×1024, 390×844.
- Verify no horizontal overflow, clipped controls, broken images, wrong direction, unreadable labels or focus obscured by scroll containers.
- Exercise the canonical routes: home, products, suppliers, factories, business network, markets and intelligence.
- Exercise search, category selection, featured tabs, product details, cart, RFQ preview and advertising preview.
- Save artifact URL, artifact digest, exact commit SHA, test result and reviewer findings. A screenshot capture is evidence of rendering, not proof of visual quality.

## Scoring protocol

Do **not** assign a final score until all eight rubric dimensions are independently rated with written reasons and screenshot/test references. Apply the existing weighted rubric in `homepage-design-release-rubric.md`.

Release requires all of the following on one exact final SHA:

- Weighted score ≥ 9.8/10.
- Every dimension ≥ 9.5/10.
- Zero unresolved critical/high-severity defects.
- All required locale/viewport/interaction checks pass.
- Independent Architecture and Security review is accepted.
- No merge or deployment before the above conditions are evidenced.

## Open blockers

- [ ] Correct any specific visual defects found in the new exact-SHA screenshot set.
- [ ] Record the weighted scorecard with evidence per dimension.
- [ ] Obtain an independent Architecture review.
- [ ] Obtain an independent Security review.
- [ ] Re-run the complete gate after the final remediation commit.
- [ ] Re-check PR head SHA, CI results, artifacts and review state immediately before any release decision.

**Current score: NOT SCORED.** Assigning 10/10 before these gates pass would be unsupported.
