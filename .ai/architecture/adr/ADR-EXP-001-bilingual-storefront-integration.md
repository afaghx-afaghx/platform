# ADR-EXP-001 — Amazon-Grade Bilingual Storefront (EXPERIENCE Layer)

- Status: Accepted
- Date: 2026-10-18
- Scope: AFX-EXP-SF-001 (experience/storefront)

## Decision
AFAGHX ships a reference storefront under `experience/storefront/` (Next.js 16 App Router)
implementing Amazon's architecture as the EXPERIENCE-layer benchmark, bilingual FA-RTL /
EN-LTR, integrated with PLATFORM and CORE contracts instead of inventing new ones.

Integration contracts:

1. **Search — PLATFORM parity.** `src/lib/search-client.ts` is the TypeScript mirror of
   `platform/Search/meilisearch.mjs`: same env names (`MEILISEARCH_URL`,
   `MEILISEARCH_API_KEY`, `MEILISEARCH_INDEX`, default index `afaghx`), same request shape
   (`POST {base}/indexes/{index}/search`), same filter syntax
   (`category = "x"` with quote escaping), same error mapping (5xx → 503, else 502) and
   abort-timeout semantics. `GET /api/search` serves this contract; when the PLATFORM
   service is absent or failing, the request degrades to a local catalog provider and
   still returns 200 with `x-afx-search-source` (and `x-afx-search-degraded: 1`) headers.

2. **Locale — UX-contract parity.** `src/lib/languages.ts` mirrors
   `AFAGHX_UX_CONTRACT` (v1.0.0): fa/en active, ar/tr listed but disabled with the
   platform's own "not yet active" strings. The header switcher is contract-driven; the
   storefront can never offer a language the platform does not know. Locale itself is
   SSR-resolved from the `afx-locale` cookie — `<html lang/dir>` is correct before first
   paint (zero FOUC).

3. **Governance — ADR-AI-001 respected.** All storefront work lands on feature branches
   through governed PRs (e.g. #277); main is never modified directly; human merge
   authority remains mandatory.

## Guardrails
- No new platform protocols: the storefront consumes PLATFORM/CORE contracts as-is.
- Search must never hard-fail the UX: provider failure → local fallback, always 200.
- Every user-facing string is bilingual and typed; `any` is forbidden.
- Contract mirrors (search-client, languages) carry header comments pointing at their
  platform source of truth and must be updated in lockstep.

## Consequences
- Deploying Meilisearch later requires zero storefront code changes — only the
  `MEILISEARCH_URL`/`MEILISEARCH_API_KEY` env vars.
- Adding a platform language (ar, tr) is a data-only change in two locked-step files.
- Contract behavior is enforced by `bun test src/lib/search-client.test.ts` (12 cases).
