import { describe, expect, it } from 'bun:test'
import { PRODUCT_BASKETS, auditProductBaskets } from './product-baskets'
import { PRODUCTS } from './catalog'
import { readFile } from 'node:fs/promises'

describe('AFAGHX canonical basket directory', () => {
  it('contains exactly the canonical 36 approved basket IDs with no duplicates', async () => {
    const taxonomySource = await readFile(new URL('../../../web/public/product-taxonomy.js', import.meta.url), 'utf8')
    const canonicalIds = taxonomySource
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith("['"))
      .map((line) => line.slice(2, line.indexOf("',")))
    expect(canonicalIds).toHaveLength(36)
    expect(PRODUCT_BASKETS.map((basket) => basket.id)).toEqual(canonicalIds)
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


  it('does not ship unlicensed third-party Amazon image references', () => {
    expect(PRODUCT_BASKETS.some((basket) =>
      basket.previewImages?.some((image) =>
        image.imageUrl.includes('m.media-amazon.com') || image.sourceUrl.includes('amazon.com')
      )
    )).toBe(false)
  })

  it('contains no duplicate or unknown product assignments', () => {
    const validation = auditProductBaskets(PRODUCTS.map((product) => product.id))
    expect(validation.isValid).toBe(true)
    expect(validation.unknownProductIds).toEqual([])
    expect(validation.duplicateProductAssignments).toEqual([])
  })
})
