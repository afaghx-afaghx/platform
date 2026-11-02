'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Layers3, Search } from 'lucide-react'
import { PRODUCT_BASKETS } from '@/lib/product-baskets'
import { PRODUCTS } from '@/lib/catalog'
import type { Locale } from '@/lib/types'

export function BasketDirectory({ locale }: { locale: Locale }) {
  const fa = locale === 'fa'
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')
  const Arrow = fa ? ArrowLeft : ArrowRight
  const baskets = useMemo(() => PRODUCT_BASKETS.filter((basket) => {
    const q = query.trim().toLocaleLowerCase()
    return !q || basket.name.fa.toLocaleLowerCase().includes(q) || basket.name.en.toLocaleLowerCase().includes(q)
  }), [query])
  const visible = showAll || query ? baskets : baskets.filter((basket) => basket.featured)
  const countFor = (ids: string[]) => PRODUCTS.filter((product) => ids.includes(product.id)).length

  return (
    <section id="product-baskets" className="mt-5 rounded-2xl border border-afx-border bg-white p-4 shadow-sm sm:p-5" aria-labelledby="basket-directory-title" dir={fa ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-afx-link">{fa ? 'کاتالوگ ساختاریافته AFAGHX' : 'AFAGHX STRUCTURED CATALOG'}</p>
          <h2 id="basket-directory-title" className="mt-1 text-lg font-black text-afx-price sm:text-xl">{fa ? '۳۶ سبد کالایی' : '36 Product Baskets'}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">{fa ? 'دسته‌های پربازدید را سریع باز کنید یا تمام سبدها را برای یافتن گروه کالایی موردنظر مرور کنید.' : 'Open popular baskets quickly or browse all baskets to find the right product group.'}</p>
        </div>
        <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search size={16} className="text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={fa ? 'جست‌وجو در سبدهای کالایی' : 'Search product baskets'} placeholder={fa ? 'جست‌وجوی سبد کالا' : 'Search baskets'} className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400 sm:w-52" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((basket, index) => {
          const count = countFor(basket.productIds)
          return (
            <Link key={basket.id} href={`/categories/${basket.id}`} className="group flex min-h-32 flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-sky-300 hover:bg-sky-50/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600">
              <div className="flex items-center justify-between gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-white text-xs font-black text-slate-500 ring-1 ring-slate-200">{String(index + 1).padStart(2, '0')}</span>
                <Layers3 size={16} className="text-sky-700" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-sm font-bold leading-5 text-afx-price">{basket.name[locale]}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{basket.description[locale]}</p>
              <span className="mt-auto pt-3 text-[11px] font-bold text-afx-link">{count ? (fa ? `${count} کالای ثبت‌شده` : `${count} catalog items`) : (fa ? 'تکمیل کاتالوگ در حال انجام' : 'Catalog expansion pending')} <Arrow size={13} className="inline" aria-hidden="true" /></span>
            </Link>
          )
        })}
      </div>
      {!query && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={() => setShowAll((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-bold text-afx-price hover:bg-slate-50">
            {showAll ? (fa ? 'نمایش دسته‌های پربازدید' : 'Show popular baskets') : (fa ? 'مشاهده همه ۳۶ سبد کالا' : 'View all 36 baskets')}
            {showAll ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>
        </div>
      )}
    </section>
  )
}
