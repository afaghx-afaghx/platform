# AFAGHX Homepage — UI Specification v1.0

**Status:** Owner-approved implementation baseline; implementation in isolated draft PR  
**Date:** 2026-11-11  
**Repository:** `afaghx-afaghx/platform`  
**Branch:** `design/homepage-ui-spec-v1`  
**Scope:** Homepage UI baseline plus separately authorized Experience-only implementation on `feat/homepage-36-baskets-v1`. No API implementation, database change, merge, deployment, or production release is authorized.

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

- Category order and Persian names are fixed by the owner-provided catalogue in Section 6.1. Do not substitute previous generated category proposals.
- The owner-provided sequence is displayed as 9 rows × 4 cards on desktop. Each card has four independent product-image slots (144 total).
- English display names require a separate reviewed translation pass; do not machine-translate into production labels without review.
- Each card has four separate product records and four distinct image assets. Fallback placeholders are allowed only in design prototypes and must be labelled as placeholders.
- Image crop: object-fit contain for isolated product photography; use consistent image stage dimensions and neutral/pastel surfaces. Do not crop away product-defining features.
- Card interaction: the category title/card opens the category route; each product image opens its own product route. Nested interactive targets must be keyboard-operable and must not create invalid nested links.
- Category counts are omitted unless supplied by a reliable live contract.

### 6.1 Owner-provided canonical Persian category catalogue

The owner supplied exactly 36 category names and their reference URLs. Preserve the order below as the canonical desktop sequence: 9 rows × 4 category cards. IDs are stable presentation identifiers CAT-01…CAT-36. The supplied source was grouped as twelve groups of three; for the required desktop grid, the sequence is flattened without reordering and regrouped into nine rows of four.

Each category card still contains four independent product-image slots. The 36 categories are not 144 categories.

| ID | Owner-provided category name | Owner-provided reference URL |
|---|---|---|
| CAT-01 | خشکبار و نوشیدنی ها | https://digiafagh.com/fa/search/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%DA%86%D9%88%D8%A8%DB%8C |
| CAT-02 | پوشاک | https://digiafagh.com/fa/search/%D9%BE%D9%88%D8%B4%D8%A7%DA%A9 |
| CAT-03 | خودرو و لوازم جانبی خودرو | https://digiafagh.com/fa/search/%D8%AE%D9%88%D8%AF%D8%B1%D9%88-%D9%88-%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%AC%D8%A7%D9%86%D8%A8%DB%8C |
| CAT-04 | لوازم خانگی | https://digiafagh.com/fa/search/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%A8%D8%B1%D9%82%DB%8C |
| CAT-05 | لوازم الکترونیک مصرفی | https://digiafagh.com/fa/search/%D8%AB%D9%84%D9%82%D8%B3%DB%8C%D8%A8%D8%B3%DB%8C%D8%A8 |
| CAT-06 | دستگاه ها و ماشین آلات | https://digiafagh.com/fa/search/%D8%AF%D8%B3%D8%AA%DA%AF%D8%A7%D9%87-%D9%87%D8%A7-%D9%88-%D9%85%D8%A7%D8%B4%DB%8C%D9%86-%D8%A2%D9%84%D8%A7%D8%AA |
| CAT-07 | تجهیزات و لوازم الکتریکی | https://digiafagh.com/fa/search/%D8%AA%D8%B3%D8%AA |
| CAT-08 | بسته بندی و چاپ | https://digiafagh.com/fa/search/%D8%A8%D8%B3%D8%AA%D9%87-%D8%A8%D9%86%D8%AF%DB%8C-%D9%88-%DA%86%D8%A7%D9%BE |
| CAT-09 | لوازم اداری و مدرسه | https://digiafagh.com/fa/search/%D8%AF%D9%81%D8%AA%D8%B1-%D9%88-%D8%AA%D8%AC%D9%87%DB%8C%D8%B2%D8%A7%D8%AA-%D9%85%D8%AF%D8%B1%D8%B3%D9%87 |
| CAT-10 | انرژی | https://digiafagh.com/fa/search/%D8%A7%D9%86%D8%B1%DA%98%DB%8C |
| CAT-11 | محیط زیست | https://digiafagh.com/fa/search/%D9%85%D8%AD%DB%8C%D8%B7-%D8%B2%DB%8C%D8%B3%D8%AA |
| CAT-12 | پارچه و منسوجات خام | https://digiafagh.com/fa/search/%D9%BE%D8%A7%D8%B1%DA%86%D9%87-%D9%88-%D9%85%D9%86%D8%B3%D9%88%D8%AC%D8%A7%D8%AA |
| CAT-13 | منسوجات خانگی | https://digiafagh.com/fa/search/%D9%85%D9%86%D8%B3%D9%88%D8%AC%D8%A7%D8%AA-%D8%AE%D8%A7%D9%86%DA%AF%DB%8C |
| CAT-14 | اسباب بازی و سرگرمی | https://digiafagh.com/fa/search/%D8%A7%D8%B3%D8%A8%D8%A7%D8%A8-%D8%A8%D8%A7%D8%B2%DB%8C-%D9%88-%D8%B3%D8%B1%DA%AF%D8%B1%D9%85%DB%8C |
| CAT-15 | هدایا و صنایع دستی | https://digiafagh.com/fa/search/%D9%87%D8%AF%D8%A7%DB%8C%D8%A7-%D9%88-%D8%B5%D9%86%D8%A7%DB%8C%D8%B9-%D8%AF%D8%B3%D8%AA%DB%8C |
| CAT-16 | مبلمان تجاری ، اداری ، مسکونی | https://digiafagh.com/fa/search/%D9%85%D8%A8%D9%84%D9%85%D8%A7%D9%86 |
| CAT-17 | خانه وباغ | https://digiafagh.com/fa/search/%D8%AE%D8%A7%D9%86%D9%87-%D9%88%D8%A8%D8%A7%D8%BA |
| CAT-18 | لوازم جانبی و مد | https://digiafagh.com/fa/search/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%AC%D8%A7%D9%86%D8%A8%DB%8C-%D9%88-%D9%85%D8%AF |
| CAT-19 | ساعت ،جواهرات ،عینک | https://digiafagh.com/fa/search/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AC%D9%88%D8%A7%D9%87%D8%B1%D8%A7%D8%AA-%D8%B9%DB%8C%D9%86%DA%A9 |
| CAT-20 | قطعات الکترونیکی،لوازم جانبی ،ارتباطات | https://digiafagh.com/fa/search/%D9%82%D8%B7%D8%B9%D8%A7%D8%AA-%D8%A7%D9%84%DA%A9%D8%AA%D8%B1%D9%88%D9%86%DB%8C%DA%A9%DB%8C-%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%AC%D8%A7%D9%86%D8%A8%DB%8C-%D8%A7%D8%B1%D8%AA%D8%A8%D8%A7%D8%B7%D8%A7%D8%AA |
| CAT-21 | سرویس و خدمات | https://digiafagh.com/fa/search/%D8%AA%D8%AC%D9%87%DB%8C%D8%B2%D8%A7%D8%AA-%D8%AE%D8%AF%D9%85%D8%A7%D8%AA |
| CAT-22 | خدمات تجاری | https://digiafagh.com/fa/search/%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D8%AA%D8%AC%D8%A7%D8%B1%DB%8C |
| CAT-23 | خدمات ساخت | https://digiafagh.com/fa/search/%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D8%B3%D8%A7%D8%AE%D8%AA |
| CAT-24 | چراغ و روشنایی | https://digiafagh.com/fa/search/%DA%86%D8%B1%D8%A7%D8%BA-%D9%88-%D8%B1%D9%88%D8%B4%D9%86%D8%A7%DB%8C%DB%8C |
| CAT-25 | تجهیزات (ساخت و ساز) املاک و مستغلات | https://digiafagh.com/fa/search/%D8%B3%D8%A7%D8%AE%D8%AA-%D9%88-%D8%B3%D8%A7%D8%B2-%D9%88-%D8%A7%D9%85%D9%84%D8%A7%DA%A9-%D9%88-%D9%85%D8%B3%D8%AA%D8%BA%D9%84%D8%A7%D8%AA |
| CAT-26 | زیبایی و مراقبت شخصی | https://digiafagh.com/fa/search/%D8%B2%DB%8C%D8%A8%D8%A7%DB%8C%DB%8C-%D9%88-%D9%85%D8%B1%D8%A7%D9%82%D8%A8%D8%AA-%D8%B4%D8%AE%D8%B5%DB%8C |
| CAT-27 | بهداشت و پزشکی | https://digiafagh.com/fa/search/%D8%A8%D9%87%D8%AF%D8%A7%D8%B4%D8%AA-%D9%88-%D9%BE%D8%B2%D8%B4%DA%A9%DB%8C |
| CAT-28 | کشاورزی | https://digiafagh.com/fa/search/%DA%A9%D8%B4%D8%A7%D9%88%D8%B1%D8%B2%DB%8C |
| CAT-29 | مواد معدنی و متالورژی | https://digiafagh.com/fa/search/%D9%85%D9%88%D8%A7%D8%AF-%D9%85%D8%B9%D8%AF%D9%86%DB%8C-%D9%88-%D9%85%D8%AA%D8%A7%D9%84%D9%88%D8%B1%DA%98%DB%8C |
| CAT-30 | مواد شیمیایی | https://digiafagh.com/fa/search/%D9%85%D9%88%D8%A7%D8%AF-%D8%B4%DB%8C%D9%85%DB%8C%D8%A7%DB%8C%DB%8C |
| CAT-31 | لاستیک و پلاستیک | https://digiafagh.com/fa/search/%D9%84%D8%A7%D8%B3%D8%AA%DB%8C%DA%A9-%D9%88-%D9%BE%D9%84%D8%A7%D8%B3%D8%AA%DB%8C%DA%A9 |
| CAT-32 | چمدان ، کیف ، جعبه | https://digiafagh.com/fa/search/%DA%86%D9%85%D8%AF%D8%A7%D9%86-%DA%A9%DB%8C%D9%81-%DA%A9%D9%81%D8%B4 |
| CAT-33 | کفش و لوازم جانبی | https://digiafagh.com/fa/search/%DA%A9%D9%81%D8%B4-%D9%88-%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%AC%D8%A7%D9%86%D8%A8%DB%8C |
| CAT-34 | ورزش و سرگرمی | https://digiafagh.com/fa/search/%D9%88%D8%B1%D8%B2%D8%B4-%D9%88-%D8%B3%D8%B1%DA%AF%D8%B1%D9%85%DB%8C |
| CAT-35 | ابزار و سخت افزار | https://digiafagh.com/fa/search/%D8%A7%D8%A8%D8%B2%D8%A7%D8%B1-%D9%88-%D8%B3%D8%AE%D8%AA-%D8%A7%D9%81%D8%B2%D8%A7%D8%B1 |
| CAT-36 | امنیت و حفاظت | https://digiafagh.com/fa/search/%D8%A7%D9%85%D9%86%DB%8C%D8%AA-%D9%88-%D8%AD%D9%81%D8%A7%D8%B8%D8%AA |

**URL integrity warning:** The URLs above are transcribed as supplied and are reference destinations only. Several slugs visibly do not correspond to their category labels (for example CAT-01 points to a wood-products slug; CAT-07 uses a generic test slug; CAT-05 contains an unusual encoded slug). Do not silently rewrite them or publish broken category links. Validate every URL against the intended Digiafagh destination, then map approved destinations to AFAGHX-owned canonical routes. Until that check, category labels/order are approved, but route mapping remains PARTIAL/BLOCKED.

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
- The owner has subsequently authorized Experience-only homepage implementation on an isolated branch and draft PR. Merge to `main`, API/domain/database changes, and public deployment remain unauthorized until all four protocol gates pass and the owner approves.

## 13. Open decisions / blockers before visual sign-off

| ID | Open item | Required owner input/evidence | Status |
|---|---|---|---|
| UI-01 | Canonical 36-category names and order | Owner-provided catalogue, exactly 36 entries | PASS |
| UI-09 | Validate supplied category reference URLs | Confirm every supplied URL and map to AFAGHX canonical routes | BLOCKED |
| UI-10 | English category labels | Reviewed bilingual catalogue for en LTR | BLOCKED |
| UI-02 | Official logo and brand color source | Approved vector/logo and brand guide | PARTIAL |
| UI-03 | Product-image source and rights | Approved asset source and usage rights | BLOCKED |
| UI-04 | Campaign eligibility and 8-hour lifecycle contract | Trust/Advertising domain contract | BLOCKED |
| UI-05 | Search capability and result types | Search API contract for product/supplier/service | BLOCKED |
| UI-06 | B2B/B2C destination routes | Approved Experience route map | PARTIAL |
| UI-07 | Trust/service claims in footer and hero | Evidence-backed approved claims | BLOCKED |
| UI-08 | Existing frontend stack and shared components | Repository inspection and architecture approval | UNKNOWN |

## 14. Definition of done for the design phase

The design phase is complete only when all items below are evidenced:

1. Owner-provided Persian catalogue of exactly 36 categories is attached and approved; supplied reference URLs are separately validated before activation.
2. High-fidelity desktop and mobile screens are delivered for fa-IR RTL and en LTR.
3. All major component variants and interaction states are documented.
4. Design tokens are reconciled with official brand assets.
5. The four protocol reviews have evidence and no unresolved critical findings.
6. Overall score is at least 9.8/10 and each protocol gate passes.
7. A human owner explicitly approves the design baseline.

**Implementation phase:** authorized separately by the owner on 2026-11-11 in branch `feat/homepage-36-baskets-v1` and draft PR #296. Implementation remains evidence-gated; unresolved image rights, campaign contract, category route integrity, and protocol reviews remain blockers.
