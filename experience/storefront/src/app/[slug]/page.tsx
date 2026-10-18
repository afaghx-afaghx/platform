import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { CTA, PageHero, SectionHeading, StatStrip } from '@/components/site/ui'
import { SITE_PAGES, isSiteSlug } from '@/lib/site-content'
import { getLocale } from '@/lib/server-locale'

interface RouteProps {
  params: Promise<{ slug: string }>
}

/** Pre-render every canonical contract route (SSG) with cookie-driven locale. */
export function generateStaticParams() {
  return Object.keys(SITE_PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params
  if (!isSiteSlug(slug)) return {}
  const page = SITE_PAGES[slug]
  return { title: `${page.navLabel.en} — AFAGHX` }
}

/**
 * Canonical contract route pages (suppliers, factories, services, markets,
 * business-network, intelligence) — one typed dynamic segment, registry
 * hosts shown in the hero, content from the locked site-content model.
 */
export default async function SiteRoutePage({ params }: RouteProps) {
  const { slug } = await params
  if (!isSiteSlug(slug)) notFound()
  const page = SITE_PAGES[slug]
  const locale = await getLocale()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <PageHero
          eyebrow={page.navLabel}
          title={page.title}
          subtitle={page.subtitle}
          host={page.host}
          locale={locale}
          cta={page.cta}
        />

        {/* Stats */}
        <div className="-mt-8 pb-4">
          <StatStrip stats={page.stats} locale={locale} />
        </div>

        {/* Core blocks */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {page.blocks.map((block, i) => (
              <article
                key={block.title.en}
                className="rounded-xl border border-afx-border bg-card p-6 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="text-[28px] font-black leading-none text-afx-squid/30"
                >
                  ۰{i + 1}
                </span>
                <h2 className="mt-2 text-[16px] font-black text-afx-price">
                  {block.title[locale]}
                </h2>
                <p className="mt-3 text-[13.5px] leading-7 text-muted-foreground">
                  {block.body[locale]}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Capabilities checklist */}
        <section className="bg-[#f4f6f8] py-12 dark:bg-card/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading
              kicker={{ en: 'Capabilities', fa: 'قابلیت‌ها' }}
              title={{
                en: 'What this experience delivers',
                fa: 'این تجربه چه چیزی تحویل می‌دهد',
              }}
              locale={locale}
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {page.capabilities.map((cap) => (
                <li
                  key={cap.en}
                  className="flex items-start gap-3 rounded-lg border border-afx-border bg-card px-4 py-3.5 text-[13.5px] font-bold text-afx-price shadow-sm"
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-afx-squid/15 p-1 text-afx-squid">
                    <Check size={13} aria-hidden="true" />
                  </span>
                  {cap[locale]}
                </li>
              ))}
            </ul>
            <div className="mt-9 text-center">
              <CTA href="/products">{page.cta[locale]}</CTA>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}
