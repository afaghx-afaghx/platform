'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { SearchX } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SubNav } from '@/components/layout/SubNav'
import { Footer } from '@/components/layout/Footer'
import { HeroCarousel } from '@/components/home/HeroCarousel'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { ProductRail } from '@/components/home/ProductRail'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductDialog } from '@/components/product/ProductDialog'
import { CartSheet } from '@/components/cart/CartSheet'
import { useApp } from '@/store/app-store'
import { applyLocaleToDom, writeLocaleCookie } from '@/store/app-store'
import { dict } from '@/lib/i18n'
import { PRODUCTS } from '@/lib/catalog'
import { discountPercent, fill, formatNumber } from '@/lib/format'
import type { CategoryId, Locale, Product, SearchState, SortOption } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface StorefrontProps {
  initialLocale: Locale
}

const INITIAL_SEARCH: SearchState = {
  mode: 'home',
  query: '',
  category: 'all',
  sort: 'featured',
  dealsOnly: false,
}

/** Human title for the results header, derived from active filters. */
function resultsTitle(s: SearchState, locale: Locale): string {
  const q = s.query.trim()
  if (q) return q
  if (s.category !== 'all') return dict.categories[s.category][locale]
  if (s.dealsOnly) return dict.nav.todaysDeals[locale]
  if (s.sort === 'rating') return dict.nav.bestSellers[locale]
  if (s.sort === 'newest') return dict.nav.newArrivals[locale]
  return dict.sections.resultsTitle[locale]
}

/**
 * Client root: owns search state + locale sync, composes the full page.
 * Home view (hero, categories, rails) vs results view is derived from
 * search state — no routes needed, instant, and fully reversible.
 */
export const Storefront = memo(function Storefront({ initialLocale }: StorefrontProps) {
  /**
   * Single source of truth for locale = this state, SSR-seeded from cookie.
   * Switching: state → re-render (all dict/title/price lookups) + cookie +
   * <html lang/dir> via helpers. No duplicate locale in the store.
   */
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    writeLocaleCookie(l)
    applyLocaleToDom(l)
  }, [])

  const [search, setSearch] = useState<SearchState>(INITIAL_SEARCH)
  const [dialogProduct, setDialogProduct] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const openProduct = useCallback((p: Product) => {
    setDialogProduct(p)
    setDialogOpen(true)
  }, [])

  /* ── Derived catalog ─────────────────────────────────────── */
  const deals = useMemo(
    () => PRODUCTS.filter((p) => discountPercent(p) >= 15).sort((a, b) => discountPercent(b) - discountPercent(a)),
    []
  )
  const bestSellers = useMemo(
    () => PRODUCTS.filter((p) => p.badge === 'best-seller' || p.rating >= 4.7).slice(0, 10),
    []
  )
  const recommended = useMemo(
    () => [...PRODUCTS].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 12),
    []
  )

  const isSearching = search.mode === 'results'

  const results = useMemo(() => {
    if (!isSearching) return []
    const q = search.query.trim().toLowerCase()
    let list = PRODUCTS.filter((p) => {
      if (search.category !== 'all' && p.category !== search.category) return false
      if (search.dealsOnly && discountPercent(p) < 15) return false
      if (!q) return true
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
      return haystack.includes(q)
    })
    const byPrice = (p: Product) => (locale === 'fa' ? p.price.toman : p.price.usd)
    switch (search.sort) {
      case 'price-asc':
        list = [...list].sort((a, b) => byPrice(a) - byPrice(b))
        break
      case 'price-desc':
        list = [...list].sort((a, b) => byPrice(b) - byPrice(a))
        break
      case 'rating':
        list = [...list].sort((a, b) => b.rating - a.rating)
        break
      case 'newest':
        list = [...list].sort((a, b) => (b.badge === 'new-arrival' ? 1 : 0) - (a.badge === 'new-arrival' ? 1 : 0))
        break
      default:
        list = [...list].sort((a, b) => b.reviewCount - a.reviewCount)
    }
    return list
  }, [isSearching, search, locale])

  /* ── Handlers ────────────────────────────────────────────── */
  const goResults = useCallback((patch: Partial<SearchState>) => {
    setSearch({ ...INITIAL_SEARCH, mode: 'results', ...patch })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSearch = useCallback(
    (q: string) => {
      if (q.trim() === '' && search.category === 'all' && !search.dealsOnly) {
        setSearch(INITIAL_SEARCH)
        return
      }
      goResults({ query: q, category: search.category, dealsOnly: search.dealsOnly })
    },
    [goResults, search.category, search.dealsOnly]
  )
  const handleCategory = useCallback((c: CategoryId | 'all') => {
    setSearch((s) => ({ ...INITIAL_SEARCH, mode: 'results', category: c, dealsOnly: s.dealsOnly }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const handleDeals = useCallback(() => goResults({ dealsOnly: true }), [goResults])
  const handleBestSellers = useCallback(() => goResults({ sort: 'rating' }), [goResults])
  const handleNewArrivals = useCallback(() => goResults({ sort: 'newest' }), [goResults])
  const handleReset = useCallback(() => {
    setSearch(INITIAL_SEARCH)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const handleHeroCta = useCallback(
    (slide: number) => {
      if (slide === 1) handleDeals()
      else if (slide === 2) handleCategory('home-kitchen')
      else if (slide === 3) handleBestSellers()
      else handleReset()
    },
    [handleDeals, handleCategory, handleBestSellers, handleReset]
  )

  const d = dict.sections
  const fa = locale === 'fa'

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        locale={locale}
        onLocaleChange={setLocale}
        searchCategory={search.category}
        onSearchCategoryChange={handleCategory}
        onSearch={handleSearch}
        initialQuery={search.query}
      />
      <SubNav
        locale={locale}
        activeCategory={search.category}
        onCategory={handleCategory}
        onDeals={handleDeals}
        onBestSellers={handleBestSellers}
        onNewArrivals={handleNewArrivals}
        onReset={handleReset}
      />

      <main className="flex-1 pb-10" id="main">
        {isSearching ? (
          /* ─────────── Results view ─────────── */
          <div className="mx-auto w-full max-w-[1500px] px-2 pt-4 sm:px-3">
            <div className="rounded-lg bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-[17px] text-foreground/85">
                  {results.length > 0 ? (
                    <>
                      <span className="tabular">{formatNumber(results.length, locale)}</span>{' '}
                      {d.resultsFor[locale]}{' '}
                      <span className="font-bold text-afx-deal">
                        «{resultsTitle(search, locale)}»
                      </span>
                    </>
                  ) : (
                    d.noResults.title[locale]
                  )}
                </h1>

                <div className="flex items-center gap-3">
                  <label
                    htmlFor="deals-only"
                    className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground/85"
                  >
                    <Checkbox
                      id="deals-only"
                      checked={search.dealsOnly}
                      onCheckedChange={(v) => setSearch((s) => ({ ...s, dealsOnly: v === true }))}
                    />
                    {dict.search.dealsOnly[locale]}
                  </label>

                  <label className="sr-only" htmlFor="sort-select">
                    {dict.search.sortLabel[locale]}
                  </label>
                  <Select
                    value={search.sort}
                    onValueChange={(v) => setSearch((s) => ({ ...s, sort: v as SortOption }))}
                  >
                    <SelectTrigger id="sort-select" className="h-9 w-[190px] rounded-md border-afx-border text-[13px]">
                      <SelectValue aria-label={dict.search.sortLabel[locale]} />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(dict.search.sort) as SortOption[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {dict.search.sort[k][locale]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {results.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {results.map((p) => (
                    <ProductCard key={p.id} product={p} locale={locale} onOpen={openProduct} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <SearchX size={44} className="text-muted-foreground/60" aria-hidden="true" />
                  <p className="text-[16px] font-bold text-afx-price">{d.noResults.title[locale]}</p>
                  <p className="max-w-sm text-[13px] text-muted-foreground">{d.noResults.body[locale]}</p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-1 rounded-full bg-afx-orange px-6 py-2 text-[13px] font-bold text-afx-price transition hover:bg-afx-orange-hover"
                  >
                    {d.noResults.reset[locale]}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─────────── Home view ─────────── */
          <div className="space-y-4 pt-0">
            <HeroCarousel
              locale={locale}
              showcases={[PRODUCTS[0], PRODUCTS[8], PRODUCTS[7], PRODUCTS[2]]}
              onCta={handleHeroCta}
            />
            <div className="relative z-10 -mt-14 space-y-4 sm:-mt-20">
              <CategoryGrid locale={locale} onCategory={handleCategory} />
              <ProductRail
                id="deals"
                title={d.dealsTitle[locale]}
                linkLabel={d.dealsLink[locale]}
                products={deals}
                locale={locale}
                onOpen={openProduct}
                onLink={handleDeals}
              />
              <ProductRail
                title={d.bestSellersTitle[locale]}
                linkLabel={d.bestSellersLink[locale]}
                products={bestSellers}
                locale={locale}
                onOpen={openProduct}
                onLink={handleBestSellers}
              />
              {/* Recommended grid */}
              <section className="mx-auto w-full max-w-[1500px] px-2 sm:px-3">
                <div className="rounded-lg bg-card p-4 shadow-sm sm:p-5">
                  <h2 className="mb-4 text-[19px] font-bold text-afx-price sm:text-[21px]">
                    {d.recommendedTitle[locale]}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {recommended.map((p) => (
                      <ProductCard key={p.id} product={p} locale={locale} onOpen={openProduct} />
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <Footer locale={locale} />

      <ProductDialog
        product={dialogProduct}
        locale={locale}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <CartSheet locale={locale} />
    </div>
  )
})
