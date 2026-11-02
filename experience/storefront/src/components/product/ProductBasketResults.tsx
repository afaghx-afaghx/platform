'use client'

import { useCallback, useState } from 'react'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductDialog } from '@/components/product/ProductDialog'
import type { Locale, Product } from '@/lib/types'

export function ProductBasketResults({ products, locale }: { products: Product[]; locale: Locale }) {
  const [active, setActive] = useState<Product | null>(null)
  const [open, setOpen] = useState(false)
  const onOpen = useCallback((product: Product) => { setActive(product); setOpen(true) }, [])
  return <>
    <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label={locale === 'fa' ? 'محصولات این سبد' : 'Products in this basket'}>
      {products.map((product) => <ProductCard key={product.id} product={product} locale={locale} onOpen={onOpen} />)}
    </section>
    <ProductDialog product={active} locale={locale} open={open} onOpenChange={setOpen} />
  </>
}
