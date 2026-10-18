import { NextResponse } from 'next/server'
import { PRODUCTS, CATEGORIES } from '@/lib/catalog'
import { discountPercent } from '@/lib/format'
import type { Product } from '@/lib/types'

/**
 * GET /api/products — catalog feed.
 * Query params: q (text), category, deals=1, sort.
 * Computed field discountPercent is added server-side.
 */

export const dynamic = 'force-static'

type ProductDTO = Product & { discountPercent: number }

const CATALOG: ProductDTO[] = PRODUCTS.map((p) => ({ ...p, discountPercent: discountPercent(p) }))

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim().toLowerCase()
  const category = searchParams.get('category')
  const deals = searchParams.get('deals') === '1'
  const sort = searchParams.get('sort') ?? 'featured'

  let list = CATALOG

  if (category && category !== 'all') list = list.filter((p) => p.category === category)
  if (deals) list = list.filter((p) => p.discountPercent >= 15)
  if (q) {
    list = list.filter((p) =>
      [p.title.en, p.title.fa, p.brand, p.description.en, p.description.fa]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }

  switch (sort) {
    case 'price-asc':
      list = [...list].sort((a, b) => a.price.usd - b.price.usd)
      break
    case 'price-desc':
      list = [...list].sort((a, b) => b.price.usd - a.price.usd)
      break
    case 'rating':
      list = [...list].sort((a, b) => b.rating - a.rating)
      break
    default:
      break
  }

  return NextResponse.json({
    count: list.length,
    categories: CATEGORIES,
    products: list,
  })
}
