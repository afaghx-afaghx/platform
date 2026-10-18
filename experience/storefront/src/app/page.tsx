import Link from 'next/link'
import { Check, Factory, ShoppingCart, Store, Wrench } from 'lucide-react'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { CTA, FlowStrip, SectionHeading } from '@/components/site/ui'
import { HOME } from '@/lib/site-content'
import { getLocale } from '@/lib/server-locale'

export const metadata = {
  title: 'AFAGHX — Ecosystem Platform for Commerce, Industry and Intelligence | afaghx.com',
}

const ACTION_ICONS = [ShoppingCart, Store, Factory, Wrench] as const

/**
 * afaghx.com — main landing page.
 * Sections mirror the canonical homeSections of AFAGHX_UX_CONTRACT:
 * hero-need → need-actions → product-baskets(as actions) → economic-network
 * (roles) → trust (+ canonical security flow) → intelligence → partners-api.
 */
export default async function SiteHomePage() {
  const locale = await getLocale()
  const fa = locale === 'fa'

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-afx-navy text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(65% 90% at 85% 5%, rgba(35,47,62,.95), transparent), radial-gradient(55% 75% at 5% 95%, rgba(232,241,250,.16), transparent)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <p className="mb-4 text-[12px] font-black uppercase tracking-[0.24em] text-afx-squid">
              {HOME.hero.eyebrow[locale]}
            </p>
            <h1 className="mx-auto max-w-4xl text-3xl font-black leading-[1.18] sm:text-5xl">
              {HOME.hero.title[locale]}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-8 text-white/75 sm:text-[16px]">
              {HOME.hero.subtitle[locale]}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <CTA href="/products">{HOME.hero.primaryCta[locale]}</CTA>
              <CTA href="#architecture" variant="ghost">
                {HOME.hero.secondaryCta[locale]}
              </CTA>
            </div>
            <p dir="ltr" className="mt-8 font-mono text-[12px] text-white/40">
              CORE → PLATFORM → DOMAIN → INTELLIGENCE → EXPERIENCE
            </p>
          </div>
        </section>

        {/* ── Need actions ─────────────────────────────────── */}
        <section className="mx-auto -mt-10 max-w-7xl px-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HOME.actions.map((action, i) => {
              const Icon = ACTION_ICONS[i]
              return (
                <Link
                  key={action.title.en}
                  href={action.href}
                  className="group relative z-10 rounded-xl border border-afx-border bg-card p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <span className="mb-3 inline-flex rounded-lg bg-afx-squid/10 p-2.5 text-afx-squid">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <h2 className="text-[15px] font-black text-afx-price">{action.title[locale]}</h2>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    {action.body[locale]}
                  </p>
                  <p className="mt-3 text-[13px] font-bold text-afx-squid group-hover:underline">
                    {action.cta[locale]} ←
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── Five-layer architecture ──────────────────────── */}
        <section id="architecture" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
          <SectionHeading
            kicker={{ en: 'Architecture', fa: 'معماری' }}
            title={{ en: 'The five-layer governed spine', fa: 'ستون فقرات پنج‌لایهٔ حاکمیت‌شده' }}
            subtitle={{
              en: 'Dependency flows one way: EXPERIENCE → PLATFORM / DOMAIN → CORE. Intelligence consumes approved contracts — never direct data paths.',
              fa: 'وابستگی یک‌طرفه است: EXPERIENCE → PLATFORM / DOMAIN → CORE. لایهٔ هوش از قراردادهای تأییدشده تغذیه می‌کند — هرگز مسیر مستقیم داده.',
            }}
            locale={locale}
          />
          <div className="grid gap-3 lg:grid-cols-5">
            {HOME.layers.map((layer, i) => (
              <article
                key={layer.id}
                className="flex flex-col rounded-xl border border-afx-border bg-card p-5 shadow-sm"
              >
                <span
                  dir="ltr"
                  className="mb-3 inline-flex w-fit rounded-full bg-afx-navy px-3 py-1 font-mono text-[11px] font-bold text-afx-squid"
                >
                  {i + 1} · {layer.id}
                </span>
                <h3 className="text-[15px] font-black text-afx-price">{layer.title[locale]}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">
                  {layer.body[locale]}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Role network (economic-network) ──────────────── */}
        <section className="bg-[#f4f6f8] py-16 dark:bg-card/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              kicker={{ en: 'Economic Network', fa: 'شبکهٔ اقتصادی' }}
              title={HOME.roles.title}
              subtitle={HOME.roles.subtitle}
              locale={locale}
            />
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {HOME.roles.items.map((role) => (
                <li
                  key={role.slug}
                  className="rounded-lg border border-afx-border bg-card px-3.5 py-3 shadow-sm transition hover:border-afx-squid/50"
                >
                  <p className="text-[13px] font-black text-afx-price">{role.name[locale]}</p>
                  <p dir="ltr" className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {role.slug}.afaghx.com
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Trust + canonical security flow ─────────────── */}
        <section className="relative overflow-hidden bg-afx-navy py-16 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">{HOME.trust.title[locale]}</h2>
                <p className="mt-4 text-[14px] leading-7 text-white/70">
                  {HOME.trust.body[locale]}
                </p>
              </div>
              <ul className="space-y-3">
                {HOME.trust.points.map((point) => (
                  <li key={point.en} className="flex items-start gap-3 text-[14px] font-bold">
                    <span className="mt-0.5 rounded-full bg-afx-squid/20 p-1 text-afx-squid">
                      <Check size={14} aria-hidden="true" />
                    </span>
                    {point[locale]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-12">
              <p className="mb-4 text-center text-[12px] font-black uppercase tracking-[0.2em] text-white/50">
                {fa ? 'جریان امنیتی کانونی — در هر درخواست' : 'Canonical security flow — on every request'}
              </p>
              <FlowStrip steps={HOME.securityFlow} locale={locale} />
            </div>
          </div>
        </section>

        {/* ── Intelligence teaser ──────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            kicker={{ en: 'Intelligence', fa: 'هوش' }}
            title={{ en: 'Governed intelligence for real commerce', fa: 'هوش حاکمیت‌شده برای تجارت واقعی' }}
            subtitle={{
              en: 'Matching, recommendations, analytics and risk — produced inside versioned contracts and audited through CORE.',
              fa: 'تطبیق، پیشنهادها، تحلیل و ریسک — تولیدشده درون قراردادهای نسخه‌دار و حسابرسی‌شده از CORE.',
            }}
            locale={locale}
          />
          <div className="text-center">
            <CTA href="/intelligence">
              {fa ? 'کاوش در لایهٔ هوش' : 'Explore the intelligence layer'}
            </CTA>
          </div>
        </section>

        {/* ── Partners / API ──────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="rounded-2xl bg-gradient-to-br from-afx-navy to-[#232f3e] p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-black sm:text-3xl">{HOME.partners.title[locale]}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-7 text-white/70">
              {HOME.partners.body[locale]}
            </p>
            <div className="mt-7 flex justify-center">
              <CTA href="#top" variant="ghost">
                {HOME.partners.cta[locale]}
              </CTA>
            </div>
            <p dir="ltr" className="mt-6 font-mono text-[12px] text-white/40">
              api.afaghx.com — versioned contracts · events · governed data products
            </p>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}
