import { describe, expect, it } from 'bun:test'
import { PRODUCT_BASKETS, validateBasketCatalog } from './product-baskets'
import { PRODUCTS } from './catalog'

describe('AFAGHX canonical basket directory', () => {
  it('contains exactly the 36 approved basket IDs with no duplicates', () => {
    expect(PRODUCT_BASKETS).toHaveLength(36)
    expect(new Set(PRODUCT_BASKETS.map((basket) => basket.id)).size).toBe(36)
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
