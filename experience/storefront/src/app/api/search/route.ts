import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PRODUCTS } from '@/lib/catalog'
import { createLocalSearch, resolveSearchProvider } from '@/lib/search-client'
import type { SearchQuery } from '@/lib/search-client'
import type { Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'cache-control': 'no-store' } as const

/**
 * PLATFORM-aligned search endpoint — the storefront's EXPERIENCE→PLATFORM
 * search contract.
 *
 *   GET /api/search?q=&category=&deals=1&limit=100
 *
 * - MEILISEARCH_URL configured → PLATFORM Meilisearch serves the query.
 * - Not configured, unreachable, or erroring → local catalog provider
 *   answers instead; the response stays 200 so the storefront never
 *   hard-fails search.
 * - `x-afx-search-source` reports the provider that actually served the
 *   request; `x-afx-search-degraded: 1` marks a Meilisearch fallback.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const query: SearchQuery = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? 'all',
    limit: Number(params.get('limit')) || 100,
    dealsOnly: params.get('deals') === '1' || params.get('deals') === 'true',
  }

  const { provider, platformConfigured } = resolveSearchProvider(PRODUCTS)

  try {
    const result = await provider.search(query)
    return NextResponse.json(result, {
      headers: { ...NO_STORE, 'x-afx-search-source': result.source },
    })
  } catch (error) {
    if (!platformConfigured) {
      // Local provider failing is a genuine defect — surface it.
      console.error('[afx-search] local provider failed:', error)
      return NextResponse.json(
        { error: 'search_unavailable' },
        { status: 500, headers: NO_STORE }
      )
    }
    // PLATFORM search is down → degrade to the local catalog, never break UX.
    console.error('[afx-search] meilisearch unavailable, degrading to local:', error)
    const fallback = await createLocalSearch(PRODUCTS).search(query)
    return NextResponse.json(fallback, {
      headers: {
        ...NO_STORE,
        'x-afx-search-source': 'local',
        'x-afx-search-degraded': '1',
      },
    })
  }
}
