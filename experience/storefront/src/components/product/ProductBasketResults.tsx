'use client'

import { useCallback, useState } from 'react'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductDialog } from '@/components/product/ProductDialog'
import type { Locale, Product } from '@/lib/types'

export function ProductBasketResults({ products, locale }: { products: Product[]; locale: Locale }) {
  const [active, setActive] = useState<Product | null>(null)
  const [open, setOpen] = useState(false)
  const onOpen = useCallback((product: Product) => { setActive(product); setOpen(true) }, [])
  const visibleProducts = products.slice(0, 4)
  const slots = Array.from({ length: 4 }, (_, index) => visibleProducts[index] ?? null)
  return <>
    <section data-testid="category-four-product-slots" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={locale === 'fa' ? 'چهار جایگاه محصول این سبد' : 'Four product positions in this basket'}>
      {slots.map((product, index) => product ? (
        <div key={product.id} data-testid="category-product-slot">
          <ProductCard product={product} locale={locale} onOpen={onOpen} />
        </div>
      ) : (
        <div key={`empty-${index}`} data-testid="category-product-slot" className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-sm font-black tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>
          <strong className="mt-3 text-sm font-bold text-slate-600">{locale === 'fa' ? 'جایگاه محصول خالی' : 'Empty product position'}</strong>
          <span className="mt-1 text-xs leading-5 text-slate-400">{locale === 'fa' ? 'پس از انتشار کالای معتبر تکمیل می‌شود' : 'Reserved for a valid published product'}</span>
        </div>
      ))}
    </section>
    <ProductDialog product={active} locale={locale} open={open} onOpenChange={setOpen} />
  </>
}
