/**
 * afaghx.com content integrity tests — bilingual completeness + contract
 * route coverage. Run: bun test src/lib/site-content.test.ts
 */
import { describe, it, expect } from 'bun:test'
import { HOME, SITE_NAV, SITE_PAGES, isSiteSlug, type ContentBlock } from './site-content'
import type { LocalizedText } from './types'

const isBilingual = (t: LocalizedText) =>
  typeof t?.fa === 'string' && t.fa.length > 0 && typeof t?.en === 'string' && t.en.length > 0

describe('SITE_NAV — canonical contract routes', () => {
  it('lists the 8 contract routes in canonical order', () => {
    expect(SITE_NAV.map((n) => n.href)).toEqual([
      '/',
      '/products',
      '/suppliers',
      '/factories',
      '/services',
      '/markets',
      '/business-network',
      '/intelligence',
    ])
    expect(SITE_NAV.every((n) => isBilingual(n.label))).toBe(true)
  })
})

describe('SITE_PAGES — six contract route pages', () => {
  const slugs = ['suppliers', 'factories', 'services', 'markets', 'business-network', 'intelligence'] as const

  it('covers exactly the six slugs', () => {
    expect(Object.keys(SITE_PAGES).sort()).toEqual([...slugs].sort())
    expect(isSiteSlug('suppliers')).toBe(true)
    expect(isSiteSlug('nope')).toBe(false)
  })

  it('is fully bilingual with 3 blocks, 6 capabilities, 3 stats each', () => {
    for (const slug of slugs) {
      const page = SITE_PAGES[slug]
      expect(isBilingual(page.navLabel)).toBe(true)
      expect(isBilingual(page.title)).toBe(true)
      expect(isBilingual(page.subtitle)).toBe(true)
      expect(isBilingual(page.cta)).toBe(true)
      expect(page.host).toMatch(/\.afaghx\.com$/)
      expect(page.blocks.length).toBe(3)
      expect(page.capabilities.length).toBe(6)
      expect(page.stats.length).toBe(3)
      for (const block of page.blocks as ContentBlock[]) {
        expect(isBilingual(block.title)).toBe(true)
        expect(isBilingual(block.body)).toBe(true)
      }
      expect(page.capabilities.every(isBilingual)).toBe(true)
      expect(page.stats.every((s) => Number.isFinite(s.value) && isBilingual(s.label))).toBe(true)
    }
  })

  it('keeps registry hosts canonical', () => {
    expect(SITE_PAGES.services.host).toBe('services.afaghx.com') // registry-enforced
    expect(SITE_PAGES.factories.host).toBe('factory.afaghx.com')
    expect(SITE_PAGES.suppliers.host).toBe('supplier.afaghx.com')
  })
})

describe('HOME — landing sections per UX contract', () => {
  it('has 4 need-actions, 5 layers, 7 security steps, 17 roles', () => {
    expect(HOME.actions.length).toBe(4)
    expect(HOME.layers.map((l) => l.id)).toEqual([
      'AFX-CORE',
      'AFX-PLATFORM',
      'DOMAIN',
      'INTELLIGENCE',
      'EXPERIENCE',
    ])
    expect(HOME.securityFlow.length).toBe(7)
    expect(HOME.roles.items.length).toBe(17)
    const slugs = HOME.roles.items.map((r) => r.slug)
    expect(new Set(slugs).size).toBe(17)
    expect(slugs).toContain('api') // the API spine is explicitly represented
    expect(HOME.roles.items.every((r) => isBilingual(r.name))).toBe(true)
  })
})
