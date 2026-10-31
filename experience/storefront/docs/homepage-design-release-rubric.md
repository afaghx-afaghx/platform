# AFAGHX Homepage Design Release Rubric

**Status:** NOT SCORED — visual evidence review is pending.  
**Release threshold:** 9.8/10 (98/100).  
**Applies to:** the homepage and its primary navigation at the exact release SHA.

A source-code review, green build, or screenshot capture alone is not a 9.8 design score. The score is assigned only after the captured experience has been inspected and the required responsive, locale and interaction checks pass.

## Weighted scorecard

| Dimension | Weight | Evidence required |
|---|---:|---|
| AFAGHX identity and ecosystem positioning | 15 | Clear distinction from a standalone marketplace; industry, commerce, services, trade, network and intelligence are discoverable |
| Information architecture and navigation | 15 | Primary journeys are obvious; labels are consistent; links resolve to the intended experience |
| B2B, B2C, supplier and advertising task clarity | 15 | Each audience has a clear next step; previews and live capabilities are never conflated |
| Visual hierarchy and design system | 15 | Typography, spacing, contrast, card density, color, image treatment and CTA hierarchy are consistent |
| Responsive behavior and internationalization | 15 | No overflow or clipping at 1440, 1024, 768 and 390 CSS px; Persian RTL and English LTR are both reviewed |
| Accessibility and interaction quality | 10 | Keyboard navigation, visible focus, semantic landmarks, accessible names and usable touch targets |
| Content integrity and trust transparency | 10 | Sample data, preview-only forms, target architecture and unavailable services are disclosed clearly |
| Performance and robustness | 5 | Production build, search contract, no blocking runtime errors, stable responsive layout |
| **Total** | **100** | |

## Hard release gates

The design cannot pass regardless of weighted score if any of these are true:

- A visible navigation item or primary CTA is broken or inert.
- Mobile layout clips primary controls or introduces horizontal page overflow.
- Persian RTL or English LTR has direction, alignment or text-order defects.
- Demo catalog values, preview forms or target architecture are presented as live operational services.
- A serious keyboard, focus, contrast or accessible-name defect remains.
- The exact release SHA has not passed the required CI workflow.

## Required visual and functional review

- Desktop full-page screenshot: 1440 × 1000.
- Tablet screenshots: 1024 × 768 and 768 × 1024.
- Mobile full-page screenshot: 390 × 844.
- Persian RTL and English LTR visual review.
- Smoke-test the primary routes: products, suppliers, factories, business network, markets and intelligence.
- Check the B2B RFQ preview, product dialog, cart opening, category navigation and advertising preview.
- Record any issue, severity, remediation commit and retest evidence.

## Scoring rule

Each dimension is scored from 0–10, then weighted by its percentage. Passing requires:

1. Weighted score of at least **9.8/10**.
2. No dimension below **9.5/10**.
3. Zero open critical or high-severity design/accessibility defects.
4. All hard release gates above satisfied on the same final SHA.

**Current disposition:** DRAFT / DO NOT MERGE / DO NOT DEPLOY.  
**Current score:** Not assigned. The available evidence proves code-level changes and CI checks only; it does not yet prove the rendered design quality.
