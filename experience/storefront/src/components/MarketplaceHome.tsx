'use client'

import { memo, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  Factory,
  Globe2,
  Megaphone,
  Network,
  PackageSearch,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SubNav } from '@/components/layout/SubNav'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { EcosystemOverview } from '@/components/home/EcosystemOverview'
import { ProductRail } from '@/components/home/ProductRail'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductDialog } from '@/components/product/ProductDialog'
import { ProductImage } from '@/components/product/ProductImage'
import { CartSheet } from '@/components/cart/CartSheet'
import { applyLocaleToDom, writeLocaleCookie } from '@/store/app-store'
import { SiteFooter } from '@/components/site/SiteFooter'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { PRODUCTS } from '@/lib/catalog'
import { discountPercent, formatNumber } from '@/lib/format'
import type { CategoryId, Locale, Product, SearchState, SortOption } from '@/lib/types'

const INITIAL_SEARCH: SearchState = {
  mode: 'home',
  query: '',
  category: 'all',
  sort: 'featured',
  dealsOnly: false,
}

type BusinessDialog = 'rfq' | 'advertise' | null

function getResults(search: SearchState, locale: Locale): Product[] {
  if (search.mode !== 'results') return []

  const query = search.query.trim().toLocaleLowerCase()
  let result = PRODUCTS.filter((product) => {
    if (search.category !== 'all' && product.category !== search.category) return false
    if (search.dealsOnly && discountPercent(product) < 15) return false
    if (!query) return true

    const searchable = [
      product.title.en,
      product.title.fa,
      product.brand,
      product.description.en,
      product.description.fa,
      dict.categories[product.category].en,
      dict.categories[product.category].fa,
    ].join(' ').toLocaleLowerCase()

    return searchable.includes(query)
  })

  const price = (product: Product) => (locale === 'fa' ? product.price.toman : product.price.usd)

  switch (search.sort) {
    case 'price-asc':
      result = [...result].sort((a, b) => price(a) - price(b))
      break
    case 'price-desc':
      result = [...result].sort((a, b) => price(b) - price(a))
      break
    case 'rating':
      result = [...result].sort((a, b) => b.rating - a.rating)
      break
    case 'newest':
      result = [...result].sort(
        (a, b) => Number(b.badge === 'new-arrival') - Number(a.badge === 'new-arrival')
      )
      break
    default:
      result = [...result].sort((a, b) => b.reviewCount - a.reviewCount)
  }

  return result
}

function MarketplaceHomeView({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const handleLocaleChange = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale)
    writeLocaleCookie(nextLocale)
    applyLocaleToDom(nextLocale)
  }, [])
  const [search, setSearch] = useState<SearchState>(INITIAL_SEARCH)
  const [remoteSearch, setRemoteSearch] = useState<{
    key: string
    items: Product[]
    source: 'meilisearch' | 'local'
  } | null>(null)
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [businessDialog, setBusinessDialog] = useState<BusinessDialog>(null)
  const [businessPreviewComplete, setBusinessPreviewComplete] = useState(false)
  const [featuredTab, setFeaturedTab] = useState<'deals' | 'bestSellers' | 'recommended'>('deals')

  const fa = locale === 'fa'
  const Arrow = fa ? ArrowLeft : ArrowRight
  const searchKey = useMemo(
    () => JSON.stringify([search.query, search.category, search.dealsOnly]),
    [search.query, search.category, search.dealsOnly]
  )
  const sourceItems =
    search.mode === 'results' && remoteSearch?.key === searchKey
      ? remoteSearch.items
      : getResults(search, locale)
  const searchPending = search.mode === 'results' && remoteSearch?.key !== searchKey
  const results = useMemo(() => {
    const sorted = [...sourceItems]
    const price = (product: Product) => (locale === 'fa' ? product.price.toman : product.price.usd)
    switch (search.sort) {
      case 'price-asc':
        return sorted.sort((a, b) => price(a) - price(b))
      case 'price-desc':
        return sorted.sort((a, b) => price(b) - price(a))
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating)
      case 'newest':
        return sorted.sort((a, b) => Number(b.badge === 'new-arrival') - Number(a.badge === 'new-arrival'))
      default:
        return sorted.sort((a, b) => b.reviewCount - a.reviewCount)
    }
  }, [sourceItems, search.sort, locale])

  useEffect(() => {
    if (search.mode !== 'results') return

    const controller = new AbortController()
    const params = new URLSearchParams({
      q: search.query,
      category: search.category,
      deals: search.dealsOnly ? '1' : '0',
      limit: '100',
    })

    fetch(`/api/search?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`search_http_${response.status}`)
        const payload = (await response.json()) as {
          items?: Product[]
          source?: 'meilisearch' | 'local'
        }
        if (!Array.isArray(payload.items)) throw new Error('search_payload_invalid')
        setRemoteSearch({
          key: JSON.stringify([search.query, search.category, search.dealsOnly]),
          items: payload.items,
          source: payload.source === 'meilisearch' ? 'meilisearch' : 'local',
        })
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        // Final client-side degradation for transient network or malformed responses.
        setRemoteSearch({
          key: JSON.stringify([search.query, search.category, search.dealsOnly]),
          items: getResults(search, locale),
          source: 'local',
        })
      })

    return () => controller.abort()
  }, [search.mode, search.query, search.category, search.dealsOnly, locale])

  const deals = useMemo(
    () => PRODUCTS.filter((product) => discountPercent(product) >= 15)
      .sort((a, b) => discountPercent(b) - discountPercent(a))
      .slice(0, 4),
    []
  )
  const bestSellers = useMemo(() => {
    const dealIds = new Set(deals.map((product) => product.id))
    return PRODUCTS
      .filter((product) => !dealIds.has(product.id))
      .filter((product) => product.badge === 'best-seller' || product.rating >= 4.7)
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 4)
  }, [deals])
  const recommended = useMemo(
    () => {
      const featuredIds = new Set([...deals, ...bestSellers].map((product) => product.id))
      return [...PRODUCTS]
        .filter((product) => !featuredIds.has(product.id))
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 4)
    },
    [deals, bestSellers]
  )
  const promotedPreview = useMemo(() => [PRODUCTS[12], PRODUCTS[18], PRODUCTS[22]], [])

  const openProduct = useCallback((product: Product) => {
    setActiveProduct(product)
    setProductDialogOpen(true)
  }, [])

  const goResults = useCallback((patch: Partial<SearchState>) => {
    setSearch({ ...INITIAL_SEARCH, mode: 'results', ...patch })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSearch = useCallback((query: string) => {
    if (!query.trim() && search.category === 'all' && !search.dealsOnly) {
      setSearch(INITIAL_SEARCH)
      return
    }
    goResults({
      query,
      category: search.category,
      dealsOnly: search.dealsOnly,
    })
  }, [goResults, search.category, search.dealsOnly])

  const handleCategory = useCallback((category: CategoryId | 'all') => {
    setSearch((current) => ({
      ...INITIAL_SEARCH,
      mode: 'results',
      category,
      dealsOnly: current.dealsOnly,
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleDeals = useCallback(() => goResults({ dealsOnly: true }), [goResults])
  const handleBestSellers = useCallback(() => goResults({ sort: 'rating' }), [goResults])
  const handleNewArrivals = useCallback(() => goResults({ sort: 'newest' }), [goResults])
  const handleReset = useCallback(() => {
    setSearch(INITIAL_SEARCH)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const featuredContent = {
    deals: {
      products: deals,
      title: dict.sections.dealsTitle[locale],
      linkLabel: dict.sections.dealsLink[locale],
      onLink: handleDeals,
    },
    bestSellers: {
      products: bestSellers,
      title: dict.sections.bestSellersTitle[locale],
      linkLabel: dict.sections.bestSellersLink[locale],
      onLink: handleBestSellers,
    },
    recommended: {
      products: recommended,
      title: dict.sections.recommendedTitle[locale],
      linkLabel: fa ? 'مشاهده کاتالوگ' : 'Browse catalog',
      onLink: handleReset,
    },
  }[featuredTab]

  const openBusinessDialog = useCallback((kind: Exclude<BusinessDialog, null>) => {
    setBusinessPreviewComplete(false)
    setBusinessDialog(kind)
  }, [])

  const closeBusinessDialog = useCallback((open: boolean) => {
    if (!open) {
      setBusinessDialog(null)
      setBusinessPreviewComplete(false)
    }
  }, [])

  const submitBusinessPreview = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusinessPreviewComplete(true)
  }, [])

  const sectionCopy = {
    b2b: {
      title: fa ? 'تأمین سازمانی، با مسیر روشن‌تر' : 'Business sourcing, with a clearer path',
      body: fa
        ? 'برای خرید عمده و سازمانی، نیاز خود را تعریف کنید، تأمین‌کنندگان را بررسی کنید و برای استعلام قیمت آماده شوید.'
        : 'Define a bulk or company purchasing need, discover potential suppliers, and prepare a structured request for quotation.',
      note: fa
        ? 'پیش‌نمایش تجربه B2B: اتصال ثبت RFQ، تطبیق تأمین‌کننده، قیمت قراردادی و گردش تأیید هنوز به API عملیاتی نیاز دارد.'
        : 'B2B experience preview: RFQ submission, supplier matching, contract pricing and approval workflows still require live API integration.',
    },
    b2c: {
      title: fa ? 'خرید مصرف‌کننده، ساده و قابل کشف' : 'Consumer shopping, made easy to discover',
      body: fa
        ? 'دسته‌بندی‌ها را مرور کنید، محصولات نمونه را ببینید و تجربه جست‌وجو و سبد خرید را آزمایش کنید.'
        : 'Browse categories, explore sample products, and try the storefront search and cart experience.',
    },
    ads: {
      title: fa ? 'تبلیغات قابل کلیک؛ با جایگاه شفاف' : 'Click-led promotion, with clear placements',
      body: fa
        ? 'جایگاه‌های پیشنهادی برای معرفی محصول، نمایش برند و جذب خریدار طراحی شده‌اند؛ هر محتوای تبلیغاتی باید مشخص و قابل تشخیص باشد.'
        : 'Sponsored placements can introduce products, spotlight brands and attract buyers. Paid content must remain clearly identifiable.',
      note: fa
        ? 'این بخش پیش‌نمایش جایگاه تبلیغاتی است؛ نمایش آگهی واقعی، ثبت کلیک، محاسبه CPC و صورتحساب هنوز به سرویس تبلیغات و تحلیل متصل نشده‌اند.'
        : 'This is an ad-placement preview. Live ad serving, click attribution, CPC calculation and billing are not connected yet.',
    },
  }

  return (
    <div id="top" className="min-h-screen bg-afx-canvas">
      <div className="hidden bg-[#0b1722] text-white sm:block">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-2 px-3 py-2 text-[10px] sm:px-6 sm:text-xs">
          <p className="flex items-center gap-2 text-white/75">
            <Globe2 size={14} className="text-afx-squid" aria-hidden="true" />
            <span>{fa ? 'AFA GLOBAL HORIZON X | صنعت، تجارت، خدمات و هوشمندی' : 'AFA GLOBAL HORIZON X | Industry, commerce, services and intelligence'}</span>
          </p>
          <nav aria-label={fa ? 'دسترسی سریع' : 'Quick access'} className="hidden items-center gap-x-4 gap-y-1 font-semibold xl:flex">
            <a className="transition hover:text-afx-squid" href="#b2b">{fa ? 'خرید سازمانی' : 'Business buying'}</a>
            <a className="transition hover:text-afx-squid" href="#b2c">{fa ? 'خرید شخصی' : 'Personal shopping'}</a>
            <a className="transition hover:text-afx-squid" href="#advertising">{fa ? 'تبلیغات' : 'Advertising'}</a>
            <a className="transition hover:text-afx-squid" href="#network">{fa ? 'اکوسیستم' : 'Ecosystem'}</a>
            <a className="transition hover:text-afx-squid" href="#architecture">{fa ? 'معماری پلتفرم' : 'Platform architecture'}</a>
            <Link className="transition hover:text-afx-squid" href="/suppliers">{fa ? 'تأمین‌کنندگان' : 'Suppliers'}</Link>
          </nav>
        </div>
      </div>

      <Header
        locale={locale}
        onLocaleChange={handleLocaleChange}
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

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-afx-price focus:shadow-xl">
        {fa ? 'رفتن به محتوای اصلی' : 'Skip to main content'}
      </a>

      <main id="main-content" className="mx-auto w-full max-w-[1560px] space-y-5 px-2 py-4 sm:px-4 sm:py-6">
        {search.mode === 'results' ? (
          <section className="rounded-2xl border border-afx-border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-afx-link">
                    {fa ? 'جست‌وجوی بازار' : 'Marketplace search'}
                  </p>
                  {searchPending && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800" role="status">
                      {fa ? 'در حال جست‌وجو…' : 'Searching…'}
                    </span>
                  )}
                  {remoteSearch?.key === searchKey && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {remoteSearch.source === 'meilisearch'
                        ? (fa ? 'جست‌وجوی پلتفرم' : 'Platform search')
                        : (fa ? 'کاتالوگ محلی' : 'Local catalog')}
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-xl font-black text-afx-price sm:text-2xl">
                  {formatNumber(results.length, locale)} {fa ? 'نتیجه' : 'results'}
                  {search.query.trim() && <span className="ms-2 text-afx-squid">«{search.query.trim()}»</span>}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="marketplace-deals" className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    id="marketplace-deals"
                    checked={search.dealsOnly}
                    onCheckedChange={(value) => setSearch((current) => ({ ...current, dealsOnly: value === true }))}
                  />
                  {dict.search.dealsOnly[locale]}
                </label>
                <Select value={search.sort} onValueChange={(value) => setSearch((current) => ({ ...current, sort: value as SortOption }))}>
                  <SelectTrigger className="h-10 w-[185px] rounded-lg border-afx-border bg-white text-sm">
                    <SelectValue aria-label={dict.search.sortLabel[locale]} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(dict.search.sort) as SortOption[]).map((key) => (
                      <SelectItem key={key} value={key}>{dict.search.sort[key][locale]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full border border-afx-border px-4 py-2 text-sm font-bold text-afx-link transition hover:bg-afx-hover"
                >
                  {fa ? 'پاک کردن فیلترها' : 'Clear filters'}
                </button>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} locale={locale} onOpen={openProduct} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <PackageSearch size={42} className="mx-auto text-muted-foreground/60" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-bold">{dict.sections.noResults.title[locale]}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{dict.sections.noResults.body[locale]}</p>
                <button type="button" onClick={handleReset} className="mt-5 rounded-full bg-afx-orange px-5 py-2 text-sm font-bold text-afx-price">
                  {dict.sections.noResults.reset[locale]}
                </button>
              </div>
            )}
          </section>
        ) : (
          <>
            <section aria-labelledby="ecosystem-hero-title" className="relative isolate overflow-hidden rounded-[30px] border border-slate-200 bg-[#071b2a] text-white shadow-2xl shadow-slate-900/10">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -end-24 -top-28 h-96 w-96 rounded-full border border-cyan-100/10" />
                <div className="absolute -end-8 -top-12 h-64 w-64 rounded-full border border-cyan-100/10" />
                <div className="absolute -bottom-32 start-[18%] h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
              </div>
              <div className="relative grid items-center gap-8 px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-12 lg:py-14">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/25 bg-teal-200/[0.08] px-3.5 py-2 text-[10px] font-black tracking-[0.16em] text-teal-100 sm:text-xs">
                    <Network size={15} aria-hidden="true" />
                    AFA GLOBAL HORIZON X
                    <span className="h-1 w-1 rounded-full bg-teal-200" />
                    {fa ? 'اکوسیستم تجارت و صنعت' : 'BUSINESS & INDUSTRY ECOSYSTEM'}
                  </div>
                  <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200 sm:text-xs">
                    {fa ? 'یک شبکه، چندین مسیر تخصصی' : 'ONE NETWORK. SPECIALIST JOURNEYS.'}
                  </p>
                  <h1 id="ecosystem-hero-title" className="mt-3 max-w-3xl text-[2rem] font-black leading-[1.42] tracking-tight sm:text-4xl sm:leading-[1.25] lg:text-[3.35rem]">
                    {fa ? 'از کارخانه تا بازار جهانی؛ تجارت را یکپارچه پیش ببرید.' : 'Connect production to global markets — in one business ecosystem.'}
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-200/80 sm:text-base sm:leading-8">
                    {fa
                      ? 'AFAGHX برای اتصال تولیدکنندگان، کارخانه‌ها، تأمین‌کنندگان، خریداران سازمانی، مصرف‌کنندگان و ارائه‌دهندگان خدمات ساخته می‌شود. خرید آنلاین فقط یکی از مسیرهاست؛ هسته اصلی، شبکه‌ای برای همکاری و تجارت قابل پیگیری است.'
                      : 'AFAGHX brings manufacturers, factories, suppliers, business buyers, consumers and service providers into a connected network. Online shopping is one journey — the broader mission is trusted, traceable business collaboration.'}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href="/business-network" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-[#082334] shadow-lg shadow-teal-950/20 transition hover:-translate-y-0.5 hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                      <Network size={17} aria-hidden="true" />
                      {fa ? 'ورود به شبکه کسب‌وکار' : 'Explore the business network'}
                      <Arrow size={16} aria-hidden="true" />
                    </Link>
                    <button type="button" onClick={() => openBusinessDialog('rfq')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
                      <ClipboardList size={17} aria-hidden="true" />
                      {fa ? 'تعریف نیاز تأمین سازمانی' : 'Define a business sourcing need'}
                    </button>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-[11px] font-semibold text-slate-300 sm:text-xs">
                    <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-teal-200" aria-hidden="true" />{fa ? 'اعتماد و حاکمیت در طراحی' : 'Trust and governance by design'}</span>
                    <span className="inline-flex items-center gap-2"><Globe2 size={14} className="text-teal-200" aria-hidden="true" />{fa ? 'مسیرهای تجارت داخلی و جهانی' : 'Domestic and global trade journeys'}</span>
                  </div>
                </div>
                <div className="relative mx-auto w-full max-w-[560px]">
                  <div aria-hidden="true" className="absolute inset-x-[12%] top-1/2 h-px bg-gradient-to-r from-transparent via-teal-100/35 to-transparent" />
                  <div aria-hidden="true" className="absolute inset-y-[12%] start-1/2 w-px bg-gradient-to-b from-transparent via-teal-100/30 to-transparent" />
                  <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
                    <Link href="/factories" className="group rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur transition hover:-translate-y-1 hover:border-teal-200/50 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 sm:p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-200/10 text-teal-100"><Factory size={21} aria-hidden="true" /></span>
                      <p className="mt-4 text-[9px] font-black tracking-[0.16em] text-teal-100/75">{fa ? 'صنعت' : 'INDUSTRY'}</p>
                      <h2 className="mt-1 text-sm font-black sm:text-base">{fa ? 'کارخانه و تولید' : 'Factories & production'}</h2>
                      <p className="mt-2 text-[11px] leading-6 text-slate-300">{fa ? 'ظرفیت، تولیدکننده و توان ساخت' : 'Capacity, manufacturers and capability'}</p>
                    </Link>
                    <Link href="/suppliers" className="group rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur transition hover:-translate-y-1 hover:border-teal-200/50 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 sm:p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-200/10 text-sky-100"><Users size={21} aria-hidden="true" /></span>
                      <p className="mt-4 text-[9px] font-black tracking-[0.16em] text-sky-100/75">{fa ? 'شبکه تأمین' : 'SUPPLY NETWORK'}</p>
                      <h2 className="mt-1 text-sm font-black sm:text-base">{fa ? 'تأمین‌کنندگان' : 'Suppliers & sourcing'}</h2>
                      <p className="mt-2 text-[11px] leading-6 text-slate-300">{fa ? 'کشف و ارزیابی شرکای تأمین' : 'Discover and assess sourcing partners'}</p>
                    </Link>
                    <Link href="/business-network" className="group rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur transition hover:-translate-y-1 hover:border-teal-200/50 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 sm:p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-200/10 text-indigo-100"><Building2 size={21} aria-hidden="true" /></span>
                      <p className="mt-4 text-[9px] font-black tracking-[0.16em] text-indigo-100/75">{fa ? 'تجارت سازمانی' : 'B2B COMMERCE'}</p>
                      <h2 className="mt-1 text-sm font-black sm:text-base">{fa ? 'تدارکات و استعلام' : 'Procurement & RFQ'}</h2>
                      <p className="mt-2 text-[11px] leading-6 text-slate-300">{fa ? 'تعریف نیاز و مسیر همکاری' : 'Structure demand and collaboration'}</p>
                    </Link>
                    <Link href="/markets" className="group rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur transition hover:-translate-y-1 hover:border-teal-200/50 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 sm:p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200/10 text-amber-100"><Globe2 size={21} aria-hidden="true" /></span>
                      <p className="mt-4 text-[9px] font-black tracking-[0.16em] text-amber-100/75">{fa ? 'تجارت جهانی' : 'GLOBAL TRADE'}</p>
                      <h2 className="mt-1 text-sm font-black sm:text-base">{fa ? 'بازارها و خدمات' : 'Markets & services'}</h2>
                      <p className="mt-2 text-[11px] leading-6 text-slate-300">{fa ? 'کشف فرصت‌های بازار و تجارت' : 'Explore market and trade opportunities'}</p>
                    </Link>
                  </div>
                  <p className="mt-4 text-center text-[10px] leading-5 text-slate-400">
                    {fa ? 'نمایش مسیرهای اکوسیستم؛ وضعیت هر قابلیت باید جداگانه تأیید شود.' : 'Ecosystem journey map. Operational status is verified separately for each capability.'}
                  </p>
                </div>
              </div>
            </section>

            <EcosystemOverview locale={locale} />
            <nav aria-label={fa ? 'دسترسی به مسیرهای تجاری' : 'Business journey shortcuts'} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-afx-border bg-white px-3 py-2.5 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground">{fa ? 'دسترسی سریع به شبکه اکوسیستم' : 'Quick ecosystem access'}</span>
              <div className="flex flex-wrap gap-2">
                <Link href="/suppliers" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-afx-price ring-1 ring-slate-200 transition hover:bg-sky-50">
                  <Factory size={14} aria-hidden="true" /> {fa ? 'تأمین‌کنندگان' : 'Suppliers'}
                </Link>
                <Link href="/factories" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-afx-price ring-1 ring-slate-200 transition hover:bg-sky-50">
                  <Building2 size={14} aria-hidden="true" /> {fa ? 'کارخانه‌ها' : 'Factories'}
                </Link>
                <a href="#advertising" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-afx-price ring-1 ring-slate-200 transition hover:bg-amber-50">
                  <Megaphone size={14} aria-hidden="true" /> {fa ? 'تبلیغات' : 'Advertising'}
                </a>
              </div>
            </nav>

            <section id="b2b" className="scroll-mt-28 overflow-hidden rounded-3xl border border-[#c8d9e2] bg-gradient-to-br from-[#edf5f8] via-white to-[#e7f2ef] p-5 shadow-sm sm:p-8">
              <div className="grid gap-7 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-800">B2B · SOURCING & PROCUREMENT</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-afx-price sm:text-3xl">{sectionCopy.b2b.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{sectionCopy.b2b.body}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => openBusinessDialog('rfq')} className="inline-flex items-center gap-2 rounded-full bg-[#123c4b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1b5667]">
                      <ClipboardList size={16} /> {fa ? 'ساخت پیش‌نویس RFQ' : 'Create RFQ preview'}
                    </button>
                    <Link href="/suppliers" className="inline-flex items-center gap-2 rounded-full border border-[#b9cbd2] bg-white px-5 py-3 text-sm font-bold text-[#123c4b] transition hover:bg-sky-50">
                      <Users size={16} /> {fa ? 'شبکه تأمین‌کنندگان' : 'Supplier network'}
                    </Link>
                  </div>
                  <p className="mt-4 rounded-xl border border-sky-200 bg-white/75 p-3 text-[11px] leading-6 text-slate-600">{sectionCopy.b2b.note}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <article className="rounded-xl border border-white bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                    <span className="inline-flex rounded-lg bg-sky-50 p-2 text-sky-800 sm:rounded-xl sm:p-3"><PackageSearch size={22} /></span>
                    <h3 className="mt-2 text-xs font-black leading-5 text-afx-price sm:mt-3 sm:text-sm">{fa ? 'درخواست استعلام قیمت' : 'Request for quotation'}</h3>
                    <p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:mt-2 sm:text-xs sm:leading-6">{fa ? 'مشخصات کالا، حجم مورد نیاز و مقصد را یک‌جا تعریف کنید.' : 'Describe the item, estimated volume and destination in one structured request.'}</p>
                    <button onClick={() => openBusinessDialog('rfq')} className="mt-4 text-xs font-black text-afx-link">{fa ? 'شروع پیش‌نویس' : 'Start a draft'} <Arrow size={13} className="inline" /></button>
                  </article>
                  <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                    <span className="inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-800 sm:rounded-xl sm:p-3"><Truck size={22} /></span>
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'تأمین و لجستیک' : 'Sourcing and logistics'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'اطلاعات مبدأ، مقصد و شرایط تحویل را در فرایند تأمین لحاظ کنید.' : 'Account for origin, destination and delivery requirements in sourcing workflows.'}</p>
                    <Link href="/markets" className="mt-4 inline-flex text-xs font-black text-afx-link">{fa ? 'کاوش بازارها' : 'Explore markets'} <Arrow size={13} /></Link>
                  </article>
                  <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                    <span className="inline-flex rounded-lg bg-violet-50 p-2 text-violet-800 sm:rounded-xl sm:p-3"><Building2 size={22} /></span>
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'خرید شرکتی' : 'Company purchasing'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'مسیر خرید سازمانی از خرید شخصی جدا طراحی می‌شود.' : 'The business purchasing journey is designed separately from personal retail.'}</p>
                    <Link href="/business-network" className="mt-4 inline-flex text-xs font-black text-afx-link">{fa ? 'شبکه کسب‌وکار' : 'Business network'} <Arrow size={13} /></Link>
                  </article>
                  <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                    <span className="inline-flex rounded-lg bg-amber-50 p-2 text-amber-800 sm:rounded-xl sm:p-3"><BadgeCheck size={22} /></span>
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'اعتماد و شفافیت' : 'Trust and transparency'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'اعتبارسنجی طرف معامله و شرایط قرارداد باید با شواهد مستقل انجام شود.' : 'Counterparty verification and contract terms must be backed by independent evidence.'}</p>
                    <span className="mt-4 block text-[10px] font-bold text-amber-800">{fa ? 'نیازمند اتصال به زیرساخت اعتماد' : 'Requires Trust Foundation integration'}</span>
                  </article>
                </div>
              </div>
            </section>


            <section id="b2c" className="scroll-mt-28">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-afx-border bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-afx-link">B2C · CONSUMER COMMERCE</p>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-900 ring-1 ring-amber-200">
                      {fa ? 'کاتالوگ نمونه' : 'Sample catalogue'}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-black text-afx-price sm:text-2xl">{sectionCopy.b2c.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{sectionCopy.b2c.body}</p>
                </div>
                <Link href="/products" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-afx-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-afx-navy-hover">
                  {fa ? 'همه محصولات' : 'All products'} <Arrow size={15} />
                </Link>
              </div>
              <CategoryGrid locale={locale} onCategory={handleCategory} />
              <section id="featured-products" className="mt-4 space-y-3" aria-labelledby="featured-products-label">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-afx-border bg-white p-3 shadow-sm sm:p-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-afx-link">
                      {fa ? 'ویترین منتخب' : 'CURATED PRODUCT SHOWCASE'}
                    </p>
                    <h2 id="featured-products-label" className="mt-1 text-sm font-black text-afx-price sm:text-base">
                      {fa ? 'کالاهای منتخب برای کشف سریع' : 'Explore curated product highlights'}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={fa ? 'انتخاب نوع محصولات' : 'Choose product collection'}>
                    <button
                      type="button"
                      aria-pressed={featuredTab === 'deals'}
                      onClick={() => setFeaturedTab('deals')}
                      className={cn(
                        'min-h-9 rounded-full px-3 py-1.5 text-[10px] font-bold transition sm:text-xs',
                        featuredTab === 'deals' ? 'bg-afx-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {dict.sections.dealsTitle[locale]}
                    </button>
                    <button
                      type="button"
                      aria-pressed={featuredTab === 'bestSellers'}
                      onClick={() => setFeaturedTab('bestSellers')}
                      className={cn(
                        'min-h-9 rounded-full px-3 py-1.5 text-[10px] font-bold transition sm:text-xs',
                        featuredTab === 'bestSellers' ? 'bg-afx-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {dict.sections.bestSellersTitle[locale]}
                    </button>
                    <button
                      type="button"
                      aria-pressed={featuredTab === 'recommended'}
                      onClick={() => setFeaturedTab('recommended')}
                      className={cn(
                        'min-h-9 rounded-full px-3 py-1.5 text-[10px] font-bold transition sm:text-xs',
                        featuredTab === 'recommended' ? 'bg-afx-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {dict.sections.recommendedTitle[locale]}
                    </button>
                  </div>
                </div>
                <ProductRail
                  id="featured-product-rail"
                  title={featuredContent.title}
                  linkLabel={featuredContent.linkLabel}
                  products={featuredContent.products}
                  locale={locale}
                  onOpen={openProduct}
                  onLink={featuredContent.onLink}
                />
              </section>
            </section>

            <section id="advertising" className="scroll-mt-28 overflow-hidden rounded-3xl bg-[#142638] p-5 text-white shadow-lg sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">ADVERTISING · CLICKABLE PLACEMENTS</p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">{sectionCopy.ads.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/70">{sectionCopy.ads.body}</p>
                </div>
                <button type="button" onClick={() => openBusinessDialog('advertise')} className="inline-flex items-center gap-2 rounded-full bg-afx-squid px-5 py-3 text-sm font-black text-afx-price transition hover:bg-afx-squid-hover">
                  <Megaphone size={16} /> {fa ? 'درخواست جایگاه تبلیغاتی' : 'Request an ad placement'}
                </button>
              </div>

              <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
                {promotedPreview.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProduct(product)}
                    className="group relative flex min-w-[280px] shrink-0 snap-start items-center gap-3 rounded-xl border border-white/10 bg-white p-3 text-start text-afx-price transition hover:-translate-y-1 hover:shadow-xl md:min-w-0 md:shrink md:rounded-2xl md:p-4"
                  >
                    <span className="absolute end-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-900">
                      {fa ? 'جایگاه نمونه' : 'Ad preview'}
                    </span>
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                      <ProductImage product={product} alt={product.title[locale]} sizes="96px" className="object-contain p-2" />
                    </div>
                    <div className="min-w-0 pt-6">
                      <p className="text-[10px] font-bold text-afx-link">{product.brand}</p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-black leading-6">{product.title[locale]}</h3>
                      <p className="mt-2 text-[11px] font-bold text-afx-link">{fa ? 'مشاهده نمونه محصول' : 'View sample product'} <Arrow size={12} className="inline" /></p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-[11px] leading-6 text-white/65">{sectionCopy.ads.note}</p>
            </section>


            <section className="rounded-2xl border border-dashed border-afx-border bg-white/70 p-4 text-center">
              <p className="text-[11px] leading-6 text-muted-foreground">
                {fa
                  ? 'توجه: کاتالوگ فعلی شامل داده‌های نمونه است. قیمت، موجودی، امتیاز و اقلام تبلیغاتی تا اتصال منابع واقعی، داده عملیاتی محسوب نمی‌شوند. خرید و پرداخت واقعی نیز در این نسخه فعال نیست.'
                  : 'Notice: the current catalog uses sample data. Prices, stock, ratings and ad placements are not operational until connected to verified sources. Real checkout and payment are not enabled in this release.'}
              </p>
            </section>
          </>
        )}
      </main>

      <SiteFooter locale={locale} />

      <ProductDialog
        product={activeProduct}
        locale={locale}
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
      />
      <CartSheet locale={locale} />

      <Dialog open={businessDialog !== null} onOpenChange={closeBusinessDialog}>
        {businessDialog && (
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl bg-white p-0"
            dir={fa ? 'rtl' : 'ltr'}
          >
            <div className="border-b border-afx-border p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-afx-link">
                    {businessDialog === 'rfq' ? 'B2B · RFQ PREVIEW' : 'ADVERTISING · CAMPAIGN PREVIEW'}
                  </p>
                  <DialogTitle className="mt-2 text-xl font-black text-afx-price">
                    {businessDialog === 'rfq'
                      ? (fa ? 'پیش‌نویس درخواست استعلام قیمت' : 'Request for quotation preview')
                      : (fa ? 'پیش‌نویس درخواست تبلیغات' : 'Advertising enquiry preview')}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                    {businessDialog === 'rfq'
                      ? (fa ? 'اطلاعات اولیه نیاز خرید سازمانی را وارد کنید.' : 'Enter the initial details of your business sourcing need.')
                      : (fa ? 'نوع جایگاه و هدف تبلیغاتی موردنظر را مشخص کنید.' : 'Choose the placement type and objective for your campaign enquiry.')}
                  </DialogDescription>
                </div>
                <button type="button" onClick={() => closeBusinessDialog(false)} aria-label={fa ? 'بستن' : 'Close'} className="rounded-full border border-afx-border p-2 text-muted-foreground hover:bg-afx-hover">
                  <X size={17} />
                </button>
              </div>
            </div>

            {businessPreviewComplete ? (
              <div className="p-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={28} /></span>
                <h3 className="mt-4 text-lg font-black text-afx-price">{fa ? 'پیش‌نمایش تکمیل شد' : 'Preview completed'}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
                  {fa
                    ? 'هیچ درخواست واقعی ذخیره یا ارسال نشد. پس از اتصال APIهای تأمین و تبلیغات، این فرم به گردش‌کار عملیاتی متصل خواهد شد.'
                    : 'No live request was stored or sent. This form must be connected to the sourcing and advertising APIs before it can become operational.'}
                </p>
                <button type="button" onClick={() => closeBusinessDialog(false)} className="mt-5 rounded-full bg-afx-navy px-6 py-2.5 text-sm font-bold text-white">
                  {fa ? 'متوجه شدم' : 'Close'}
                </button>
              </div>
            ) : (
              <form onSubmit={submitBusinessPreview} className="space-y-4 p-5 sm:p-6">
                {businessDialog === 'rfq' ? (
                  <>
                    <Field label={fa ? 'کالا یا مشخصات موردنیاز' : 'Product or specification'} required>
                      <input required name="product" placeholder={fa ? 'مثلاً مواد اولیه، قطعه صنعتی یا تجهیزات' : 'e.g. raw material, industrial part or equipment'} className="form-control" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={fa ? 'حجم یا تعداد تقریبی' : 'Estimated quantity'} required>
                        <input required name="quantity" inputMode="numeric" placeholder={fa ? 'مثلاً ۵۰۰۰' : 'e.g. 5000'} className="form-control" />
                      </Field>
                      <Field label={fa ? 'واحد اندازه‌گیری' : 'Unit'}>
                        <select name="unit" className="form-control">
                          <option value="units">{fa ? 'عدد' : 'Units'}</option>
                          <option value="kg">{fa ? 'کیلوگرم' : 'Kilograms'}</option>
                          <option value="tons">{fa ? 'تن' : 'Metric tons'}</option>
                          <option value="containers">{fa ? 'کانتینر' : 'Containers'}</option>
                        </select>
                      </Field>
                    </div>
                    <Field label={fa ? 'کشور مقصد / بازار هدف' : 'Destination country / target market'} required>
                      <input required name="destination" placeholder={fa ? 'کشور یا منطقه مقصد' : 'Country or target region'} className="form-control" />
                    </Field>
                    <Field label={fa ? 'ایمیل کاری' : 'Business email'} required>
                      <input required type="email" name="email" placeholder="name@company.com" className="form-control" dir="ltr" />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={fa ? 'نام برند یا محصول' : 'Brand or product name'} required>
                      <input required name="brand" placeholder={fa ? 'نام برند یا کاتالوگ' : 'Brand or catalog name'} className="form-control" />
                    </Field>
                    <Field label={fa ? 'هدف کمپین' : 'Campaign objective'}>
                      <select name="objective" className="form-control">
                        <option value="clicks">{fa ? 'افزایش کلیک روی محصول' : 'Increase product clicks'}</option>
                        <option value="leads">{fa ? 'دریافت سرنخ تجاری' : 'Generate business leads'}</option>
                        <option value="brand">{fa ? 'معرفی برند' : 'Brand awareness'}</option>
                      </select>
                    </Field>
                    <Field label={fa ? 'صفحه یا کاتالوگ هدف' : 'Destination page or catalog'}>
                      <input name="destination" placeholder="https://..." className="form-control" dir="ltr" />
                    </Field>
                    <Field label={fa ? 'ایمیل کاری' : 'Business email'} required>
                      <input required type="email" name="email" placeholder="name@company.com" className="form-control" dir="ltr" />
                    </Field>
                  </>
                )}

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-6 text-amber-900">
                  {fa
                    ? 'این فرم فقط پیش‌نمایش رابط کاربری است؛ اطلاعات به سرور ارسال یا ذخیره نمی‌شود و هیچ کمپین یا RFQ واقعی ایجاد نمی‌کند.'
                    : 'This is a UI preview only. Data is not sent to or stored on a server, and no live campaign or RFQ is created.'}
                </div>
                <button type="submit" className="w-full rounded-full bg-afx-orange px-5 py-3 text-sm font-black text-afx-price transition hover:bg-afx-orange-hover">
                  {fa ? 'تکمیل پیش‌نمایش' : 'Complete preview'}
                </button>
              </form>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-bold text-afx-price">
      <span>{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  )
}

export const MarketplaceHome = memo(function MarketplaceHome({ initialLocale }: { initialLocale: Locale }) {
  return <MarketplaceHomeView initialLocale={initialLocale} />
})
