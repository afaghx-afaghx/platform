# AFAGHX Homepage UX Architecture — v1

## Status
- Branch: `ux/homepage-rebuild-v1`
- Scope: Experience Layer only
- Main: unchanged
- Runtime/business logic: unchanged

## Audit findings

### 1. Current homepage is over-composed
`experience/web/public/index.html` currently mixes many generations of homepage design and loads multiple CSS systems:
- `home-v5.css`
- `home-v5-typography.css`
- `home-v7-ecosystem.css`
- `ux-system-final.css`
- `footer-final.css`

This creates cascade ownership ambiguity and makes visual regressions difficult to localize.

### 2. Legacy visual systems coexist
The repository contains multiple homepage/header generations (`home-v3`, `home-v5`, `home-v7`, `header-v8`, final-header assets, and older global styles). The rebuild must establish one canonical homepage composition rather than adding another override layer.

### 3. Header responsibility is fragmented
The current header is embedded in the homepage while separate header-final bootstrap/contract/loader assets also exist. The new architecture must define one canonical header contract and one source of truth for language, location, search and authentication entry points.

### 4. Homepage content is too long before the primary user action
The current page communicates the entire ecosystem architecture on the landing page. The new homepage should progressively disclose:
1. Discover
2. Choose intent
3. Enter ecosystem surface
4. Understand trust
5. Explore deeper capabilities

### 5. Language integrity is a first-class acceptance criterion
Persian and English must be complete independent experiences. No mixed-language fallback strings, duplicated navigation, or language-specific fragments rendered into the wrong locale.

## Canonical UX architecture

### Layer A — Global Shell
- AFAGHX brand
- location/context
- global search
- language selector
- account/auth entry
- primary navigation
- responsive mobile navigation

### Layer B — Hero / Discovery
- one proposition
- one dominant search/action
- role-aware secondary paths
- no fake runtime data

### Layer C — Ecosystem Entry
Six primary surfaces:
- Products
- Businesses
- Suppliers
- Factories
- Services
- Trade

### Layer D — Trust
Identity, organization context, policy, verification and evidence are presented as trust primitives, not decorative badges.

### Layer E — Intelligence
AI/search/recommendation capabilities are framed as capabilities of the ecosystem and must never imply unavailable runtime functionality.

### Layer F — Footer
One canonical footer with locale-aware content.

## Visual system

- Editorial, premium B2B/B2C ecosystem aesthetic
- Strong typography hierarchy
- restrained dark/neutral base with a single AFAGHX accent
- high-density information where useful, generous whitespace where cognitive load is high
- 8px spacing grid
- consistent 12–20px radii
- keyboard-visible focus states
- WCAG-oriented contrast
- responsive breakpoints at approximately 1200 / 900 / 640px

## Component ownership

| Component | Owner |
|---|---|
| Header | Global Experience Shell |
| Search | Experience + API client boundary |
| Locale | Experience Shell |
| Hero | Homepage |
| Ecosystem cards | Homepage |
| Role entry | Homepage |
| Trust block | Homepage |
| Footer | Global Experience Shell |

## Hard rules

1. No frontend-to-database access.
2. No business rules in homepage UI.
3. No fake metrics, fake verification or fake AI results.
4. No new cascade override pile.
5. One canonical homepage stylesheet and one canonical homepage behavior module after migration.
6. Existing domain routes remain intact.
7. Main branch is not modified by this work.
8. Merge requires tests and real evidence.

## Acceptance gates

### Functional
- [ ] Homepage loads at root
- [ ] Search interaction remains non-breaking
- [ ] Existing role routes remain reachable
- [ ] Language switching preserves locale integrity
- [ ] Location component remains isolated from business logic

### Visual
- [ ] Desktop
- [ ] Tablet
- [ ] Mobile
- [ ] RTL
- [ ] LTR
- [ ] No horizontal overflow
- [ ] No mixed-language UI

### Governance
- [ ] No main mutation
- [ ] Branch isolated
- [ ] Repository tests pass
- [ ] CI evidence exists
- [ ] Review completed
