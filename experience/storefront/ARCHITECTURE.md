# AFAGHX Storefront — Architecture · معماری فروشگاه

> EXPERIENCE layer ↔ PLATFORM/CORE integration map · نقشهٔ یکپارچگی لایهٔ تجربه با پلتفرم

## 1. Layer Mapping · نگاشت لایه‌ها

```
┌──────────────────────────────────────────────────────────────────┐
│ EXPERIENCE — storefront (Next.js 16, this app)                   │
│   Header/SubNav/Hero/Rails/Cards/Dialog/Cart · FA-RTL + EN-LTR   │
├──────────────────────────────┬───────────────────────────────────┤
│ src/lib/search-client.ts ────┼──► PLATFORM · Search (Meilisearch)│
│   TS mirror of meilisearch.mjs│   POST /indexes/{index}/search   │
│ src/app/api/search/route.ts ─┤   env: MEILISEARCH_URL/API_KEY/   │
│   GET /api/search            │        MEILISEARCH_INDEX=afaghx   │
├──────────────────────────────┼───────────────────────────────────┤
│ src/lib/languages.ts ────────┼──► EXPERIENCE · afaghx-           │
│   mirror of AFAGHX_UX_       │   experience-contract.js          │
│   CONTRACT (v1.0.0)          │   (fa,en active · ar,tr soon)     │
├──────────────────────────────┼───────────────────────────────────┤
│ src/lib/types.ts (Product,   │──► DOMAIN · product contracts     │
│ Money, LocalizedText,        │    (bilingual fields, USD+Toman)  │
│ SearchState)                 │                                   │
├──────────────────────────────┼───────────────────────────────────┤
│ afx-locale cookie (SSR) ─────┼──► CORE · trust/locale semantics  │
└──────────────────────────────┴───────────────────────────────────┘
```

## 2. Search Contract · قرارداد جست‌وجو

**Server route:** `GET /api/search?q=&category=&deals=1&limit=100`

| Scenario | Behavior | Headers |
|---|---|---|
| `MEILISEARCH_URL` set + healthy | PLATFORM Meilisearch answers | `x-afx-search-source: meilisearch` |
| Meilisearch down / erroring | Local catalog answers, still **200** | `x-afx-search-source: local`, `x-afx-search-degraded: 1` |
| Env absent (default) | Local catalog answers | `x-afx-search-source: local` |

- Request parity with `platform/Search/meilisearch.mjs`: same endpoint shape
  (`POST {base}/indexes/{afaghx}/search`), filter `category = "x"` (quotes escaped),
  limit clamped 1..100, 5s abort timeout, 5xx→503 / else→502 error mapping.
- Local provider haystack parity with the UI filter: titles (en+fa), brand,
  descriptions (en+fa), category labels (en+fa). `dealsOnly` = discount ≥ 15%.

## 3. Locale Bridge · پل زبان

- `AFAGHX_LANGUAGES` mirrors `AFAGHX_UX_CONTRACT.languages` **exactly**
  (fa فارسی/rtl/active, en English/ltr/active, ar العربية/rtl/soon, tr Türkçe/ltr/soon).
- Header switcher renders the contract; inactive languages render disabled with the
  platform's own strings — `فعلاً در دسترس نیست` / `Not yet active`.
- Locale truth: `afx-locale` cookie → SSR `<html lang dir>` before paint (zero FOUC).
- `toLocale(code)` returns `null` for inactive/unknown codes → callers keep current
  locale (same semantics as `afaghx-language-system.js`).

## 4. State & Data Flow · جریان داده

- Cart: Zustand + localStorage (`afx-cart-v1`), `skipHydration` → rehydrate in client
  effect → no SSR mismatch. Locale is **not** in the store (cookie is the single truth).
- Catalog: 25 bilingual products / 8 categories (`src/lib/catalog.ts`), USD + Toman.
- Feed API: `GET /api/products?q=&category=&deals=&sort=` (sort: featured, price-asc,
  price-desc, rating, newest).

## 5. Verification Gates · دروازه‌های راستی‌آزمایی

| Gate | Command | Status |
|---|---|---|
| Contract tests | `bun test src/lib/search-client.test.ts` | 12 pass / 0 fail |
| Types | `bunx tsc --noEmit` (src/) | clean |
| Lint | `bun run lint` | 0 errors / 0 warnings |
| Live API | `curl '/api/search?q=هدفون'` | 1 hit, `source: local` |

## 6. Runbook

```bash
bun install && bun run dev          # http://localhost:3000
bun run build && bun run start      # production
MEILISEARCH_URL=http://localhost:7700 \
MEILISEARCH_API_KEY=... bun run dev # PLATFORM search in the loop
```

نسخهٔ فارسی این نقشه در PR #277 و ADR-EXP-001 نگهداری می‌شود؛ این فایل قراردادِ
تجربه–پلتفرم است و باید هم‌گام با `platform/Search` و `afaghx-experience-contract.js`
تغییر کند.
