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
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1 sm:px-3 sm:py-1.5 no-scrollbar">
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
      aria-current={active ? 'true' : undefined}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-sm border border-transparent px-2 py-1 text-[11px] font-medium transition-colors hover:border-white/70 sm:px-2.5 sm:py-1.5 sm:text-[13px]',
        active && 'border-white/70 bg-white/10'
      )}
    >
      {children}
    </button>
  )
})
