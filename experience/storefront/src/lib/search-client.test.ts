/**
 * AFAGHX Storefront — platform integration contract tests.
 * Run: bun test src/lib/search-client.test.ts
 */
import { describe, it, expect } from 'bun:test'
import {
  SEARCH_ENV,
  SearchConfigError,
  createLocalSearch,
  createMeilisearchSearch,
  resolveSearchProvider,
} from './search-client'
import { AFAGHX_LANGUAGES, isCanonicalLanguage, languageByCode, toLocale } from './languages'
import { PRODUCTS } from './catalog'
import type { Product } from './types'

/* ── Meilisearch PLATFORM adapter ──────────────────────────────── */

function jsonFetch(status: number, body: unknown, capture?: { url: string; init: RequestInit }) {
  return (async (url: string | URL, init: RequestInit = {}) => {
    if (capture) {
      capture.url = String(url)
      capture.init = init
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

describe('createMeilisearchSearch (PLATFORM contract)', () => {
  const capture: { url: string; init: RequestInit } = { url: '', init: {} }

  it('POSTs to indexes/{index}/search with platform env names and filter syntax', async () => {
    const provider = createMeilisearchSearch<{ id: string }>({
      baseUrl: 'http://localhost:7700',
      apiKey: 'secret',
      index: 'afaghx',
      fetchImpl: jsonFetch(200, { hits: [{ id: 'p1' }], estimatedTotalHits: 1, processingTimeMs: 3 }, capture),
    })
    const result = await provider.search({ q: 'phone', category: 'electronics', limit: 5 })

    expect(capture.url).toBe('http://localhost:7700/indexes/afaghx/search')
    expect((capture.init as { method: string }).method).toBe('POST')
    const headers = (capture.init as { headers: Record<string, string> }).headers
    expect(headers.authorization).toBe('Bearer secret')
    const body = JSON.parse(String((capture.init as { body: string }).body))
    expect(body).toEqual({ q: 'phone', filter: 'category = "electronics"', limit: 5 })
    expect(result).toEqual({
      items: [{ id: 'p1' }],
      estimatedTotalHits: 1,
      processingTimeMs: 3,
      source: 'meilisearch',
    })
    expect(provider.name).toBe('meilisearch')
  })

  it('escapes double quotes in the category filter (parity with platform adapter)', async () => {
    const c: { url: string; init: RequestInit } = { url: '', init: {} }
    const provider = createMeilisearchSearch({
      baseUrl: 'https://search.afaghx.example',
      fetchImpl: jsonFetch(200, { hits: [] }, c),
    })
    await provider.search({ category: 'ha"rd' })
    const body = JSON.parse(String((c.init as { body: string }).body))
    expect(body.filter).toBe('category = "ha\\"rd"')
  })

  it('maps 5xx → statusCode 503 and other errors → 502', async () => {
    const boom = createMeilisearchSearch({ baseUrl: 'http://m:7700', fetchImpl: jsonFetch(503, { message: 'down' }) })
    await expect(boom.search()).rejects.toMatchObject({ statusCode: 503 })
    const missing = createMeilisearchSearch({ baseUrl: 'http://m:7700', fetchImpl: jsonFetch(404, {}) })
    await expect(missing.search()).rejects.toMatchObject({ statusCode: 502 })
  })

  it('aborts when the PLATFORM search exceeds timeoutMs', async () => {
    const hanging = ((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as unknown as typeof fetch
    const slow = createMeilisearchSearch({ baseUrl: 'http://m:7700', fetchImpl: hanging, timeoutMs: 15 })
    await expect(slow.search()).rejects.toThrow()
  })

  it('rejects missing/invalid base URL', () => {
    expect(() => createMeilisearchSearch({ baseUrl: undefined })).toThrow(SearchConfigError)
    expect(() => createMeilisearchSearch({ baseUrl: 'ftp://m:7700' })).toThrow('meilisearch_url_invalid')
  })
})

/* ── Local provider (graceful degradation) ─────────────────────── */

describe('createLocalSearch (catalog parity)', () => {
  const provider = createLocalSearch(PRODUCTS)

  it('matches Persian haystack (titles/descriptions/brand)', async () => {
    const r = await provider.search({ q: 'هدفون' })
    expect(r.source).toBe('local')
    expect(r.items.length).toBeGreaterThan(0)
    expect(r.items.some((p) => p.title.fa.includes('هدفون') || p.description.fa.includes('هدفون'))).toBe(true)
  })

  it('filters by category and deals threshold', async () => {
    const books = await provider.search({ category: 'books' })
    expect(books.items.length).toBeGreaterThan(0)
    expect(books.items.every((p: Product) => p.category === 'books')).toBe(true)

    const deals = await provider.search({ dealsOnly: true, limit: 100 })
    expect(deals.items.length).toBeGreaterThan(0)
    expect(deals.items.length).toBeLessThan(PRODUCTS.length)
  })

  it('clamps limit into the platform 1..100 window', async () => {
    expect((await provider.search({ limit: 2 })).items.length).toBe(2)
    expect((await provider.search({ limit: 0 })).items.length).toBe(20) // default
    const all = await provider.search({ limit: 500 })
    expect(all.items.length).toBe(PRODUCTS.length)
  })
})

/* ── Provider resolution (env-driven, never hard-fails) ────────── */

describe('resolveSearchProvider', () => {
  it('uses PLATFORM Meilisearch only when MEILISEARCH_URL exists', () => {
    const local = resolveSearchProvider(PRODUCTS, {})
    expect(local.platformConfigured).toBe(false)
    expect(local.provider.name).toBe('local')

    const platform = resolveSearchProvider(PRODUCTS, { [SEARCH_ENV.url]: 'http://localhost:7700' })
    expect(platform.platformConfigured).toBe(true)
    expect(platform.provider.name).toBe('meilisearch')
  })

  it('degrades to local on an invalid URL instead of crashing', () => {
    const degraded = resolveSearchProvider(PRODUCTS, { [SEARCH_ENV.url]: 'not a url' })
    expect(degraded.platformConfigured).toBe(false)
    expect(degraded.provider.name).toBe('local')
  })
})

/* ── Locale bridge (AFAGHX_UX_CONTRACT 1.0.0 mirror) ───────────── */

describe('languages bridge', () => {
  it('mirrors the platform contract exactly', () => {
    expect(AFAGHX_LANGUAGES.map((l) => [l.code, l.active, l.dir])).toEqual([
      ['fa', true, 'rtl'],
      ['en', true, 'ltr'],
      ['ar', false, 'rtl'],
      ['tr', false, 'ltr'],
    ])
  })

  it('activates only storefront locales, blocks the rest', () => {
    expect(toLocale('fa')).toBe('fa')
    expect(toLocale('en')).toBe('en')
    expect(toLocale('ar')).toBeNull() // contract: not yet active
    expect(toLocale('de')).toBeNull() // contract: unknown
    expect(isCanonicalLanguage('tr')).toBe(true)
    expect(isCanonicalLanguage('de')).toBe(false)
    expect(languageByCode('ar')?.label).toBe('العربية')
  })
})
