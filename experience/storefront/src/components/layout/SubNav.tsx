'use client'

import { memo, useCallback } from 'react'
import { Menu } from 'lucide-react'
import { dict } from '@/lib/i18n'
import type { CategoryId, Locale } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SubNavProps {
  locale: Locale
  activeCategory: CategoryId | 'all'
  onCategory: (c: CategoryId | 'all') => void
  onDeals: () => void
  onBestSellers: () => void
  onNewArrivals: () => void
  onReset: () => void
}

/**
 * Amazon-style secondary navigation. The row flows with the document
 * direction (mirrored under RTL) using logical properties only — the
 * physical order flips in Persian exactly like a native RTL store.
 */
export const SubNav = memo(function SubNav({
  locale,
  activeCategory,
  onCategory,
  onDeals,
  onBestSellers,
  onNewArrivals,
  onReset,
}: SubNavProps) {
  const d = dict.nav

  return (
    <nav
      className="bg-afx-navy-light text-white shadow-sm"
      aria-label={d.browseCategories[locale]}
    >
      <div className="relative">
        <div
          id="category-navigation-scroll"
          tabIndex={0}
          aria-label={locale === 'fa' ? 'پیمایش دسته‌بندی‌ها' : 'Category navigation'}
          className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 sm:px-3 no-scrollbar focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-afx-squid"
        >
        <Pill active={activeCategory === 'all'} onClick={onReset}>
          <Menu size={16} aria-hidden="true" />
          {d.all[locale]}
        </Pill>
        <Pill active={false} onClick={onDeals}>
          {d.todaysDeals[locale]}
        </Pill>
        <Pill active={false} onClick={onBestSellers}>
          {d.bestSellers[locale]}
        </Pill>
        <Pill active={false} onClick={onNewArrivals}>
          {d.newArrivals[locale]}
        </Pill>
        <span className="mx-1 hidden h-4 w-px bg-white/25 sm:block" aria-hidden="true" />
        {(Object.keys(dict.categories) as Array<CategoryId>)
          .map((c) => (
            <Pill
              key={c}
              active={activeCategory === c}
              onClick={() => onCategory(c)}
            >
              {dict.categories[c][locale]}
            </Pill>
          ))}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 end-0 w-6 sm:hidden',
            locale === 'fa'
              ? 'bg-gradient-to-l from-transparent to-afx-navy-light'
              : 'bg-gradient-to-r from-transparent to-afx-navy-light'
          )}
        />
      </div>
    </nav>
  )
})

const Pill = memo(function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-sm border border-transparent px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:border-white/70',
        active && 'border-white/70 bg-white/10'
      )}
    >
      {children}
    </button>
  )
})
