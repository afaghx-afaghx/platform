# AFAGHX Commerce Discovery Contract v1.0

Status: **IMPLEMENTED / FAIL-CLOSED**  
Scope: Experience homepage (`experience/web/public`)  
Canonical branch: `deploy/experience-prototype`

## 1. Purpose

The homepage is a usable entry point to the AFAGHX ecosystem, not only an ecosystem presentation page. The Commerce Discovery Layer sits immediately after the Hero and exposes live discovery without inventing catalog data.

## 2. Discovery surface

The layer contains:

1. Universal Search
2. Approved product-basket shortcuts
3. Live discovery result cards
4. Result type labels for Products, Suppliers, Factories, Services, Markets and Network records when returned by the canonical API
5. Explicit loading, empty and unavailable states

## 3. Canonical data boundary

```text
Browser
  -> AFAGHX Experience
  -> api.afaghx.com
  -> canonical API / Gateway
  -> real data
```

The Experience layer MUST NOT connect to PostgreSQL, instantiate AFX-CORE, or create a local production catalog.

## 4. Search contract

- Runtime taxonomy source: `PRODUCT_TAXONOMY` only.
- Exactly 34 approved baskets plus the `all` selector.
- No `PRODUCT_PARENT_CATEGORIES`.
- No `<optgroup>`.
- Search requests use the existing canonical Experience API boundary: `https://api.afaghx.com/v1/search`.
- The Experience sends query and selected category only.
- The Experience never fabricates a result when the API is unavailable or returns no records.

## 5. Result contract

The UI accepts the existing search response shapes already supported by the Experience runtime:

- array of records
- `{ items: [...] }`
- `{ results: [...] }`

A record may expose `title`, `name`, `type`, `description`, or `text`. Unknown fields are ignored. Output is HTML-escaped before rendering.

## 6. UX states

### Loading
`در حال جست‌وجوی داده واقعی در API رسمی AFAGHX…`

### Empty
`نتیجه‌ای پیدا نشد.` with an explicit statement that no live record was returned.

### Unavailable
`نتیجه زنده در دسترس نیست؛ هیچ داده ساختگی نمایش داده نمی‌شود.`

### Success
The result count is shown and only API-returned records are rendered.

## 7. Homepage information architecture

```text
Header
  -> Hero
  -> Commerce Discovery Layer
       -> Search
       -> Basket shortcuts
       -> Live results
  -> Business routes
  -> Approved taxonomy
  -> Industry / Procurement
  -> Global Trade
  -> Business Network
  -> Intelligence / AI
  -> Trust
  -> Final CTA
```

## 8. Anti-fabrication rule

No fake product, supplier, factory, service, market, price, rating, stock, badge, popularity metric, review, or transaction state may be created to make the homepage look populated.

## 9. Release gates

A Commerce Discovery release is GREEN only when CI proves:

- 34 approved baskets remain intact.
- The Commerce Discovery Layer is present.
- Search remains behind `https://api.afaghx.com`.
- No database/core runtime is imported into the Experience runtime.
- Loading/empty/unavailable states exist.
- Result rendering is escaped.
- No fabricated catalog records exist in the Experience source.
- Existing Experience architecture tests remain GREEN.
- GitHub Pages build and deployment succeed.

The contract itself is not release evidence; CI and public deployment evidence are required.
