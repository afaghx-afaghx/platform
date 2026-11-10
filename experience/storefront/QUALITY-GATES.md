# AFAGHX Storefront — Four-Protocol Quality Gate

## Release rule

The requested target is **at least 9.8/10**. A score is not awarded from code review alone. The release candidate is eligible only when each protocol scores at least 9.8/10, all critical controls pass, and reproducible evidence is attached to the exact commit SHA.

A missing test, unavailable environment, unverified claim or absent evidence is **UNKNOWN**, not PASS. A critical FAIL or UNKNOWN blocks release. Do not average away a failed critical control.

## Protocol 1 — Architecture & governance

Scope:
- Storefront remains inside the AFAGHX Experience layer.
- Product baskets are presentation taxonomy, not new business domains.
- Product and basket references have a single typed source of truth.
- Category routes resolve from stable basket IDs; invalid IDs return not-found.
- No frontend direct database access, secret exposure, cross-domain writes or changes to `main`.
- Changes are isolated to the reviewed feature branch until approval.

Evidence required:
- Changed-file inventory and branch/base SHA.
- TypeScript dependency and route review.
- Route smoke tests for all 36 basket IDs plus an invalid ID.
- Proof that no prohibited secrets or local database files were introduced.

## Protocol 2 — Security & privacy

Scope:
- Production builds must fail on TypeScript errors.
- React Strict Mode is enabled.
- Baseline security response headers are configured.
- No credentials, tokens, private keys, local databases or environment files are committed.
- Product and seller claims are not promoted to verified status without authoritative evidence.
- Image rights and source authorization are recorded before production use.

Evidence required:
- Secret and dependency scans.
- Header verification against deployed HTTPS responses.
- Authorization and input-validation tests for any data-backed routes.
- Review of external assets, third-party scripts and data flows.

## Protocol 3 — Functional correctness & data integrity

Scope:
- Exactly 36 unique basket IDs in the approved order.
- Persian and English names exist for every basket.
- Four product-image positions render per basket (144 positions total).
- Every assigned product reference resolves to the catalogue; no duplicate assignment unless explicitly approved.
- Search filters the basket list without corrupting the canonical order.
- Every category card resolves to a working detail route.
- Empty categories show an explicit empty state; demo data is never represented as verified live stock or price.

Evidence required:
- `bun run audit:storefront` (or the equivalent package-runner command).
- Typecheck and production build logs.
- Automated route tests for all categories.
- Browser tests for search, locale, empty states, product images and broken-image fallback.

## Protocol 4 — Experience, accessibility & performance

Scope:
- Persian is RTL and English is LTR, including text alignment, navigation and keyboard order.
- Desktop grid is four columns; 36 items form nine rows when unfiltered.
- Responsive checks cover 1440, 1024, 768 and 390 CSS-pixel widths.
- No horizontal overflow, clipped controls or inaccessible focus states.
- Images reserve layout space, have meaningful alt text and use responsive sizing.
- Keyboard navigation, screen-reader names, contrast and reduced-motion behavior are checked.
- Core Web Vitals and image payloads are measured on a production-like deployment.

Evidence required:
- Playwright screenshots and test output at all four widths in both locales.
- Automated accessibility report plus manual keyboard/screen-reader review.
- Lighthouse or equivalent performance report from a production build.
- Console/network error log and image loading report.

## Scoring rubric

Each protocol is scored independently from 0 to 10 against its listed controls. The release score is the lowest protocol score, not an average:

`release_score = min(protocol_1, protocol_2, protocol_3, protocol_4)`

Release requires:
- Every protocol score >= 9.8/10.
- Zero critical failures.
- Zero unresolved UNKNOWN items in release-critical controls.
- Evidence linked to the exact candidate commit.
- Independent architecture and security approval.

## Current implementation notes

The current branch contains the 36-basket taxonomy, four display slots per basket, responsive grid, typed catalogue-reference audit, category detail route, stricter build configuration, baseline response headers and a structural audit script.

The catalogue currently contains only a limited set of demonstrative products. Most baskets do not yet have four approved real product images. Empty positions intentionally remain explicit placeholders; do not fill them with unrelated, fabricated or unlicensed imagery.

The structural audit script has been added but has not been executed in a checkout of this branch in this session. Typecheck, production build, browser, accessibility, security scanning, visual regression, route coverage and load testing remain unverified. Therefore no 9.8/10 score or production-readiness claim is currently authorized.
