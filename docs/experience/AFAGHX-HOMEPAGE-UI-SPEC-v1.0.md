# AFAGHX Homepage — UI Specification v1.0

**Status:** Design specification / review candidate  
**Date:** 2026-11-11  
**Repository:** `afaghx-afaghx/platform`  
**Branch:** `design/homepage-ui-spec-v1`  
**Scope:** Homepage UI/UX specification only. No application code, API implementation, database change, deployment, or production release is included.

## 1. Product decision and design intent

The homepage is the public entry point to the AFAGHX ecosystem, not a conventional single-store storefront. The design must serve personal shopping (B2C) and organizational procurement (B2B) with equal prominence while preserving one coherent AFAGHX identity.

- Visual direction: modern commercial, bright and product-led, with a restrained navy/blue foundation and orange action accent.
- Reference sites are comparison material only. AFAGHX must retain its own visual identity, information architecture, and interaction model.
- Primary outcomes: discover products and suppliers, compare trustworthy offers, enter the correct B2C or B2B journey, and understand why the platform can be trusted.
- Desktop category layout is fixed at **36 baskets = 9 rows × 4 columns**.
- Every category basket contains **exactly four independently managed product-image slots**, displayed as a 2 × 2 mini-grid. Total: **144 category-card image slots**.
- The special-products programme has **30 eligible promotional placements** and an **8-hour placement window per published promotion**. Eligibility and timing are server-governed; the browser only renders the resulting state.

## 2. Non-goals and architectural boundaries

This specification does not authorize implementation of business rules or changes to the platform architecture.

- Homepage UI belongs to the EXPERIENCE layer.
- B2C and B2B are distinct experience modes over shared, governed platform/domain contracts.
- The homepage must not connect directly to a database or own product, seller, pricing, inventory, identity, trust, or advertising eligibility truth.
- The browser must not infer or manufacture verified-seller status, five-star qualification, discount validity, stock, delivery promise, or campaign expiry.
- No cross-domain database access, domain-to-domain writes, token parsing in domain UI, or client-side tenant authorization.
- All displayed commercial facts must originate from approved API contracts and carry clear loading, unavailable, stale, and error states.

## 3. Information architecture and page order

The desktop page uses the following order. Sections may be personalized only from permitted data and must not disrupt the primary navigation or B2B/B2C entry.

1. Utility bar: language, help, support, account access.
2. Main header: AFAGHX brand, global search, favorites, cart, account.
3. Primary navigation: all categories, personal shopping, organizational procurement, special offers, top sellers, global trade, services/industry.
4. Hero: concise global-commerce proposition and two equally legible CTAs — **Personal shopping (B2C)** and **Organizational purchasing (B2B)**.
5. Special-products rail: up to 30 active eligible promotional placements; horizontal carousel with explicit promotion timing.
6. Main category section: exactly 36 category cards, 9 × 4 on desktop; four product images per card.
7. Curated discovery: best sellers, new arrivals, relevant offers; each module has a defined ranking/source label.
8. B2B entry panel: sourcing, RFQ, supplier discovery, bulk procurement. It must not be hidden below an excessive B2C-only product wall.
9. Trust and service strip: only verified platform capabilities (e.g. support, payment, delivery, returns) may be stated.
10. Footer: corporate identity, help/legal links, business services, language and social links.

## 4. Desktop layout specification

Reference viewport: **1440 × 900 CSS px**. The page must remain usable at 1280 and 1024 px widths.

- Main content max-width: 1320 px; centered.
- Desktop side gutters: 24 px minimum; section vertical spacing: 24–32 px.
- Header: utility bar 32–36 px; main header 76–88 px; navigation 44–52 px.
- Hero: target 280–320 px high; content aligned to a consistent 12-column page grid.
- Hero CTA buttons: equal visual weight; B2C uses orange primary treatment, B2B uses outlined/navy treatment. Both remain visible without scrolling at the reference viewport.
- Special-products rail: one section heading/eligibility note plus a horizontal product rail. Do not force all 30 products into a single compressed row; use carousel pagination/scroll with clear count and accessible controls.
- Category section: 4 equal columns, 16 px column/row gap. Nine rows, in the owner-approved category order.
- Category card target: 300–320 px wide at 1440 viewport; 220–250 px tall (final value validated in visual QA).
- Category card anatomy: title and optional count/chevron; 2 × 2 image grid; each image has a stable product link/accessible name. The four images must not be duplicates used to simulate four products.
- After the 36 baskets, show no more than three large discovery/commerce modules before the trust strip and footer. Avoid an endless wall of repeated cards.

## 5. Responsive behavior

| Viewport | Category columns | Behavior |
|---|---:|---|
| ≥ 1280 px | 4 | Required 9 × 4 desktop arrangement |
| 1024–1279 px | 3 | 12 visual rows; preserve all 36 categories |
| 768–1023 px | 2 | 18 visual rows; compact header and navigation |
| 360–767 px | 2 | Two-column cards; product thumbnails remain individually tappable |
| < 360 px | 1 | Single-column fallback to protect readability and touch targets |

- At mobile widths, collapse utility links into an accessible menu; keep search and B2C/B2B entry easy to reach.
- The B2B and B2C entry points must not be hidden only inside a hamburger menu.
- No horizontal page overflow at 390, 360, or 320 px. Horizontal scrolling is allowed only inside explicitly labelled carousels.
- On touch devices, carousel controls must support swipe and visible buttons; do not rely on hover.
- Test Persian RTL and English LTR independently at every target viewport. Layout direction must be semantic, not simulated with arbitrary CSS reversal.

## 6. Category-card and content rules

- Category order and Persian/English names must come from the owner-approved canonical 36-category catalogue.
- The current accessible repository/library evidence contains earlier 36-category proposals with conflicting taxonomy/order. Therefore, this specification deliberately does **not** promote any generated or historical list to canonical status.
- Until the owner-approved catalogue is attached/identified, category IDs may be reserved as CAT-01…CAT-36, but labels, ordering, routes, counts, and images remain **BLOCKED from final content sign-off**.
- Each card has four separate product records and four distinct image assets. Fallback placeholders are allowed only in design prototypes and must be labelled as placeholders.
- Image crop: object-fit contain for isolated product photography; use consistent image stage dimensions and neutral/pastel surfaces. Do not crop away product-defining features.
- Card interaction: the category title/card opens the category route; each product image opens its own product route. Nested interactive targets must be keyboard-operable and must not create invalid nested links.
- Category counts are omitted unless supplied by a reliable live contract.

## 7. Special-products rail: 30 placements / 8-hour window

- Display up to 30 concurrently eligible placements in the campaign pool; visible cards are a viewport-dependent subset in a horizontally navigable rail.
- Each placement has an explicit start/end timestamp and remaining-time presentation derived from server time. Do not assume all 30 campaigns start or expire together.
- Five-star eligibility must be returned by the authorized trust/eligibility service; the UI must not calculate it from review averages alone.
- Promotion cards must show the product, seller identity/status where permitted, actual offer price, reference price only when valid, and promotion expiry.
- No fabricated discounts, fake scarcity, invented review counts, or misleading countdown resets.
- Expired, withdrawn, ineligible, or unavailable placements are removed/updated from authoritative state. Define a graceful empty state if no eligible promotions exist.
- Rotation must be keyboard accessible and respect `prefers-reduced-motion`; autoplay, if approved later, must pause on focus/hover and expose pause controls.

## 8. Design system tokens — proposed values

These are initial design tokens for visual review, not yet validated against the official AFAGHX logo/brand guide. They must be reconciled with existing brand assets before UI sign-off.

| Token | Proposed value | Usage |
|---|---|---|
| `color.brand.navy` | `#102B55` | Header, primary navigation, footer |
| `color.brand.blue` | `#1769AA` | Links, secondary actions, focus accents |
| `color.brand.orange` | `#F36B21` | Primary CTA and selected highlights |
| `color.text.primary` | `#14243A` | Main text |
| `color.text.secondary` | `#64748B` | Supporting text |
| `color.surface.base` | `#FFFFFF` | Page/card surfaces |
| `color.surface.subtle` | `#F4F7FB` | Page and image stages |
| `color.border.subtle` | `#DCE4EE` | Card and input borders |
| `color.state.success` | `#16865A` | Confirmed success only |
| `color.state.warning` | `#B7791F` | Caution/expiry states |
| `color.state.danger` | `#C43D3D` | Errors/critical states |

- Typography proposal: Persian-first typeface with complete Persian/Arabic glyph coverage (e.g. Vazirmatn) and a neutral Latin companion (e.g. Inter); confirm licensing, loading strategy, and existing repository assets before adoption.
- Base body size: 14–16 px; compact metadata: never below 12 px except non-essential decorative metadata; line-height 1.5–1.7 for Persian.
- Spacing scale: 4, 8, 12, 16, 24, 32, 40, 48 px.
- Radius scale: 8, 12, 16 px; use shadows sparingly and consistently.
- Iconography: one coherent outline icon family; no mixed emoji/icon styles for core navigation.
- Focus state: clearly visible 2 px outline with sufficient contrast; never remove browser focus without replacement.

## 9. Interaction and state inventory

Every data-driven section must define and visually design these states before implementation:

- Loading: skeletons matching final component geometry; avoid layout shift.
- Success: real data with source-backed values.
- Empty: concise explanation and useful next action.
- Error: recoverable message and retry where safe; do not display stale success styling.
- Partial data: show available records and disclose unavailable fields without inventing them.
- Unauthenticated: public content remains accessible; protected actions route through approved identity flow.
- Unauthorized: hide or disable actions based on authoritative permissions; never rely on visual hiding as security.
- Offline/stale: communicate data freshness and prevent false claims about current price, stock, or promotion status.
- Search: idle, typing, suggestions, no results, results, loading, error, keyboard navigation, clear action.
- Carousels: start/end, disabled arrows, focus, swipe, reduced-motion and pause behavior.
- RTL/LTR: mirrored directional icons only where direction semantics require it; logos and product imagery are not mirrored.

## 10. Accessibility, SEO, and content quality

- Target WCAG 2.2 AA for contrast, keyboard operation, focus visibility, labels, errors, and semantics.
- All meaningful product/category images require appropriate alternative text; decorative images use empty alt.
- Touch targets should be at least 44 × 44 CSS px where practical.
- Use one H1, logical heading hierarchy, landmarks, descriptive links, and semantic buttons.
- Respect reduced-motion settings; avoid flashing and forced autoplay.
- Define localized page title, meta description, canonical URL, structured data eligibility, and crawlable category/product links with the SEO owner.
- Persian numerals, dates, currency, separators, and bidirectional mixed text must be locale-aware. Do not hardcode a currency or shipping promise globally.

## 11. Four-protocol design review

Each protocol is a mandatory independent gate. A visual review alone cannot pass architecture, security, or performance.

### Protocol 01 — Architecture
Evidence required:
- Homepage section-to-Experience ownership map.
- B2C/B2B journey map and shared-contract boundary.
- Data-source matrix for search, products, sellers, pricing, inventory, trust, campaigns, and recommendations.
- Proof that no browser component reads a database or owns domain truth.
- Contract owners and unresolved dependencies recorded.

### Protocol 02 — Security and trust
Evidence required:
- Public/private data classification for every visible field.
- Authorization and tenant-context boundary for account-specific content.
- Verified seller/five-star/promotion eligibility sourced from authoritative services.
- XSS-safe rendering, safe links, content/image upload policy, and privacy-conscious analytics.
- Negative tests for unauthorized data/actions; no secrets or tokens in UI state/logs.

### Protocol 03 — Performance and reliability
Evidence required:
- Performance budget and measured LCP/INP/CLS on representative desktop and mobile profiles.
- Image sizing, responsive formats, lazy-loading below the fold, and reserved image dimensions.
- Search and carousel performance under realistic data volume.
- Resilience tests for slow API, failed image, partial response, timeout, and offline/stale states.
- No capacity claims without measured load-test evidence.

### Protocol 04 — Experience and product quality
Evidence required:
- Approved high-fidelity desktop and mobile layouts in Persian RTL and English LTR.
- Usability walkthroughs for first-time B2C and B2B visitors.
- All 36 categories and 144 image slots accounted for; no duplicate placeholder assets in final review.
- Keyboard, screen-reader, contrast, touch-target, and reduced-motion checks.
- Screenshot-based visual regression at 1440, 1024, 768, 390, and 320 px.

## 12. Scoring and release gates

- No score is assigned by this document.
- The target is **at least 9.8/10 overall** after evidence-based review.
- Each of the four protocol gates must independently pass; a high average cannot compensate for a failed protocol.
- Critical security, data-integrity, accessibility, or architectural findings are automatic release blockers.
- Allowed audit states: `PASS`, `FAIL`, `PARTIAL`, `UNKNOWN`, `BLOCKED`.
- A gate cannot be marked PASS without linked evidence (artifact, test, screenshot, contract, or review record).
- No code implementation, merge to `main`, or public deployment is authorized by this document.

## 13. Open decisions / blockers before visual sign-off

| ID | Open item | Required owner input/evidence | Status |
|---|---|---|---|
| UI-01 | Canonical 36-category names and order | Owner-approved catalogue, exactly 36 entries | BLOCKED |
| UI-02 | Official logo and brand color source | Approved vector/logo and brand guide | PARTIAL |
| UI-03 | Product-image source and rights | Approved asset source and usage rights | BLOCKED |
| UI-04 | Campaign eligibility and 8-hour lifecycle contract | Trust/Advertising domain contract | BLOCKED |
| UI-05 | Search capability and result types | Search API contract for product/supplier/service | BLOCKED |
| UI-06 | B2B/B2C destination routes | Approved Experience route map | PARTIAL |
| UI-07 | Trust/service claims in footer and hero | Evidence-backed approved claims | BLOCKED |
| UI-08 | Existing frontend stack and shared components | Repository inspection and architecture approval | UNKNOWN |

## 14. Definition of done for the design phase

The design phase is complete only when all items below are evidenced:

1. Canonical 36-category catalogue is attached and approved.
2. High-fidelity desktop and mobile screens are delivered for fa-IR RTL and en LTR.
3. All major component variants and interaction states are documented.
4. Design tokens are reconciled with official brand assets.
5. The four protocol reviews have evidence and no unresolved critical findings.
6. Overall score is at least 9.8/10 and each protocol gate passes.
7. A human owner explicitly approves the design baseline.

**Next authorized phase after sign-off:** implementation planning and a separately reviewed implementation PR on an isolated branch. This specification itself does not authorize that phase.
