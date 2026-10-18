'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { dict } from '@/lib/i18n'
import { AFAGHX_LANGUAGES } from '@/lib/languages'
import { SITE_NAV } from '@/lib/site-content'
import { applyLocaleToDom, writeLocaleCookie } from '@/store/app-store'
import type { Locale } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * afaghx.com header — contract-driven navigation (canonical routes) and the
 * platform language switcher. Locale switches update cookie + DOM + RSC via
 * router.refresh() (site pages are server-rendered from the cookie).
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const router = useRouter()
  const d = dict.header
  const [open, setOpen] = useState(false)

  const switchLocale = useCallback(
    (next: string) => {
      if (next === locale) return
      writeLocaleCookie(next as Locale)
      applyLocaleToDom(next as Locale)
      router.refresh()
    },
    [locale, router]
  )

  return (
    <header className="sticky top-0 z-50 bg-afx-navy shadow-md" role="banner">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:px-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-sm border border-transparent px-1 py-1 transition hover:border-white/70"
          aria-label="AFAGHX.com"
        >
          <span className="text-lg font-black tracking-tight text-white" dir="ltr">
            AFAGHX<span className="text-afx-squid">.</span>com
          </span>
        </Link>

        {/* Contract routes — scrollable on mobile */}
        <nav
          aria-label={d.languageLabel[locale]}
          className="order-last min-w-0 grow basis-full overflow-x-auto no-scrollbar sm:order-none sm:basis-auto"
        >
          <ul className="flex items-center gap-1 py-0.5">
            {SITE_NAV.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold transition',
                      active
                        ? 'bg-white/10 text-afx-squid'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {item.label[locale]}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Language switcher — AFAGHX_UX_CONTRACT driven */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded-sm border border-transparent px-2 py-1.5 text-white transition hover:border-white/70"
              aria-label={d.switchTo[locale]}
            >
              <Globe size={16} aria-hidden="true" />
              <span className="text-[13px] font-bold">{locale === 'fa' ? 'FA' : 'EN'}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuLabel>{d.languageLabel[locale]}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={locale} onValueChange={switchLocale}>
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

        {/* Marketplace CTA */}
        <Link
          href="/products"
          className="shrink-0 rounded-full bg-afx-orange px-4 py-1.5 text-[13px] font-black text-afx-price transition hover:bg-afx-orange-hover"
        >
          {locale === 'fa' ? 'بازار' : 'Market'}
        </Link>
      </div>
    </header>
  )
}
