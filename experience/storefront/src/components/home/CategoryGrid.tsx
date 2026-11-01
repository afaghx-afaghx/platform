'use client'

import { memo, useCallback } from 'react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { dict } from '@/lib/i18n'
import { CATEGORY_HERO_IDS, findProduct } from '@/lib/catalog'
import type { CategoryId, Locale } from '@/lib/types'
import { ProductImage } from '@/components/product/ProductImage'

interface CategoryGridProps {
  locale: Locale
  onCategory: (c: CategoryId) => void
}

/**
 * Amazon-signature "shop by category" card grid: 4 columns on desktop,
 * each card pairs a category tagline with a representative product image
 * and a bilingual "explore" link. The arrow direction is locale-aware.
 */
export const CategoryGrid = memo(function CategoryGrid({ locale, onCategory }: CategoryGridProps) {
  const d = dict.sections
  const cats = Object.keys(CATEGORY_HERO_IDS) as CategoryId[]
  const Arrow = locale === 'fa' ? ArrowLeft : ArrowRight

  const click = useCallback((c: CategoryId) => () => onCategory(c), [onCategory])

  return (
    <section className="mx-auto w-full max-w-[1500px] px-2 sm:px-3" aria-labelledby="cat-grid-title">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {cats.map((c) => (
          <CategoryCard
            key={c}
            category={c}
            locale={locale}
            onClick={click(c)}
            arrow={<Arrow size={14} aria-hidden="true" />}
          />
        ))}
      </div>
    </section>
  )
})

const CategoryCard = memo(function CategoryCard({
  category,
  locale,
  onClick,
  arrow,
}: {
  category: CategoryId
  locale: Locale
  onClick: () => void
  arrow: React.ReactNode
}) {
  const product = findProduct(CATEGORY_HERO_IDS[category])
  return (
    <div className="flex flex-col rounded-xl border border-afx-border bg-card p-3 shadow-sm sm:p-5 transition-shadow hover:shadow-md">
      <h3 className="mb-1 text-[14px] font-bold sm:text-[17px] text-afx-price">
        {dict.categories[category][locale]}
      </h3>
      <p className="mb-2 text-[10px] leading-5 text-muted-foreground sm:mb-3 sm:text-[12px]">
        {dict.categoryTaglines[category][locale]}
      </p>
      <div className="relative mb-3 aspect-[5/4] w-full overflow-hidden rounded-md sm:mb-4 sm:aspect-[4/3] bg-[#f7f8f8]">
        {product && (
          <ProductImage
            product={product}
            alt={product.title[locale]}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        className="mt-auto flex items-center gap-1 self-start text-[11px] afx-link font-bold sm:text-[13px] sm:font-medium"
      >
        {dict.sections.categoriesLink[locale]}
        {arrow}
      </button>
    </div>
  )
})
