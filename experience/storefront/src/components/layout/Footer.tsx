'use client'

import { memo } from 'react'
import { ArrowUp } from 'lucide-react'
import { dict } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

/**
 * Amazon-style footer: back-to-top bar, 4 link columns, language note,
 * brand strip and copyright. Sticky-bottom safe: root layout uses
 * min-h-screen flex-col with mt-auto here.
 */
export const Footer = memo(function Footer({ locale }: { locale: Locale }) {
  const d = dict.footer
  const columns = [
    { title: d.getToKnow[locale], links: d.columns.getToKnow.links },
    { title: d.makeMoney[locale], links: d.columns.makeMoney.links },
    { title: d.payment[locale], links: d.columns.payment.links },
    { title: d.letUsHelp[locale], links: d.columns.letUsHelp.links },
  ]

  return (
    <footer className="mt-auto" role="contentinfo">
      {/* Back to top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex w-full items-center justify-center gap-2 bg-afx-navy-hover py-4 text-[13px] font-medium text-white transition-colors hover:bg-[#485769]"
      >
        <ArrowUp size={15} aria-hidden="true" />
        {d.backToTop[locale]}
      </button>

      {/* Link columns */}
      <div className="bg-afx-navy-light px-6 pb-10 pt-10 text-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-2.5 text-[15px] font-bold">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.en}>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-[13px] text-white/80 transition-colors hover:underline"
                    >
                      {l[locale]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Brand strip */}
      <div className="border-t border-white/10 bg-afx-navy-light">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-6">
          <span className="text-xl font-black tracking-tight text-white" dir="ltr">
            {dict.brand.en}
            <span className="text-afx-squid">.</span>
          </span>
          <span className="text-[12px] text-white/60">{d.languageNote[locale]}</span>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-afx-navy px-6 py-6 text-center">
        <p className="text-[11px] text-white/60">{d.copyright[locale]}</p>
      </div>
    </footer>
  )
})
