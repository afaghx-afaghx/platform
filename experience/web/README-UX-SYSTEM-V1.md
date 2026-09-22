# AFAGHX Experience Design System V1.0

## Canonical objective
The public Experience layer is one coherent product surface for the AFAGHX economic ecosystem.

## Canonical flow
Need -> Discover -> Verify -> Match -> Connect -> Source/Sell -> Deal -> Execute -> Trust -> Learn

## Public homepage order
Header -> Need entry -> 34 product baskets -> Economic Network -> Trust -> Matching -> Procurement -> Industry/Factory -> Business Network -> Global Trade -> Intelligence -> Partners/API -> Footer

## Global rules
- One shared Header and Footer.
- One UI token system.
- One product taxonomy source of truth.
- Experience never owns business logic or persistence.
- Dynamic truth comes from the canonical API.
- Missing API data must produce an explicit unavailable/empty state, never fabricated records.
- RTL/LTR comes from the language contract.
- Accessibility and reduced-motion are required.

## Language contract
Initial active experiences: Persian and English.
Arabic and Turkish are reserved in the canonical language contract but remain inactive until complete localized routes exist. The UI must never pretend those routes are complete.

## Product taxonomy
The existing experience/web/public/product-taxonomy.js remains the only 34-basket registry.
No second 34-basket list may be introduced in HTML or another runtime registry.

## Required evidence
A UI release is not complete until tests and runtime evidence prove exactly 34 canonical baskets render, language isolation is preserved, search remains API-bound, no frontend-to-database path exists, the shared header is used, and responsive/accessibility states are present.