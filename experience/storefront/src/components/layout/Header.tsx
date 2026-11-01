'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Globe, ShoppingCart } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApp, cartCount } from '@/store/app-store'
import { dict } from '@/lib/i18n'
import { AFAGHX_LANGUAGES } from '@/lib/languages'
import type { CategoryId, Locale } from '@/lib/types'
import { cn } from '@/lib/utils'

interface HeaderProps {
  locale: Locale
  onLocaleChange: (l: Locale) => void
  /** Category selected in the search dropdown */
  searchCategory: CategoryId | 'all'
  onSearchCategoryChange: (c: CategoryId | 'all') => void
  onSearch: (q: string) => void
  initialQuery: string
}

/**
 * AFAGHX global commerce header: ecosystem identity, global market entry,
 * category-scoped product search, language switcher and a live cart badge.
 * Fully keyboard accessible; search submits on Enter and on button press.
 */
export const Header = memo(function Header({
  locale,
  onLocaleChange,
  searchCategory,
  onSearchCategoryChange,
  onSearch,
  initialQuery,
}: HeaderProps) {
  const d = dict.header
  const setCartOpen = useApp((s) => s.setCartOpen)
  const lines = useApp((s) => s.lines)
  const count = cartCount(lines)

  const [query, setQuery] = useState(initialQuery)

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      onSearch(query)
    },
    [onSearch, query]
  )

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') submit()
    },
    [submit]
  )

  const categoryOptions = useMemo(
    () =>
      Object.entries(dict.categories).map(([id, label]) => ({
        id: id as CategoryId | 'all',
        label: label[locale],
      })),
    [locale]
  )

  return (
    <header className="sticky top-0 z-50 shadow-xl shadow-slate-950/10" role="banner">
      {/* ── Main row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-[#071b2a] px-2 py-2 sm:gap-2 sm:px-4 lg:px-6">
        {/* Brand — back to the marketplace home */}
        <Link
          href="/"
          className="flex items-center rounded-sm border border-transparent px-1 py-1 transition hover:border-white/70"
          aria-label={dict.brand[locale]}
        >
          <span className="flex flex-col items-start leading-none">
            <span className="text-lg font-black tracking-tight text-white" dir="ltr">
              {dict.brand.en}<span className="text-afx-squid">.</span>
            </span>
            <span className="mt-1 hidden text-[8px] font-semibold tracking-[0.16em] text-white/65 min-[420px]:block" dir="ltr">
              AFA GLOBAL HORIZON X
            </span>
          </span>
          <span className="sr-only">{dict.brand[locale]}</span>
        </Link>

        {/* Global market navigation — real route, no fabricated geolocation */}
        <Link
          href="/markets"
          className="hidden items-center gap-1 rounded-sm border border-transparent px-2 py-1 text-white transition hover:border-white/70 lg:flex"
        >
          <Globe size={18} className="shrink-0" aria-hidden="true" />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[11px] text-white/70">{locale === 'fa' ? 'بازارهای بین‌المللی' : 'Global markets'}</span>
            <span className="text-[13px] font-bold">{locale === 'fa' ? 'کاوش بازارها' : 'Explore markets'}</span>
          </span>
        </Link>

        {/* Search */}
        <form
          role="search"
          onSubmit={submit}
          className="min-w-0 grow basis-0"
        >
          <div
            className={cn(
              'flex h-10 w-full overflow-visible rounded-md bg-white',
              'focus-within:ring-[3px] focus-within:ring-afx-squid'
            )}
          >
            {/* Category scope */}
            <label className="sr-only" htmlFor="afx-search-category">
              {d.allDepartments[locale]}
            </label>
            <select
              id="afx-search-category"
              value={searchCategory}
              onChange={(e) => onSearchCategoryChange(e.target.value as CategoryId | 'all')}
              className="h-10 max-w-[66px] cursor-pointer rounded-s-md border-e border-afx-border bg-[#e6e6e6] px-1 text-[10px] text-afx-price outline-none min-[420px]:max-w-[82px] sm:max-w-[170px] sm:px-2 sm:text-[13px]"
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="afx-search-input">
              {d.searchPlaceholder[locale]}
            </label>
            <input
              id="afx-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder={d.searchPlaceholder[locale]}
              className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-afx-price outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
              autoComplete="off"
            />

            <button
              type="submit"
              aria-label={d.searchPlaceholder[locale]}
              className="flex h-10 w-9 shrink-0 items-center justify-center rounded-e-md bg-afx-squid sm:w-12 transition-colors hover:bg-afx-squid-hover"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#131921"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </button>
          </div>
        </form>

        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-sm border border-transparent px-1 py-1.5 text-white transition hover:border-white/70 sm:px-2"
              aria-label={d.switchTo[locale]}
            >
              <Globe size={17} aria-hidden="true" />
              <span className="text-[13px] font-bold">{locale === 'fa' ? 'FA' : 'EN'}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuLabel>{d.languageLabel[locale]}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => onLocaleChange(v as Locale)}
            >
              {/*
                Contract-driven: mirrors AFAGHX_UX_CONTRACT.languages exactly —
                native labels, inactive languages disabled with the platform's
                own "not yet active" string (afaghx-language-system.js parity).
              */}
              {AFAGHX_LANGUAGES.map((l) => (
                <DropdownMenuRadioItem
                  key={l.code}
                  value={l.code}
                  disabled={!l.active}
                  dir={l.dir}
                >
                  {l.label}
                  {!l.active && (
                    <span className="text-[11px] text-muted-foreground">
                      {' — '}
                      {d.comingSoon[locale]}
                    </span>
                  )}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Business workspace entry — points to the current ecosystem overview */}
        <Link
          href="/business-network"
          className="hidden flex-col items-start rounded-sm border border-transparent px-2 py-1 text-white transition hover:border-white/70 xl:flex"
        >
          <span className="text-[11px] leading-tight text-white/70">{locale === 'fa' ? 'برای سازمان‌ها' : 'For organizations'}</span>
          <span className="text-[13px] font-bold leading-tight">{locale === 'fa' ? 'شبکه کسب‌وکار' : 'Business network'}</span>
        </Link>

        {/* Supplier discovery — avoids presenting an unimplemented order-history page */}
        <Link
          href="/suppliers"
          className="hidden flex-col items-start rounded-sm border border-transparent px-2 py-1 text-white transition hover:border-white/70 xl:flex"
        >
          <span className="text-[11px] leading-tight text-white/70">{locale === 'fa' ? 'تأمین و تولید' : 'Sourcing'}</span>
          <span className="text-[13px] font-bold leading-tight">{locale === 'fa' ? 'تأمین‌کنندگان' : 'Suppliers'}</span>
        </Link>

        {/* Cart */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex items-end gap-1 rounded-sm border border-transparent px-1 py-1 text-white transition hover:border-white/70 sm:px-2"
          aria-label={`${d.cart[locale]}${count > 0 ? ` (${count})` : ''}`}
        >
          <span className="relative">
            <ShoppingCart size={26} aria-hidden="true" />
            <span
              className={cn(
                'absolute -top-1.5 text-center text-[14px] font-bold text-afx-squid tabular min-w-[18px]',
                locale === 'fa' ? 'left-1/2 translate-x-[-50%]' : 'left-1/2 -translate-x-1/2'
              )}
              aria-hidden="true"
            >
              {count > 0 ? (locale === 'fa' ? toFa(count) : count) : ''}
            </span>
          </span>
          <span className="hidden text-[13px] font-bold sm:inline">{d.cart[locale]}</span>
        </button>
      </div>
      <nav aria-label={locale === 'fa' ? 'ناوبری اصلی اکوسیستم' : 'Primary ecosystem navigation'} className="border-t border-white/10 bg-[#102c3c] text-white">
        <div className="mx-auto flex max-w-[1560px] items-center gap-1 overflow-x-auto px-2 py-1.5 sm:justify-center sm:gap-2 sm:px-4">
          <Link href="/factories" className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
            {locale === 'fa' ? 'صنعت و کارخانه‌ها' : 'Industry & factories'}
          </Link>
          <Link href="/suppliers" className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
            {locale === 'fa' ? 'شبکه تأمین' : 'Supplier network'}
          </Link>
          <Link href="/business-network" className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
            {locale === 'fa' ? 'تدارکات و تجارت B2B' : 'Procurement & B2B'}
          </Link>
          <Link href="/markets" className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
            {locale === 'fa' ? 'بازارهای جهانی' : 'Global markets'}
          </Link>
          <Link href="/intelligence" className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
            {locale === 'fa' ? 'داده و هوشمندی' : 'Data & intelligence'}
          </Link>
          <Link href="/products" className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
            {locale === 'fa' ? 'کاتالوگ کالا' : 'Product catalogue'}
          </Link>
        </div>
      </nav>
    </header>
  )
})

function toFa(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}
