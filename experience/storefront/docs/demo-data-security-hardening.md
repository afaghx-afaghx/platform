# Storefront Demo Data and Security Hardening

Date: 2026-11-11
Branch: `fix/homepage-data-security-hardening`
Base: PR #290 head `363b2ee0c61f2d9e529254186d62832fe6ca29d5`

## Objective

Prevent seeded demonstration records from being represented as verified commercial offers. Keep this work isolated from Main and from the original PR branches.

## Implemented in this branch

- Added an optional `Product.commercialStatus` discriminator.
- Marked every seeded record in `catalog.ts` as `demo`.
- Product cards visibly disclose that demo records are not verified offers.
- Product cards suppress seeded prices, discounts, ratings, review counts, delivery claims and cart actions for demo records.
- Product detail dialogs disclose demo status and suppress the same unverified commercial claims and purchase actions.
- Search sorting ranks only verified records by price/rating/review data; demo records remain in a stable localized title order.
- Featured deals, best-seller and recommendation rails are populated only from verified records.
- Persisted demo/unknown cart lines are excluded from cart totals and removed from the client cart projection.
- Deal-only and commercial sort controls are disabled when the visible result set contains no verified products.
- The legacy `/products` runtime also excludes demo records from deals, best-seller and recommendation collections; its hero suppresses unverified product prices, category cards label sample imagery, and its cart badge ignores demo lines.
- Browser smoke coverage now checks demo card disclosures, hidden prices/ratings/purchase controls, detail-dialog safeguards and empty-cart behavior.
- Corrected low-contrast category notice text from translucent white on a white background to slate text.

## Important safety invariant

A record is treated as demo unless `commercialStatus === 'verified'`. A future verified state must only be assigned by an authoritative, server-controlled source after seller identity, product identity, current price, inventory, rating provenance, delivery terms and image-use rights are validated. A client-provided flag must never authorize commercial claims.

## Remaining work — not yet verified

1. Add runtime/component tests proving demo records cannot expose commercial claims or purchase actions; the current structural checks are not a substitute for behavior tests.
2. Review every product rendering surface, including API search response normalization, recently viewed, both homepage runtimes, search results, featured rails, category pages, dialogs, cart, checkout entry points and structured metadata, for leakage of demo claims.
3. Review product image files and provenance; a local image path is not evidence of authorization or authenticity.
4. Extend `audit-storefront.mjs` to validate all 36 category routes plus invalid IDs and image-file existence/alt text/fallback behavior.
5. Inspect external scripts, fonts, image origins, inline styles, analytics and Next.js runtime behavior before authoring a restrictive CSP. Do not add a guessed CSP that may break the app or weaken security through broad wildcards.
6. Verify HSTS only on the actual HTTPS production edge. Verify response headers against the deployed domain; Next config alone is not production evidence.
7. Run exact-head typecheck, lint, unit/contract tests, production build, browser tests, accessibility checks and security scans.
8. Obtain independent security review.

## Current limitations

- The catalogue remains a synthetic demo dataset. Its descriptions, brands, specifications, images, prices, ratings and stock figures are not authoritative commercial facts.
- Hiding prices and purchase controls in the storefront is a presentation safeguard, not a backend authorization boundary.
- The current storefront does not establish production checkout or payment capability.
- No CSP or HSTS change is claimed in this branch; both require environment-specific verification.

## Release rule

This branch is not approved for merge or deployment until all remaining controls are completed and evidence is linked to its exact final SHA. Main remains unchanged.
