'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dict } from '@/lib/i18n'
import type { Locale, Product } from '@/lib/types'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ProductImage } from '@/components/product/ProductImage'

interface HeroCarouselProps {
  locale: Locale
  /** One showcase product per slide (right-side visual) */
  showcases: Product[]
  onCta: (slideIndex: number) => void
}

const AUTOPLAY_MS = 6000

/**
 * Amazon-style hero carousel: full-bleed gradient slides, bilingual copy,
 * side arrows, dots, autoplay with pause-on-hover/focus and reduced-motion
 * respect. Direction-aware: visual order flips cleanly under RTL because
 * the layout uses logical properties only.
 */
export const HeroCarousel = memo(function HeroCarousel({
  locale,
  showcases,
  onCta,
}: HeroCarouselProps) {
  const d = dict.hero
  const slides = d.slides
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (paused || reduced.current) return
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, AUTOPLAY_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [paused, slides.length])

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + slides.length) % slides.length),
    [slides.length]
  )

  return (
    <section
      className="relative mx-auto w-full max-w-[1500px] px-2 sm:px-3"
      aria-roledescription="carousel"
      aria-label={slides[index].title[locale]}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative h-[340px] overflow-hidden sm:h-[380px] lg:h-[440px]">
        {slides.map((slide, i) => {
          const product = showcases[i % showcases.length]
          const active = i === index
          return (
            <div
              key={slide.theme}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${slides.length}`}
              aria-hidden={!active}
              className={cn(
                'absolute inset-0 transition-opacity duration-700',
                slide.theme === 'night' && 'afx-hero-night',
                slide.theme === 'ember' && 'afx-hero-ember',
                slide.theme === 'forest' && 'afx-hero-forest',
                slide.theme === 'royal' && 'afx-hero-royal',
                active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
              )}
            >
              {/* Decorative texture */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)',
                  backgroundSize: '34px 34px',
                }}
              />
              <div className="relative mx-auto flex h-full max-w-6xl items-center gap-6 px-6 sm:px-10">
                {/* Copy */}
                <div className={cn('flex-1 max-w-xl', locale === 'fa' ? 'text-right' : 'text-left')}>
                  <p className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                    {slide.kicker[locale]}
                  </p>
                  <h1 className="text-2xl font-black leading-snug text-white sm:text-3xl lg:text-4xl">
                    {slide.title[locale]}
                  </h1>
                  <p className="mt-3 text-[13px] leading-6 text-white/80 sm:text-[15px]">
                    {slide.subtitle[locale]}
                  </p>
                  <button
                    type="button"
                    onClick={() => onCta(i)}
                    tabIndex={active ? 0 : -1}
                    className="mt-5 rounded-full bg-afx-squid px-6 py-2.5 text-[14px] font-bold text-afx-navy shadow-lg transition-all hover:bg-afx-squid-hover hover:shadow-xl active:scale-95"
                  >
                    {slide.cta[locale]}
                  </button>
                </div>

                {/* Showcase product */}
                {product && (
                  <div
                    className="hidden shrink-0 md:block"
                    aria-hidden={!active}
                  >
                    <figure className="w-[240px] rounded-2xl bg-white/95 p-4 shadow-2xl backdrop-blur lg:w-[280px]">
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
                        <ProductImage
                          product={product}
                          alt=""
                          sizes="280px"
                          className="object-contain p-2"
                          priority={i === 0}
                        />
                      </div>
                      <figcaption className="mt-3 space-y-1">
                        <p className="line-clamp-2-fa text-[13px] font-semibold text-afx-price">
                          {product.title[locale]}
                        </p>
                        <p className="text-[15px] font-bold text-afx-deal tabular">
                          {formatPrice(product.price, locale)}
                        </p>
                      </figcaption>
                    </figure>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Arrows */}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={d.prev[locale]}
          className="absolute start-1 top-1/2 z-20 flex h-16 w-10 -translate-y-1/2 items-center justify-center rounded-md text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <ChevronLeft size={38} className="rtl:rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={d.next[locale]}
          className="absolute end-1 top-1/2 z-20 flex h-16 w-10 -translate-y-1/2 items-center justify-center rounded-md text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <ChevronRight size={38} className="rtl:rotate-180" aria-hidden="true" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 start-1/2 z-20 flex -translate-x-1/2 gap-2 rtl:translate-x-1/2">
          {slides.map((s, i) => (
            <button
              key={s.theme}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${d.goto[locale]} ${i + 1}`}
              aria-current={i === index}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/70'
              )}
            />
          ))}
        </div>
      </div>

      {/* Bottom fade into canvas (Amazon signature) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-20 bg-gradient-to-t from-afx-canvas to-transparent"
      />
    </section>
  )
})
