'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Bed, BookOpen, Briefcase, Car, CircleDot, Coffee, Cpu, Dumbbell,
  Factory, FlaskConical, Footprints, Gem, Gift, Handshake, HardHat, HeartPulse,
  House, Laptop, Layers, Lightbulb, Luggage, Mountain, Package, Plug, Recycle, Refrigerator,
  Settings, ShieldCheck, Shirt, Sofa, Sparkles, Sprout, Zap, Search, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PRODUCT_BASKETS } from '@/lib/product-baskets'
import { PRODUCTS } from '@/lib/catalog'
import { ProductImage } from '@/components/product/ProductImage'
import type { Locale } from '@/lib/types'

const BASKET_ICONS: LucideIcon[] = [
  Coffee, Shirt, Car, Refrigerator, Laptop, Factory, Plug, Package, BookOpen,
  Zap, Recycle, Layers, Bed, Sparkles, Gift, Sofa, House, Gem,
  Gem, Cpu, Briefcase, Lightbulb, HardHat, Sparkles, HeartPulse, Sprout,
  Mountain, FlaskConical, CircleDot, Luggage, Footprints, Dumbbell, Wrench,
  ShieldCheck,
]

const ACCENTS = [
  'bg-sky-50 text-sky-700 ring-sky-100',
  'bg-teal-50 text-teal-700 ring-teal-100',
  'bg-indigo-50 text-indigo-700 ring-indigo-100',
  'bg-amber-50 text-amber-700 ring-amber-100',
  'bg-violet-50 text-violet-700 ring-violet-100',
  'bg-emerald-50 text-emerald-700 ring-emerald-100',
]

export function BasketDirectory({ locale }: { locale: Locale }) {
  const fa = locale === 'fa'
  const [query, setQuery] = useState('')
  const Arrow = fa ? ArrowLeft : ArrowRight
  const baskets = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return PRODUCT_BASKETS.filter((basket) =>
      !q || basket.name.fa.toLocaleLowerCase().includes(q) || basket.name.en.toLocaleLowerCase().includes(q)
    )
  }, [query])
  const productsFor = (ids: string[]) => ids
    .map((id) => PRODUCTS.find((product) => product.id === id))
    .filter((product): product is (typeof PRODUCTS)[number] => Boolean(product))
    .slice(0, 4)

  return (
    <section
      id="product-baskets"
      className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-5"
      aria-labelledby="basket-directory-title"
      dir={fa ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
            {fa ? 'کاتالوگ ساختاریافته AFAGHX' : 'AFAGHX STRUCTURED CATALOG'}
          </p>
          <h2 id="basket-directory-title" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            {fa ? '۳۴ سبد کالایی مصوب' : '34 Approved Product Baskets'}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-600 sm:text-sm">
            {fa
              ? 'از کالاهای مصرفی تا تجهیزات صنعتی و خدمات تجاری؛ مسیر مناسب را انتخاب کنید.'
              : 'From consumer goods to industrial equipment and business services, choose the right path.'}
          </p>
        </div>
        <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100 sm:w-64">
          <Search size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={fa ? 'جست‌وجو در ۳۴ سبد کالا' : 'Search 34 product baskets'}
            placeholder={fa ? 'جست‌وجو در سبدها…' : 'Search baskets…'}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4" data-testid="basket-grid">
        {baskets.map((basket) => {
          const index = PRODUCT_BASKETS.findIndex((item) => item.id === basket.id)
          const Icon = BASKET_ICONS[index] ?? Layers
          const products = productsFor(basket.productIds)
          const count = products.length
          return (
            <Link
              key={basket.id}
              href={`/categories/${basket.id}`}
              data-testid="basket-card"
              data-basket-id={basket.id}
              className="group relative flex min-h-[205px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 sm:min-h-[218px] sm:p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${ACCENTS[index % ACCENTS.length]}`}>
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold tabular-nums text-slate-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-3 break-words text-xs font-extrabold leading-5 text-slate-900 sm:text-sm">
                {basket.name[locale]}
              </h3>
              <div className="mt-3 grid grid-cols-4 gap-1" aria-label={fa ? 'چهار جایگاه محصول نمونه' : 'Four sample product positions'}>
                {Array.from({ length: 4 }, (_, slotIndex) => {
                  const product = products[slotIndex]
                  return (
                    <span
                      key={slotIndex}
                      data-testid="basket-product-slot"
                      aria-label={product ? (fa ? `محصول نمونه ${slotIndex + 1}` : `Sample product ${slotIndex + 1}`) : (fa ? `جایگاه خالی ${slotIndex + 1}` : `Empty slot ${slotIndex + 1}`)}
                      title={product ? product.title[locale] : (fa ? 'جایگاه آماده برای کالای ثبت‌شده' : 'Reserved for a published product')}
                      className="relative flex h-11 min-w-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-200 bg-slate-50"
                    >
                      {product ? (
                        <ProductImage product={product} alt="" sizes="44px" className="object-contain p-1" />
                      ) : (
                        <span aria-hidden="true" className="text-[9px] font-bold tabular-nums text-slate-300">{String(slotIndex + 1).padStart(2, '0')}</span>
                      )}
                    </span>
                  )
                })}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="min-w-0 text-[10px] leading-4 text-slate-500 sm:text-[11px]">
                  {fa ? `${count} از ۴ محصول نمونه` : `${count} of 4 sample products`}
                </span>
                <Arrow size={14} className="shrink-0 text-sky-700 transition-transform group-hover:translate-x-[-2px]" aria-hidden="true" />
              </div>
            </Link>
          )
        })}
      </div>
      {baskets.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-600" role="status">
          {fa ? 'سبدی با این عبارت پیدا نشد.' : 'No baskets match this search.'}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">
        <span>{fa ? `نمایش ${baskets.length} از ۳۴ سبد کالا` : `Showing ${baskets.length} of 34 baskets`}</span>
        <span>{fa ? 'در هر سبد چهار جایگاه پیش‌نمایش وجود دارد؛ موارد خالی فقط جایگاه هستند، نه محصول ساختگی.' : 'Each basket has four preview positions; empty positions are placeholders, not fabricated products.'}</span>
      </div>
    </section>
  )
}
