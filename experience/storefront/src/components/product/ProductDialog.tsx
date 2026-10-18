'use client'

import { memo, useCallback, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useApp } from '@/store/app-store'
import { dict } from '@/lib/i18n'
import { discountPercent, fill, formatNumber, formatPrice, formatRating, toFaDigits } from '@/lib/format'
import type { Locale, Product } from '@/lib/types'
import { Stars } from './Stars'
import { ProductImage } from './ProductImage'
import { cn } from '@/lib/utils'

interface ProductDialogProps {
  product: Product | null
  locale: Locale
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Product detail dialog — Amazon product-page anatomy in miniature:
 * gallery, discount ribbon, title, rating, price block, feature list,
 * quantity stepper and dual CTAs. Focus trap handled by Radix; Esc closes.
 *
 * Qty state lives in the body component, which Radix unmounts on close —
 * so it resets to 1 on every open without any effect.
 */
export const ProductDialog = memo(function ProductDialog({
  product,
  locale,
  open,
  onOpenChange,
}: ProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {product && (
        <DialogContent
          aria-describedby={undefined}
          className="afx-scroll max-h-[90vh] overflow-y-auto bg-white p-0 sm:max-w-3xl"
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        >
          <DialogTitle className="sr-only">{product.title[locale]}</DialogTitle>
          <DialogBody product={product} locale={locale} onClose={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  )
})

const DialogBody = memo(function DialogBody({
  product,
  locale,
  onClose,
}: {
  product: Product
  locale: Locale
  onClose: () => void
}) {
  const d = dict.product
  const add = useApp((s) => s.add)
  const { toast } = useToast()
  const [qty, setQty] = useState(1)

  const handleAdd = useCallback(() => {
    if (product.stock <= 0) return
    add(product.id, qty)
    onClose()
    toast({
      title: d.addedToCart[locale],
      description: fill(d.addedToCartBody[locale], { title: product.title[locale] }),
    })
  }, [product, add, qty, onClose, toast, locale, d])

  const off = discountPercent(product)
  const fa = locale === 'fa'

  return (
    <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:p-6">
      {/* ── Gallery ─────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-afx-border bg-white">
          <ProductImage
            product={product}
            alt={product.title[locale]}
            sizes="(max-width: 640px) 90vw, 400px"
            className="object-contain p-4"
            priority
          />
        </div>
        {off > 0 && product.listPrice && (
          <div className="rounded-md bg-afx-deal/10 px-3 py-2 text-[13px] font-bold text-afx-deal">
            {(() => {
              const saved = {
                usd: product.listPrice!.usd - product.price.usd,
                toman: product.listPrice!.toman - product.price.toman,
              }
              return fa
                ? `${toFaDigits(off)}٪ ${d.off[locale]} — ${d.save[locale]} ${formatPrice(saved, locale)}`
                : `${d.save[locale]} ${formatPrice(saved, locale)} (${off}% ${d.off[locale]})`
            })()}
          </div>
        )}
      </div>

      {/* ── Info ────────────────────────────────── */}
      <div className="min-w-0">
        <p className="mb-1 text-[13px] afx-link">
          {fill(d.visitStore[locale], { brand: product.brand })}
        </p>
        <h2 className="text-[18px] font-bold leading-7 text-afx-price sm:text-[21px]">
          {product.title[locale]}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Stars rating={product.rating} size={15} />
          <span className="text-[13px] afx-link tabular">
            {formatNumber(product.reviewCount, locale)} {fa ? 'دیدگاه' : 'ratings'}
          </span>
          <span className="text-[13px] font-bold" style={{ color: 'var(--color-afx-star)' }}>
            {formatRating(product.rating, locale)}
          </span>
        </div>

        <div className="my-3 h-px bg-afx-border" aria-hidden="true" />

        {/* Price block */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {off > 0 && (
            <span className="rounded-sm bg-afx-deal px-2 py-0.5 text-[15px] font-bold text-white tabular">
              {fa ? `${toFaDigits(off)}٪` : `-${off}%`}
            </span>
          )}
          <span className="text-[26px] font-bold text-afx-price tabular">
            {formatPrice(product.price, locale)}
          </span>
          {product.listPrice && off > 0 && (
            <span className="text-[14px] text-muted-foreground line-through tabular">
              {formatPrice(product.listPrice, locale)}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] text-afx-green font-medium">
          {product.isPrime
            ? `${d.freeDelivery[locale]} — ${d.deliveryTomorrow[locale]}`
            : d.outOfStock[locale]}
        </p>
        <p className={cn('mt-1 text-[13px] font-medium', product.stock > 5 ? 'text-afx-green' : 'text-afx-deal')}>
          {product.stock > 5
            ? d.inStock[locale]
            : product.stock > 0
              ? fill(d.lowStock[locale], { n: fa ? toFaDigits(product.stock) : product.stock })
              : d.outOfStock[locale]}
        </p>

        {/* Description */}
        <p className="mt-3 text-[14px] leading-6 text-foreground/85">{product.description[locale]}</p>

        {/* Features */}
        <h3 className="mt-4 text-[15px] font-bold text-afx-price">{d.aboutItem[locale]}</h3>
        <ul className="mt-2 list-disc space-y-1.5 ps-5 text-[13.5px] leading-6 text-foreground/85 marker:text-muted-foreground">
          {product.features[locale].map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] font-medium" htmlFor="pdp-qty">
            {d.quantity[locale]}
          </label>
          <div className="flex items-center rounded-lg border border-afx-border" role="group" aria-label={d.quantity[locale]}>
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label={dict.cart.decrease[locale]}
              className="h-9 w-9 rounded-s-lg text-[17px] font-bold text-afx-link transition hover:bg-afx-hover disabled:opacity-40"
            >
              −
            </button>
            <input
              id="pdp-qty"
              type="text"
              inputMode="numeric"
              value={fa ? toFaDigits(qty) : qty}
              onChange={(e) => {
                const digits = fa
                  ? e.target.value.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
                  : e.target.value
                const n = parseInt(digits, 10)
                if (!Number.isNaN(n)) setQty(Math.max(1, Math.min(99, n)))
              }}
              className="h-9 w-10 border-x border-afx-border bg-transparent text-center text-[14px] font-bold text-afx-price outline-none"
              aria-label={d.quantity[locale]}
            />
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              aria-label={dict.cart.increase[locale]}
              className="h-9 w-9 rounded-e-lg text-[17px] font-bold text-afx-link transition hover:bg-afx-hover"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="h-10 min-w-[140px] flex-1 rounded-full bg-afx-orange text-[14px] font-bold text-afx-price transition hover:bg-afx-orange-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {product.stock > 0 ? d.addToCart[locale] : d.outOfStock[locale]}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="h-10 min-w-[140px] flex-1 rounded-full bg-afx-squid text-[14px] font-bold text-afx-price transition hover:bg-afx-squid-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {d.buyNow[locale]}
          </button>
        </div>
      </div>
    </div>
  )
})
