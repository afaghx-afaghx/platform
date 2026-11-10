'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Package, Search } from 'lucide-react'
import { auditProductBaskets, PRODUCT_BASKETS } from '@/lib/product-baskets'
import { PRODUCTS } from '@/lib/catalog'
import { ProductImage } from '@/components/product/ProductImage'
import type { Locale, Product } from '@/lib/types'

const basketAudit = auditProductBaskets(PRODUCTS.map((product) => product.id))
if (!basketAudit.isValid) {
  throw new Error(`Invalid AFAGHX product basket taxonomy: ${JSON.stringify(basketAudit)}`)
}

const PRODUCTS_BY_ID = new Map<string, Product>(PRODUCTS.map((product) => [product.id, product]))
const TILE_BACKGROUNDS = ['bg-sky-50', 'bg-teal-50', 'bg-emerald-50', 'bg-indigo-50'] as const

export function BasketDirectory({ locale }: { locale: Locale }) {
  const fa = locale === 'fa'
  const [query, setQuery] = useState('')
  const Arrow = fa ? ArrowLeft : ArrowRight

  const baskets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return PRODUCT_BASKETS

    return PRODUCT_BASKETS.filter((basket) =>
      basket.name.fa.toLocaleLowerCase().includes(normalizedQuery) ||
      basket.name.en.toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [query])

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
            {fa ? '۳۶ سبد کالایی' : '36 Product Baskets'}
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
            aria-label={fa ? 'جست‌وجو در ۳۶ سبد کالا' : 'Search 36 product baskets'}
            placeholder={fa ? 'جست‌وجو در سبدها…' : 'Search baskets…'}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="basket-grid"
        aria-label={fa ? 'فهرست ۳۶ سبد کالا' : '36 product basket directory'}
      >
        {baskets.map((basket) => {
          const products = basket.productIds
            .map((productId) => PRODUCTS_BY_ID.get(productId))
            .filter((product): product is Product => Boolean(product))
            .slice(0, 4)

          return (
            <Link
              key={basket.id}
              href={`/categories/${basket.id}`}
              data-testid="basket-card"
              data-basket-id={basket.id}
              className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 sm:p-4"
            >
              <div className="flex min-h-11 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-black leading-6 text-slate-950 sm:text-base">
                    {basket.name[locale]}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-slate-500">
                    {basket.description[locale]}
                  </p>
                </div>
                <Arrow size={18} className="mt-1 shrink-0 text-sky-700 transition-transform group-hover:translate-x-[-2px]" aria-hidden="true" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2" aria-label={fa ? 'چهار جایگاه تصویر محصول' : 'Four product image positions'}>
                {Array.from({ length: 4 }, (_, slotIndex) => {
                  const product = products[slotIndex]
                  const imageTitle = product?.title[locale]

                  return (
                    <div
                      key={slotIndex}
                      data-testid="basket-product-slot"
                      className="min-w-0"
                      aria-label={imageTitle ?? (fa ? `جایگاه ${slotIndex + 1} در انتظار کالای معتبر` : `Position ${slotIndex + 1} awaiting a verified product`)}
                    >
                      <div className={`relative aspect-[1.12/1] overflow-hidden rounded-xl ${TILE_BACKGROUNDS[slotIndex]}`}>
                        {product ? (
                          <ProductImage
                            product={product}
                            alt={product.title[locale]}
                            sizes="(max-width: 639px) 44vw, (max-width: 1023px) 22vw, 12vw"
                            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex size-full flex-col items-center justify-center gap-2 border border-dashed border-slate-200/80 bg-white/30 text-slate-400">
                            <Package size={24} strokeWidth={1.5} aria-hidden="true" />
                            <span className="px-2 text-center text-[10px] font-medium leading-4">
                              {fa ? 'در انتظار ثبت کالا' : 'Awaiting product'}
                            </span>
                          </div>
                        )}
                      </div>
                      <span
                        className="mt-1.5 block min-h-8 break-words text-[11px] font-semibold leading-4 text-slate-700 line-clamp-2 sm:text-xs"
                        title={imageTitle ?? (fa ? 'کالای معتبر پس از ثبت نمایش داده می‌شود' : 'A verified product will appear after publication')}
                      >
                        {imageTitle ?? (fa ? 'کالای معتبر پس از ثبت' : 'Verified product pending')}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                <span className="text-[10px] leading-4 text-slate-500 sm:text-[11px]">
                  {fa ? `${products.length} از ۴ جایگاه دارای کالای نمونه` : `${products.length} of 4 positions populated with sample products`}
                </span>
                <span className="shrink-0 text-[10px] font-bold text-sky-700 sm:text-[11px]">
                  {fa ? 'مشاهده سبد' : 'Explore basket'}
                </span>
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
        <span>{fa ? `نمایش ${baskets.length} از ۳۶ سبد کالا` : `Showing ${baskets.length} of 36 baskets`}</span>
        <span>
          {fa
            ? 'تصاویر واقعی هر سبد پس از تأیید کالا و مجوز استفاده از تصویر توسط فروشنده نمایش داده می‌شوند.'
            : 'Verified product images appear after product approval and image-use authorization.'}
        </span>
      </div>
    </section>
  )
}
