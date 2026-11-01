import Link from 'next/link'
import { HOME, SITE_NAV, SITE_PAGES } from '@/lib/site-content'
import type { Locale } from '@/lib/types'

/**
 * afaghx.com footer — contract routes, the 17 registry role modules with
 * their canonical hosts, and governance pointers. Data comes from
 * experience/module-registry.json — never invented.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const year = 2026
  return (
    <footer className="mt-auto bg-afx-navy text-white" role="contentinfo">
      <a
        href="#top"
        className="block bg-[#232f3e] py-3 text-center text-[13px] font-bold transition hover:bg-[#37475a]"
      >
        {locale === 'fa' ? 'بازگشت به بالا' : 'Back to top'}
      </a>

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-7 px-4 py-8 sm:gap-8 sm:px-6 lg:grid-cols-4">
        {/* Platform routes */}
        <nav aria-label="Platform">
          <h3 className="mb-2 text-xs font-black sm:mb-3 sm:text-[14px]">
            {locale === 'fa' ? 'پلتفرم' : 'Platform'}
          </h3>
          <ul className="space-y-1.5 text-[11px] leading-5 text-white/70 sm:space-y-2 sm:text-[13px]">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-afx-squid">
                  {item.label[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Role modules (canonical hosts) */}
        <div>
          <h3 className="mb-3 text-[14px] font-black">
            {locale === 'fa' ? 'ماژول‌های نقش' : 'Role Modules'}
          </h3>
          <ul className="space-y-1.5 text-[10px] leading-5 text-white/70 sm:space-y-2 sm:text-[13px]" dir="ltr">
            {HOME.roles.items.slice(0, 8).map((role) => (
              <li key={role.slug} className="font-mono text-[12px]">
                {role.slug}.afaghx.com
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-white/50">
            {locale === 'fa' ? '+ ۹ ماژول دیگر در رجیستری' : '+ 9 more in the registry'}
          </p>
        </div>

        {/* Governance */}
        <div>
          <h3 className="mb-3 text-[14px] font-black">
            {locale === 'fa' ? 'حاکمیت' : 'Governance'}
          </h3>
          <ul className="space-y-2 text-[13px] text-white/70">
            <li>ADR-EXP-001 · bilingual storefront</li>
            <li>AFAGHX_UX_CONTRACT · v1.0.0</li>
            <li>Module registry · v2.0</li>
            <li dir="ltr" className="font-mono text-[12px]">
              api.afaghx.com
            </li>
          </ul>
        </div>

        {/* Ecosystem */}
        <div>
          <h3 className="mb-3 text-[14px] font-black">
            {locale === 'fa' ? 'اکوسیستم' : 'Ecosystem'}
          </h3>
          <ul className="space-y-2 text-[13px] text-white/70">
            {Object.values(SITE_PAGES).slice(0, 5).map((page) => (
              <li key={page.slug}>
                <span dir="ltr" className="font-mono text-[12px]">
                  {page.host}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center">
        <p className="text-[13px] text-white/60" dir="ltr">
          © {year} AFAGHX — Ecosystem Platform for Commerce, Industry and Intelligence
        </p>
        <p className="mt-1 text-[12px] text-white/60">
          {locale === 'fa'
            ? 'پنج لایه، یک اعتماد: CORE → PLATFORM → DOMAIN → INTELLIGENCE → EXPERIENCE'
            : 'Five layers, one trust: CORE → PLATFORM → DOMAIN → INTELLIGENCE → EXPERIENCE'}
        </p>
      </div>
    </footer>
  )
}
