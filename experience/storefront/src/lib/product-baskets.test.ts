import { describe, expect, it } from 'bun:test'
import { PRODUCT_BASKETS, validateBasketCatalog } from './product-baskets'
import { PRODUCTS } from './catalog'
import { readFile } from 'node:fs/promises'

describe('AFAGHX canonical basket directory', () => {
  it('contains exactly the canonical 34 approved basket IDs with no duplicates', async () => {
    const taxonomySource = await readFile(new URL('../../../web/public/product-taxonomy.js', import.meta.url), 'utf8')
    const canonicalIds = [...taxonomySource.matchAll(/^\\s*\\['([^']+)'/gm)].map((match) => match[1])
    expect(canonicalIds).toHaveLength(34)
    expect(PRODUCT_BASKETS.map((basket) => basket.id)).toEqual(canonicalIds)
    expect(new Set(PRODUCT_BASKETS.map((basket) => basket.id)).size).toBe(34)
    expect(PRODUCT_BASKETS.every((basket) => basket.id.trim().length > 0)).toBe(true)
  })

  it('provides Persian and English labels and descriptions for every basket', () => {
    for (const basket of PRODUCT_BASKETS) {
      expect(basket.name.fa.trim().length).toBeGreaterThan(0)
      expect(basket.name.en.trim().length).toBeGreaterThan(0)
      expect(basket.description.fa.trim().length).toBeGreaterThan(0)
      expect(basket.description.en.trim().length).toBeGreaterThan(0)
    }
  })

  it('contains no duplicate or unknown product assignments', () => {
    const validation = validateBasketCatalog(PRODUCTS.map((product) => product.id))
    expect(validation.missingProductIds).toEqual([])
    expect(validation.duplicateProductIds).toEqual([])
  })
})
