/**
 * AFAGHX Search Client — EXPERIENCE → PLATFORM integration contract.
 *
 * TypeScript mirror of platform/Search/meilisearch.mjs: same env vars, same
 * request shape (POST {base}/indexes/{index}/search), same filter syntax,
 * same error mapping (5xx → 503, otherwise 502), same abort-timeout semantics.
 *
 * A zero-dependency local catalog provider guarantees the storefront keeps
 * working when the PLATFORM search service is not deployed (graceful
 * degradation) — and gives byte-for-byte filter parity with the client UI.
 */
import type { Product } from './types'
import { discountPercent } from './format'
import { dict } from './i18n'

export interface SearchQuery {
  q?: string
  category?: string
  limit?: number
  /** Storefront extension — the platform adapter simply has no equivalent. */
  dealsOnly?: boolean
}

export interface SearchResult<T> {
  readonly items: T[]
  readonly estimatedTotalHits: number
  readonly processingTimeMs: number
  readonly source: 'meilisearch' | 'local'
}

export interface SearchProvider<T> {
  readonly name: 'meilisearch' | 'local'
  search(query?: SearchQuery): Promise<SearchResult<T>>
}

/**
 * Env keys — MUST stay identical to platform/Search/meilisearch.mjs so the
 * storefront binds to the PLATFORM search service with zero configuration
 * drift.
 */
export const SEARCH_ENV = {
  url: 'MEILISEARCH_URL',
  apiKey: 'MEILISEARCH_API_KEY',
  index: 'MEILISEARCH_INDEX',
  defaultIndex: 'afaghx',
} as const

/** Thrown when the Meilisearch base URL is missing or malformed. */
export class SearchConfigError extends Error {}

function normalizeBaseUrl(value: string | undefined): URL {
  if (!value) throw new SearchConfigError('meilisearch_url_required')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SearchConfigError('meilisearch_url_invalid')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SearchConfigError('meilisearch_url_invalid')
  }
  return url
}

/** Clamp to the platform's 1..100 window (default 20). */
function clampLimit(limit: number | undefined): number {
  return Math.min(Math.max(Number(limit) || 20, 1), 100)
}

export interface MeilisearchOptions {
  baseUrl?: string
  apiKey?: string
  index?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  /**
   * Storefront extension — deals parity with createLocalSearch().
   * When a query sets dealsOnly, the adapter appends
   * `discountPercent >= dealsThreshold` to the filter expression so
   * PLATFORM results match the local provider's threshold semantics.
   * Default 15 (percent) — same default as LocalSearchOptions.dealsThreshold.
   * Queries without dealsOnly are unaffected (platform mirror stays intact).
   */
  dealsThreshold?: number
}

/**PLATFORM adapter — faithful TS port of createMeilisearchSearch(). */
export function createMeilisearchSearch<T = Record<string, unknown>>(
  {
    baseUrl = process.env[SEARCH_ENV.url],
    apiKey = process.env[SEARCH_ENV.apiKey],
    index = process.env[SEARCH_ENV.index] || SEARCH_ENV.defaultIndex,
    fetchImpl = fetch,
    timeoutMs = 5000,
    dealsThreshold = 15,
  }: MeilisearchOptions = {}
): SearchProvider<T> {
  const base = normalizeBaseUrl(baseUrl)
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`

  return Object.freeze({
    name: 'meilisearch' as const,

    async search({
      q = '',
      category = 'all',
      limit = 20,
      dealsOnly = false,
    }: SearchQuery = {}): Promise<SearchResult<T>> {
      const query = String(q).trim()
      // Filter composition: platform category filter first, storefront deals
      // extension second. Meilisearch filter syntax: `A = "x" AND n >= 15`.
      const filters: string[] = []
      if (category && category !== 'all') {
        filters.push(`category = "${String(category).replaceAll('"', '\\"')}"`)
      }
      if (dealsOnly) filters.push(`discountPercent >= ${Number(dealsThreshold)}`)
      const filter = filters.length > 0 ? filters.join(' AND ') : undefined

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchImpl(
          new URL(`indexes/${encodeURIComponent(index)}/search`, base),
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              q: query,
              ...(filter ? { filter } : {}),
              limit: clampLimit(limit),
            }),
            signal: controller.signal,
          }
        )
        const body = (await response.json().catch(() => ({}))) as {
          message?: string
          hits?: unknown[]
          estimatedTotalHits?: number
          processingTimeMs?: number
        }
        if (!response.ok) {
          const error = new Error(
            body.message || `meilisearch_http_${response.status}`
          ) as Error & { statusCode: number }
          error.statusCode = response.status >= 500 ? 503 : 502
          throw error
        }
        return Object.freeze({
          items: (Array.isArray(body.hits) ? body.hits : []) as T[],
          estimatedTotalHits: Number(body.estimatedTotalHits || 0),
          processingTimeMs: Number(body.processingTimeMs || 0),
          source: 'meilisearch' as const,
        })
      } finally {
        clearTimeout(timer)
      }
    },
  })
}

export interface LocalSearchOptions {
  /** Minimum discount (%) for dealsOnly matches — parity with the results UI. */
  dealsThreshold?: number
}

/**
 * Local catalog provider — same haystack fields as the Storefront client
 * filter (titles, brand, descriptions, category labels in both languages).
 */
export function createLocalSearch(
  products: readonly Product[],
  { dealsThreshold = 15 }: LocalSearchOptions = {}
): SearchProvider<Product> {
  return Object.freeze({
    name: 'local' as const,

    async search({
      q = '',
      category = 'all',
      limit = 20,
      dealsOnly = false,
    }: SearchQuery = {}): Promise<SearchResult<Product>> {
      const started = performance.now()
      const query = String(q).trim().toLowerCase()

      const items = products
        .filter((p) => {
          if (category && category !== 'all' && p.category !== category) return false
          if (dealsOnly && discountPercent(p) < dealsThreshold) return false
          if (!query) return true
          const haystack = [
            p.title.en,
            p.title.fa,
            p.brand,
            p.description.en,
            p.description.fa,
            dict.categories[p.category].en,
            dict.categories[p.category].fa,
          ]
            .join(' ')
            .toLowerCase()
          return haystack.includes(query)
        })
        .slice(0, clampLimit(limit))

      return Object.freeze({
        items,
        estimatedTotalHits: items.length,
        processingTimeMs: Math.round((performance.now() - started) * 100) / 100,
        source: 'local' as const,
      })
    },
  })
}

export interface ResolvedSearch<T> {
  provider: SearchProvider<T>
  /** true → PLATFORM Meilisearch is in the request loop. */
  platformConfigured: boolean
}

/**
 * Env-driven provider selection: Meilisearch when MEILISEARCH_URL exists,
 * local catalog otherwise. An invalid URL degrades to local instead of
 * crashing the route — search must never hard-fail.
 */
export function resolveSearchProvider(
  products: readonly Product[],
  env: Record<string, string | undefined> = process.env
): ResolvedSearch<Product> {
  const url = env[SEARCH_ENV.url]
  if (url) {
    try {
      return {
        provider: createMeilisearchSearch<Product>({
          baseUrl: url,
          apiKey: env[SEARCH_ENV.apiKey],
          index: env[SEARCH_ENV.index],
        }),
        platformConfigured: true,
      }
    } catch {
      /* invalid config → graceful degradation below */
    }
  }
  return { provider: createLocalSearch(products), platformConfigured: false }
}
