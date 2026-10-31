'use client'

import { memo, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useApp } from '@/store/app-store'
import { dict } from '@/lib/i18n'
import { discountPercent, fill, formatPrice, formatNumber, toFaDigits } from '@/lib/format'
import type { Product } from '@/lib/types'
import { Stars } from './Stars'
import { ProductImage } from './ProductImage'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  locale: 'fa' | 'en'
  onOpen: (p: Product) => void
  /** Compact variant used inside horizontal rails */
  compact?: boolean
}

function Badge({ product, locale }: { product: Product; locale: 'fa' | 'en' }) {
  const d = dict.product
  const off = discountPercent(product)
  if (product.badge === 'limited-deal' || (off > 0 && product.badge === 'best-seller')) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded-sm bg-afx-deal px-2 py-0.5 text-[11px] font-bold text-white tabular">
          {off > 0 && (
            <>
              {locale === 'fa' ? toFaDigits(off) + '٪' : off + '%'} {d.off[locale]}
            </>
          )}
          {off === 0 && d.limitedDeal[locale]}
        </span>
        <span className="text-[11px] font-bold text-afx-deal">{d.limitedDeal[locale]}</span>
      </span>
    )
  }
  if (product.badge === 'best-seller') {
    return (
      <span className="rounded-sm bg-afx-navy px-2 py-0.5 text-[11px] font-bold text-afx-squid">
        {d.bestSeller[locale]}
      </span>
    )
  }
  if (product.badge === 'choice') {
    return (
      <span className="rounded-sm bg-afx-navy-light px-2 py-0.5 text-[11px] font-bold text-afx-squid">
        {d.choice[locale]}
      </span>
    )
  }
  if (product.badge === 'new-arrival') {
    return (
      <span className="rounded-sm bg-afx-green px-2 py-0.5 text-[11px] font-bold text-white">
        {d.newArrival[locale]}
      </span>
    )
  }
  if (off >= 15) {
    return (
      <span className="rounded-sm bg-afx-deal px-2 py-0.5 text-[11px] font-bold text-white tabular">
        {locale === 'fa' ? toFaDigits(off) + '٪' : off + '%'} {d.off[locale]}
      </span>
    )
  }
  return null
}

export const ProductCard = memo(function ProductCard({
  product,
  locale,
  onOpen,
  compact = false,
}: ProductCardProps) {
  const add = useApp((s) => s.add)
  const { toast } = useToast()
  const d = dict.product

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (product.stock <= 0) return
      add(product.id)
      toast({
        title: d.addedToCart[locale],
        description: fill(d.addedToCartBody[locale], { title: product.title[locale] }),
      })
    },
    [add, product.id, product.stock, product.title, locale, toast, d]
  )

  const open = useCallback(() => onOpen(product), [onOpen, product])
  const off = discountPercent(product)

  return (
    <article
      className={cn(
        'group flex flex-col rounded-lg bg-card p-3 transition-shadow duration-200',
        'hover:shadow-[0_2px_12px_rgba(15,17,17,0.15)]',
        compact && 'w-[200px] shrink-0 sm:w-[224px]'
      )}
    >
      <button
        type="button"
        data-product-details
        onClick={open}
        aria-label={locale === 'fa' ? 'مشاهده جزئیات ' + product.title[locale] : 'View details for ' + product.title[locale]}
        className="flex w-full min-w-0 flex-1 flex-col rounded-md text-start"
      >
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-white">
          <ProductImage
            product={product}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 224px"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
            alt={product.title[locale]}
          />
        </div>

        <div className="mb-1.5 min-h-[20px]">
          <Badge product={product} locale={locale} />
        </div>

        <h3
          className={cn(
            'line-clamp-2-fa text-[13px] leading-5 text-foreground/90 transition-colors group-hover:text-afx-link-hover',
            locale === 'fa' && 'text-right'
          )}
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        >
          {product.title[locale]}
        </h3>

        <div className="mt-1 flex items-center gap-1.5">
          <Stars rating={product.rating} size={13} />
          <span className="text-[11px] afx-link tabular">
            {formatNumber(product.reviewCount, locale)}
          </span>
        </div>

        <div className="mt-auto pt-2" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          {product.listPrice && off > 0 && (
            <span className="text-[12px] text-muted-foreground line-through tabular">
              {formatPrice(product.listPrice, locale)}
            </span>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[17px] font-bold text-afx-price tabular">
              {formatPrice(product.price, locale)}
            </span>
          </div>
          {product.isPrime && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px]">
              <span className="font-bold text-afx-link">✓ AFAGHX</span>
              <span className="text-muted-foreground">{d.freeDelivery[locale]}</span>
            </div>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={handleAdd}
        disabled={product.stock <= 0}
        className={cn(
          'mt-2.5 w-full rounded-full bg-afx-orange py-1.5 text-[13px] font-bold text-afx-price',
          'transition-colors hover:bg-afx-orange-hover active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-afx-orange',
          'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100',
          'transition-opacity duration-200'
        )}
      >
        {product.stock > 0 ? d.addToCart[locale] : d.outOfStock[locale]}
      </button>
    </article>
  )
})
