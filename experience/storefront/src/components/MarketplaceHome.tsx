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
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SubNav } from '@/components/layout/SubNav'
import { CategoryGrid } from '@/components/home/CategoryGrid'
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
      .sort((a, b) => discountPercent(b) - discountPercent(a)),
    []
  )
  const bestSellers = useMemo(
    () => PRODUCTS.filter((product) => product.badge === 'best-seller' || product.rating >= 4.7).slice(0, 10),
    []
  )
  const recommended = useMemo(
    () => [...PRODUCTS].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 12),
    []
  )
  const promotedPreview = useMemo(() => [PRODUCTS[0], PRODUCTS[5], PRODUCTS[8]], [])

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
      <div className="bg-[#0b1722] text-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px] sm:px-6 sm:text-xs">
          <p className="flex items-center gap-2 text-white/75">
            <Globe2 size={14} className="text-afx-squid" aria-hidden="true" />
            <span>{fa ? 'تجارت، تأمین و خرید در یک شبکه' : 'Commerce, sourcing and shopping in one network'}</span>
          </p>
          <nav aria-label={fa ? 'دسترسی سریع' : 'Quick access'} className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold">
            <a className="transition hover:text-afx-squid" href="#b2b">{fa ? 'خرید سازمانی' : 'Business buying'}</a>
            <a className="transition hover:text-afx-squid" href="#b2c">{fa ? 'خرید شخصی' : 'Personal shopping'}</a>
            <a className="transition hover:text-afx-squid" href="#advertising">{fa ? 'تبلیغات' : 'Advertising'}</a>
            <Link className="transition hover:text-afx-squid" href="/suppliers">{fa ? 'شبکه تأمین‌کنندگان' : 'Supplier network'}</Link>
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
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#101d2a] via-[#1a3444] to-[#245357] text-white shadow-xl">
              <div aria-hidden="true" className="pointer-events-none absolute -end-28 -top-28 h-[390px] w-[390px] rounded-full border border-white/10" />
              <div aria-hidden="true" className="pointer-events-none absolute -end-12 -top-12 h-[260px] w-[260px] rounded-full border border-white/10" />
              <div aria-hidden="true" className="pointer-events-none absolute bottom-0 start-0 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative grid items-center gap-8 p-6 sm:p-9 lg:grid-cols-[1.1fr_.9fr] lg:p-12">
                <div className="max-w-3xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black tracking-[0.16em] text-cyan-100">
                    <Zap size={14} aria-hidden="true" />
                    AFAGHX GLOBAL COMMERCE
                  </div>
                  <h1 className="max-w-3xl text-3xl font-black leading-[1.2] sm:text-4xl lg:text-[3.25rem]">
                    {fa ? 'از خرید روزمره تا تأمین جهانی؛ یک تجربه تجاری یکپارچه' : 'From everyday shopping to global sourcing — one connected commerce experience'}
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-8 text-white/75 sm:text-base">
                    {fa
                      ? 'خرید B2C، تأمین B2B، کشف تولیدکننده و جایگاه‌های تبلیغاتی را در یک تجربه منسجم کنار هم قرار می‌دهیم؛ با مسیرهای روشن برای خریدار، کسب‌وکار و فروشنده.'
                      : 'Bring B2C shopping, B2B sourcing, producer discovery and sponsored placements into one coherent experience — with distinct journeys for consumers, businesses and sellers.'}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href="/products" className="inline-flex items-center gap-2 rounded-full bg-afx-squid px-6 py-3 text-sm font-black text-afx-price shadow-lg shadow-black/10 transition hover:bg-afx-squid-hover">
                      <ShoppingBag size={17} aria-hidden="true" />
                      {fa ? 'ورود به بازار کالاها' : 'Explore the product market'}
                      <Arrow size={16} aria-hidden="true" />
                    </Link>
                    <button type="button" onClick={() => openBusinessDialog('rfq')} className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                      <ClipboardList size={17} aria-hidden="true" />
                      {fa ? 'درخواست تأمین سازمانی' : 'Request business sourcing'}
                    </button>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/65">
                    <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" />{fa ? 'مسیر مجزای B2B و B2C' : 'Distinct B2B and B2C journeys'}</span>
                    <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" />{fa ? 'جست‌وجوی یکپارچه کالا' : 'Unified product discovery'}</span>
                    <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" />{fa ? 'تبلیغات با برچسب شفاف' : 'Clearly labelled ad placements'}</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">B2B · BUSINESS</span>
                        <h2 className="mt-2 text-lg font-black">{fa ? 'تأمین، استعلام و همکاری' : 'Source, quote and partner'}</h2>
                        <p className="mt-2 text-xs leading-6 text-white/65">{fa ? 'برای خرید عمده، نیاز خود را تعریف کنید و مسیر تأمین را آغاز کنید.' : 'Define a bulk requirement and start a structured sourcing journey.'}</p>
                      </div>
                      <span className="rounded-xl bg-cyan-300/15 p-3 text-cyan-100"><Building2 size={23} aria-hidden="true" /></span>
                    </div>
                    <button type="button" onClick={() => openBusinessDialog('rfq')} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-cyan-100 hover:text-white">
                      {fa ? 'شروع درخواست قیمت' : 'Start an RFQ'} <Arrow size={15} />
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">B2C · RETAIL</span>
                        <h2 className="mt-2 text-lg font-black">{fa ? 'کشف محصول و خرید شخصی' : 'Discover and shop products'}</h2>
                        <p className="mt-2 text-xs leading-6 text-white/65">{fa ? 'دسته‌بندی‌ها، پیشنهادها و محصولات نمونه را مرور کنید.' : 'Browse categories, offers and sample catalog products.'}</p>
                      </div>
                      <span className="rounded-xl bg-amber-300/15 p-3 text-amber-100"><ShoppingBag size={23} aria-hidden="true" /></span>
                    </div>
                    <Link href="/products" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-amber-100 hover:text-white">
                      {fa ? 'مشاهده محصولات' : 'Browse products'} <Arrow size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3" aria-label={fa ? 'سه مسیر اصلی تجارت' : 'Three commerce journeys'}>
              <a href="#b2b" className="group rounded-2xl border border-afx-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                <span className="inline-flex rounded-xl bg-sky-50 p-3 text-sky-800"><Factory size={22} aria-hidden="true" /></span>
                <h2 className="mt-3 font-black text-afx-price">{fa ? 'تأمین‌کنندگان و کارخانه‌ها' : 'Suppliers and factories'}</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{fa ? 'کشف ظرفیت تولید و آغاز استعلام سازمانی' : 'Discover production capabilities and start a business enquiry'}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-afx-link">{fa ? 'مسیر کسب‌وکار' : 'Business journey'} <Arrow size={14} /></span>
              </a>
              <a href="#b2c" className="group rounded-2xl border border-afx-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                <span className="inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-800"><ShoppingBag size={22} aria-hidden="true" /></span>
                <h2 className="mt-3 font-black text-afx-price">{fa ? 'بازار خرید مصرف‌کننده' : 'Consumer marketplace'}</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{fa ? 'مرور دسته‌بندی‌ها، مقایسه و افزودن به سبد' : 'Browse categories, compare and add products to cart'}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-afx-link">{fa ? 'ورود به بازار' : 'Enter the market'} <Arrow size={14} /></span>
              </a>
              <a href="#advertising" className="group rounded-2xl border border-afx-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                <span className="inline-flex rounded-xl bg-amber-50 p-3 text-amber-800"><Megaphone size={22} aria-hidden="true" /></span>
                <h2 className="mt-3 font-black text-afx-price">{fa ? 'تبلیغات و رشد فروش' : 'Advertising and growth'}</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{fa ? 'معرفی برند و جایگاه‌های تبلیغاتی قابل کلیک' : 'Promote brands and explore clickable ad placements'}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-afx-link">{fa ? 'معرفی محصول' : 'Promote a product'} <Arrow size={14} /></span>
              </a>
            </section>

            <section id="b2c" className="scroll-mt-28">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-afx-border bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-afx-link">B2C · CONSUMER COMMERCE</p>
                  <h2 className="mt-1 text-xl font-black text-afx-price sm:text-2xl">{sectionCopy.b2c.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{sectionCopy.b2c.body}</p>
                </div>
                <Link href="/products" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-afx-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-afx-navy-hover">
                  {fa ? 'همه محصولات' : 'All products'} <Arrow size={15} />
                </Link>
              </div>
              <CategoryGrid locale={locale} onCategory={handleCategory} />
              <div className="mt-4 space-y-4">
                <ProductRail
                  id="deals"
                  title={dict.sections.dealsTitle[locale]}
                  linkLabel={dict.sections.dealsLink[locale]}
                  products={deals}
                  locale={locale}
                  onOpen={openProduct}
                  onLink={handleDeals}
                />
                <ProductRail
                  title={dict.sections.bestSellersTitle[locale]}
                  linkLabel={dict.sections.bestSellersLink[locale]}
                  products={bestSellers}
                  locale={locale}
                  onOpen={openProduct}
                  onLink={handleBestSellers}
                />
              </div>
              <section className="mx-auto w-full max-w-[1500px] rounded-2xl border border-afx-border bg-white p-4 shadow-sm sm:p-6" aria-labelledby="market-recommended-title">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-afx-link">{fa ? 'کشف محصول' : 'PRODUCT DISCOVERY'}</p>
                    <h2 id="market-recommended-title" className="mt-1 text-xl font-black text-afx-price">{dict.sections.recommendedTitle[locale]}</h2>
                  </div>
                  <button type="button" onClick={handleReset} className="text-xs font-bold text-afx-link hover:underline">{fa ? 'مشاهده کاتالوگ' : 'Browse catalog'} <Arrow size={13} className="inline" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {recommended.map((product) => (
                    <ProductCard key={product.id} product={product} locale={locale} onOpen={openProduct} />
                  ))}
                </div>
              </section>
            </section>

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

                <div className="grid gap-3 sm:grid-cols-2">
                  <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                    <span className="inline-flex rounded-xl bg-sky-50 p-3 text-sky-800"><PackageSearch size={22} /></span>
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'درخواست استعلام قیمت' : 'Request for quotation'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'مشخصات کالا، حجم مورد نیاز و مقصد را یک‌جا تعریف کنید.' : 'Describe the item, estimated volume and destination in one structured request.'}</p>
                    <button onClick={() => openBusinessDialog('rfq')} className="mt-4 text-xs font-black text-afx-link">{fa ? 'شروع پیش‌نویس' : 'Start a draft'} <Arrow size={13} className="inline" /></button>
                  </article>
                  <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                    <span className="inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-800"><Truck size={22} /></span>
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'تأمین و لجستیک' : 'Sourcing and logistics'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'اطلاعات مبدأ، مقصد و شرایط تحویل را در فرایند تأمین لحاظ کنید.' : 'Account for origin, destination and delivery requirements in sourcing workflows.'}</p>
                    <Link href="/markets" className="mt-4 inline-flex text-xs font-black text-afx-link">{fa ? 'کاوش بازارها' : 'Explore markets'} <Arrow size={13} /></Link>
                  </article>
                  <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                    <span className="inline-flex rounded-xl bg-violet-50 p-3 text-violet-800"><Building2 size={22} /></span>
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'خرید شرکتی' : 'Company purchasing'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'مسیر خرید سازمانی از خرید شخصی جدا طراحی می‌شود.' : 'The business purchasing journey is designed separately from personal retail.'}</p>
                    <Link href="/business-network" className="mt-4 inline-flex text-xs font-black text-afx-link">{fa ? 'شبکه کسب‌وکار' : 'Business network'} <Arrow size={13} /></Link>
                  </article>
                  <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                    <span className="inline-flex rounded-xl bg-amber-50 p-3 text-amber-800"><BadgeCheck size={22} /></span>
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'اعتماد و شفافیت' : 'Trust and transparency'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'اعتبارسنجی طرف معامله و شرایط قرارداد باید با شواهد مستقل انجام شود.' : 'Counterparty verification and contract terms must be backed by independent evidence.'}</p>
                    <span className="mt-4 block text-[10px] font-bold text-amber-800">{fa ? 'نیازمند اتصال به زیرساخت اعتماد' : 'Requires Trust Foundation integration'}</span>
                  </article>
                </div>
              </div>
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

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {promotedPreview.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProduct(product)}
                    className="group relative flex min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-white p-4 text-start text-afx-price transition hover:-translate-y-1 hover:shadow-xl"
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

            <section className="rounded-3xl border border-afx-border bg-white p-5 shadow-sm sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-afx-link">AFAGHX BUSINESS NETWORK</p>
                  <h2 className="mt-2 text-2xl font-black text-afx-price sm:text-3xl">{fa ? 'برای خریدار، تولیدکننده و فروشنده؛ مسیر مشخص بسازید' : 'Clear journeys for buyers, producers and sellers'}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{fa ? 'AFAGHX تنها یک فهرست محصول نیست؛ تجربه تجارت باید به کشف، استعلام، مذاکره، سفارش و رشد کسب‌وکار متصل شود. هر مرحله به سرویس و کنترل اجرایی خودش نیاز دارد.' : 'AFAGHX is more than a product listing. The commerce experience should connect discovery, quotation, negotiation, ordering and business growth — each backed by its own service and control.'}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/business-network" className="rounded-full bg-afx-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-afx-navy-hover">{fa ? 'معرفی شبکه کسب‌وکار' : 'Explore the business network'}</Link>
                    <Link href="/factories" className="rounded-full border border-afx-border px-5 py-2.5 text-sm font-bold text-afx-price hover:bg-afx-hover">{fa ? 'کشف کارخانه‌ها' : 'Discover factories'}</Link>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <ShieldCheck size={24} className="text-emerald-700" />
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'اعتماد در سطح پلتفرم' : 'Platform-level trust'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'هویت، مجوزها و زمینه سازمانی باید از هسته معتبر تأمین شوند.' : 'Identity, authorization and organization context must come from the trusted platform core.'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <Globe2 size={24} className="text-sky-700" />
                    <h3 className="mt-3 font-black text-afx-price">{fa ? 'تجربه بین‌المللی' : 'International experience'}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{fa ? 'زبان، ارز، منطقه و شرایط تحویل باید متناسب با بازار هدف باشند.' : 'Language, currency, region and delivery terms must adapt to the target market.'}</p>
                  </div>
                </div>
              </div>
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
