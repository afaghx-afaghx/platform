'use client'

import { memo, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { useApp, cartCount } from '@/store/app-store'
import { dict } from '@/lib/i18n'
import { formatPrice } from '@/lib/format'
import { findProduct } from '@/lib/catalog'
import type { Locale } from '@/lib/types'
import { ProductImage } from '@/components/product/ProductImage'

/**
 * Cart drawer (Amazon side-sheet pattern): line items with steppers,
 * remove, gift option, subtotal and checkout CTA. Cart state lives in
 * the persisted store; this component is a pure projection of it.
 */
export const CartSheet = memo(function CartSheet({ locale }: { locale: Locale }) {
  const d = dict.cart
  const open = useApp((s) => s.cartOpen)
  const setOpen = useApp((s) => s.setCartOpen)
  const lines = useApp((s) => s.lines)
  const setQty = useApp((s) => s.setQty)
  const remove = useApp((s) => s.remove)
  const clear = useApp((s) => s.clear)

  const count = cartCount(lines)
  const items = useMemo(
    () =>
      lines
        .map((l) => ({ line: l, product: findProduct(l.productId) }))
        .filter((x): x is { line: (typeof lines)[number]; product: NonNullable<ReturnType<typeof findProduct>> } => Boolean(x.product)),
    [lines]
  )
  const subtotal = items.reduce(
    (sum, { line, product }) =>
      sum + (locale === 'fa' ? product.price.toman * line.quantity : product.price.usd * line.quantity),
    0
  )
  const subtotalMoney =
    locale === 'fa' ? { usd: 0, toman: subtotal } : { usd: subtotal, toman: 0 }
  const fa = locale === 'fa'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={fa ? 'left' : 'right'}
        aria-describedby={undefined}
        className="flex w-full flex-col bg-[#eaeded] p-0 sm:max-w-md"
        dir={fa ? 'rtl' : 'ltr'}
      >
        <SheetHeader className="border-b border-afx-border bg-white px-4 py-4">
          <SheetTitle className="text-[19px] font-bold text-afx-price">
            {count > 0 ? `${d.title[locale]}` : d.empty[locale]}
          </SheetTitle>
          {count > 0 && (
            <SheetDescription className="text-[13px] text-afx-green">
              {d.freeShipping[locale]}
            </SheetDescription>
          )}
        </SheetHeader>

        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#565959" strokeWidth="1.6" aria-hidden="true">
                <circle cx="9" cy="20" r="1.6" />
                <circle cx="17" cy="20" r="1.6" />
                <path d="M3 3h2l2.6 12.4a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[17px] font-bold text-afx-price">{d.empty[locale]}</p>
            <p className="max-w-[260px] text-[13px] text-muted-foreground">{d.emptyBody[locale]}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-afx-orange px-6 py-2 text-[13px] font-bold text-afx-price transition hover:bg-afx-orange-hover"
            >
              {d.startShopping[locale]}
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="afx-scroll flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-3">
                {items.map(({ line, product }) => (
                  <li
                    key={product.id}
                    className="flex gap-3 rounded-lg bg-white p-3 shadow-sm"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-afx-border bg-white">
                      <ProductImage
                        product={product}
                        alt={product.title[locale]}
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2-fa text-[13px] font-semibold leading-5 text-afx-price">
                        {product.title[locale]}
                      </p>
                      <p className="mt-0.5 text-[14px] font-bold text-afx-price tabular">
                        {formatPrice(product.price, locale)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-afx-green">
                        {product.isPrime ? dict.product.freeDelivery[locale] : dict.product.inStock[locale]}
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        {/* Stepper */}
                        <div className="flex h-8 items-center rounded-full border border-afx-border shadow-sm" role="group">
                          <button
                            type="button"
                            onClick={() => setQty(product.id, line.quantity - 1)}
                            aria-label={line.quantity === 1 ? d.remove[locale] : d.decrease[locale]}
                            className="flex h-8 w-8 items-center justify-center rounded-s-full text-[13px] font-bold text-afx-link transition hover:bg-afx-hover"
                          >
                            {line.quantity === 1 ? '🗑' : '−'}
                          </button>
                          <span
                            className="w-9 border-x border-afx-border text-center text-[13px] font-bold text-afx-price tabular"
                            aria-live="polite"
                          >
                            {fa ? String(line.quantity).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[+c]) : line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(product.id, line.quantity + 1)}
                            aria-label={d.increase[locale]}
                            className="flex h-8 w-8 items-center justify-center rounded-e-full text-[13px] font-bold text-afx-link transition hover:bg-afx-hover"
                          >
                            +
                          </button>
                        </div>
                        <span className="h-4 w-px bg-afx-border" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => remove(product.id)}
                          className="text-[13px] afx-link"
                        >
                          {d.remove[locale]}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <Checkbox id="cart-gift" />
                <label htmlFor="cart-gift" className="cursor-pointer text-[13px] text-afx-price">
                  {d.gift[locale]}
                </label>
              </div>

              <button
                type="button"
                onClick={clear}
                className="mx-auto mt-3 block text-[13px] afx-link"
              >
                {d.clearCart[locale]}
              </button>
            </div>

            {/* Subtotal */}
            <div className="border-t border-afx-border bg-white px-4 py-4 shadow-[0_-2px_8px_rgba(15,17,17,0.06)]">
              <p className="text-[17px] font-bold text-afx-price">
                {count === 1
                  ? d.subtotalOne[locale]
                  : subtotalText(d, locale, count)}
                <span className="ms-2 tabular">{formatPrice(subtotalMoney, locale)}</span>
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-full bg-afx-orange py-2.5 text-[14px] font-bold text-afx-price transition hover:bg-afx-orange-hover active:scale-[0.99]"
              >
                {d.checkout[locale]}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {d.checkoutSoon[locale]}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
})

function subtotalText(d: typeof dict.cart, locale: Locale, n: number): string {
  const template = d.subtotal[locale]
  return template.replace('{n}', locale === 'fa' ? String(n).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[+c]) : String(n))
}
