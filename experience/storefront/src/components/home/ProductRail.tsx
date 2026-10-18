'use client'

import { memo, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product, Locale } from '@/lib/types'
import { ProductCard } from '@/components/product/ProductCard'
import { cn } from '@/lib/utils'

interface ProductRailProps {
  title: string
  linkLabel: string
  products: Product[]
  locale: Locale
  onOpen: (p: Product) => void
  onLink: () => void
  id?: string
}

/**
 * Horizontally scrollable product rail (Amazon "Today's Deals" pattern).
 * Arrow buttons scroll by one page; native touch scroll on mobile;
 * scrollbars hidden but content fully keyboard-reachable.
 */
export const ProductRail = memo(function ProductRail({
  title,
  linkLabel,
  products,
  locale,
  onOpen,
  onLink,
  id,
}: ProductRailProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = useCallback((dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const rtl = document.documentElement.dir === 'rtl'
    // In RTL, scrollLeft is negative in Chrome/FF → flip direction
    const effectiveDir = rtl ? (-dir as 1 | -1) : dir
    el.scrollBy({ left: effectiveDir * Math.max(el.clientWidth * 0.8, 240), behavior: 'smooth' })
  }, [])

  if (products.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-[1500px] px-2 sm:px-3" aria-label={title} id={id}>
      <div className="rounded-lg bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-[19px] font-bold text-afx-price sm:text-[21px]">{title}</h2>
          <button type="button" onClick={onLink} className="shrink-0 text-[13px] afx-link font-medium">
            {linkLabel}
          </button>
        </div>

        <div className="group/rail relative">
          <div
            ref={trackRef}
            className={cn(
              'flex gap-3 overflow-x-auto pb-2 no-scrollbar',
              'snap-x snap-mandatory scroll-smooth'
            )}
            role="list"
          >
            {products.map((p) => (
              <div key={p.id} role="listitem" className="snap-start">
                <ProductCard product={p} locale={locale} onOpen={onOpen} compact />
              </div>
            ))}
          </div>

          {/* Rail arrows — appear on rail hover (always on touch-less desktops) */}
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={locale === 'fa' ? 'قبلی' : 'Scroll back'}
            className="absolute start-0 top-1/2 z-10 hidden h-20 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-afx-border bg-white/95 shadow-md transition hover:bg-afx-hover group-hover/rail:flex"
          >
            <ChevronLeft size={22} className="rtl:rotate-180" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={locale === 'fa' ? 'بعدی' : 'Scroll forward'}
            className="absolute end-0 top-1/2 z-10 hidden h-20 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-afx-border bg-white/95 shadow-md transition hover:bg-afx-hover group-hover/rail:flex"
          >
            <ChevronRight size={22} className="rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
})
