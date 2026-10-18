/**
 * AFAGHX — index the bilingual storefront catalog into the PLATFORM search
 * service (idempotent full refresh).
 *
 * Document mapping rules:
 *   - Product fields indexed as-is (bilingual objects stay nested).
 *   - `discountPercent` is COMPUTED here (storefront derives it from
 *     price vs listPrice) so the Meilisearch filter `discountPercent >= 15`
 *     reaches parity with the local provider's dealsOnly behavior.
 *   - `imageFallback` (bulky data-URI) is excluded — hits stay API-light.
 *
 * Run: source .data/meilisearch/keys.env && bun run scripts/meilisearch/index-catalog.ts
 */
import { meiliJson, waitForTask } from './meili-client'
import { PRODUCTS } from '../src/lib/catalog'
import { discountPercent } from '../src/lib/format'
import type { Product } from '../src/lib/types'

const INDEX = process.env.MEILISEARCH_INDEX || 'afaghx'

interface IndexedProduct {
  id: string
  category: string
  brand: string
  title: Product['title']
  description: Product['description']
  features: Product['features']
  price: Product['price']
  listPrice: Product['listPrice'] | null
  rating: number
  reviewCount: number
  image: string
  badge: string | null
  isPrime: boolean
  stock: number
  discountPercent: number
}

function toDocument(p: Product): IndexedProduct {
  return {
    id: p.id,
    category: p.category,
    brand: p.brand,
    title: p.title,
    description: p.description,
    features: p.features,
    price: p.price,
    listPrice: p.listPrice ?? null,
    rating: p.rating,
    reviewCount: p.reviewCount,
    image: p.image,
    badge: p.badge ?? null,
    isPrime: p.isPrime,
    stock: p.stock,
    discountPercent: discountPercent(p),
  }
}

async function main(): Promise<void> {
  const documents = PRODUCTS.map(toDocument)
  const deals = documents.filter((d) => d.discountPercent >= 15).length
  console.log(`catalog: ${documents.length} products / ${deals} deals (discountPercent >= 15)`)

  const task = await meiliJson<{ taskUid: number }>(
    'POST',
    `/indexes/${INDEX}/documents?primaryKey=id`,
    documents
  ).then((r) => r as unknown as { taskUid: number })
  await waitForTask(task)

  const stats = await meiliJson<{ numberOfDocuments: number }>('GET', `/indexes/${INDEX}/stats`)
  if (stats.numberOfDocuments !== documents.length) {
    throw new Error(`index mismatch: expected ${documents.length}, engine has ${stats.numberOfDocuments}`)
  }
  console.log(`indexed OK: ${stats.numberOfDocuments}/${documents.length} documents`)

  // Smoke checks — both languages + deals filter parity.
  for (const smoke of [{ q: 'هدفون' }, { q: 'headphones' }, { q: '', filter: 'discountPercent >= 15' }]) {
    const res = await meiliJson<{ estimatedTotalHits: number; processingTimeMs: number }>(
      'POST',
      `/indexes/${INDEX}/search`,
      smoke
    )
    console.log(
      `smoke ${JSON.stringify(smoke)} → ${res.estimatedTotalHits} hits (${res.processingTimeMs}ms)`
    )
  }
}

main().catch((err) => {
  console.error('INDEXING FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
