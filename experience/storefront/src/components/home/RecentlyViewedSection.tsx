'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Clock3, History, Trash2 } from 'lucide-react'
import { PRODUCTS } from '@/lib/catalog'
import type { Locale, Product } from '@/lib/types'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductDialog } from '@/components/product/ProductDialog'
import {
  clearRecentlyViewed,
  parseRecentlyViewedSnapshot,
  readRecentlyViewedSnapshot,
  recordRecentlyViewed,
  subscribeRecentlyViewed,
} from '@/lib/recently-viewed'

export function RecentlyViewedSection({ locale, full = false }: { locale: Locale; full?: boolean }) {
  const fa = locale === 'fa'
  const snapshot = useSyncExternalStore(subscribeRecentlyViewed, readRecentlyViewedSnapshot, () => '[]')
  const entries = useMemo(() => parseRecentlyViewedSnapshot(snapshot), [snapshot])
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const products = useMemo(() => {
    const byId = new Map(PRODUCTS.map((product) => [product.id, product]))
    return entries.map((entry) => ({ entry, product: byId.get(entry.productId) }))
      .filter((item): item is { entry: (typeof entries)[number]; product: Product } => !!item.product)
  }, [entries])

  const openProduct = useCallback((product: Product) => {
    recordRecentlyViewed(product.id)
    setActiveProduct(product)
    setDialogOpen(true)
  }, [])

  return (
    <section aria-labelledby="recently-viewed-title" dir={fa ? 'rtl' : 'ltr'} className="rounded-2xl border border-afx-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><History size={20} aria-hidden="true" /></span>
          <div>
            <h2 id="recently-viewed-title" className="text-base font-black text-afx-price sm:text-lg">{fa ? (full ? 'تاریخچه کامل بازدیدها' : 'آخرین بازدیدهای شما') : (full ? 'Your full viewing history' : 'Recently viewed')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{fa ? 'محصولاتی که جزئیات آن‌ها را باز کرده‌اید، اینجا نگهداری می‌شوند.' : 'Products whose details you opened appear here.'}</p>
          </div>
        </div>
        {products.length > 0 && (
          <button type="button" onClick={clearRecentlyViewed} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Trash2 size={14} aria-hidden="true" /> {fa ? 'پاک‌کردن تاریخچه' : 'Clear history'}
          </button>
        )}
      </div>
      {products.length ? (
        <div className={full ? 'mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'}>
          {(full ? products : products.slice(0, 4)).map(({ entry, product }) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} locale={locale} onOpen={openProduct} />
              <p className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground"><Clock3 size={11} aria-hidden="true" />{fa ? new Date(entry.viewedAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : new Date(entry.viewedAt).toLocaleString('en', { dateStyle: 'short', timeStyle: 'short' })}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <History size={28} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-afx-price">{fa ? 'هنوز محصولی در تاریخچه شما ثبت نشده است' : 'No recently viewed products yet'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{fa ? 'برای ثبت محصول، جزئیات آن را از کارت محصول باز کنید.' : 'Open a product card to add it to your history.'}</p>
          <Link href="/products" className="mt-3 inline-flex min-h-9 items-center rounded-full bg-afx-navy px-4 text-xs font-bold text-white">{fa ? 'مرور محصولات' : 'Browse products'}</Link>
        </div>
      )}
      {!full && products.length > 0 && (
        <div className="mt-3 flex justify-end">
          <Link href="/account/history" className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold text-afx-link hover:bg-sky-50">{fa ? 'مشاهده تاریخچه کامل' : 'View full history'} ←</Link>
        </div>
      )}
      <ProductDialog product={activeProduct} locale={locale} open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  )
}
