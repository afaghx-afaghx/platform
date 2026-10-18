/**
 * afaghx.com — shared presentational kit (server components).
 * Brand-consistent with the storefront: afx-navy / afx-squid / afx-orange.
 */
import Link from 'next/link'
import { MoveLeft, MoveRight } from 'lucide-react'
import type { LocalizedText } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import type { SiteStat } from '@/lib/site-content'

export function CTA({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
}) {
  return (
    <Link
      href={href}
      className={
        variant === 'primary'
          ? 'inline-flex items-center gap-2 rounded-full bg-afx-squid px-7 py-3 text-[14px] font-bold text-afx-price shadow-lg shadow-afx-squid/25 transition hover:bg-afx-squid-hover'
          : 'inline-flex items-center gap-2 rounded-full border border-white/35 px-7 py-3 text-[14px] font-bold text-white transition hover:border-white'
      }
    >
      {children}
    </Link>
  )
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  host,
  locale,
  cta,
}: {
  eyebrow: LocalizedText
  title: LocalizedText
  subtitle: LocalizedText
  host?: string
  locale: 'fa' | 'en'
  cta: LocalizedText
}) {
  const fa = locale === 'fa'
  return (
    <section className="relative overflow-hidden bg-afx-navy text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(60% 80% at 80% 10%, rgba(35,47,62,.9), transparent), radial-gradient(50% 70% at 10% 90%, rgba(232,241,250,.14), transparent)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <p className="mb-3 text-[12px] font-black uppercase tracking-[0.22em] text-afx-squid">
          {eyebrow[locale]}
        </p>
        <h1 className="max-w-3xl text-3xl font-black leading-[1.2] sm:text-4xl lg:text-5xl">
          {title[locale]}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/75 sm:text-[16px]">
          {subtitle[locale]}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <CTA href="/products">
            {cta[locale]}
            {fa ? <MoveLeft size={16} aria-hidden="true" /> : <MoveRight size={16} aria-hidden="true" />}
          </CTA>
          {host && (
            <span
              dir="ltr"
              className="rounded-full border border-white/25 bg-white/5 px-4 py-1.5 font-mono text-[12px] text-white/70"
            >
              {host}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

export function SectionHeading({
  kicker,
  title,
  subtitle,
  locale,
}: {
  kicker?: LocalizedText
  title: LocalizedText
  subtitle?: LocalizedText
  locale: 'fa' | 'en'
}) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      {kicker && (
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-afx-squid">
          {kicker[locale]}
        </p>
      )}
      <h2 className="text-2xl font-black text-afx-price sm:text-3xl">{title[locale]}</h2>
      {subtitle && (
        <p className="mt-3 text-[14px] leading-7 text-muted-foreground">{subtitle[locale]}</p>
      )}
    </div>
  )
}

export function StatStrip({ stats, locale }: { stats: SiteStat[]; locale: 'fa' | 'en' }) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-3 gap-3 px-4">
      {stats.map((s) => (
        <div
          key={s.label.en}
          className="rounded-xl border border-afx-border bg-card p-4 text-center shadow-sm sm:p-6"
        >
          <p className="text-2xl font-black tabular text-afx-squid sm:text-4xl">
            {formatNumber(s.value, locale)}
            <span className="text-afx-squid/70">+</span>
          </p>
          <p className="mt-1 text-[12px] font-bold text-muted-foreground sm:text-[13px]">
            {s.label[locale]}
          </p>
        </div>
      ))}
    </div>
  )
}

export function FlowStrip({
  steps,
  locale,
}: {
  steps: readonly LocalizedText[]
  locale: 'fa' | 'en'
}) {
  const Arrow = locale === 'fa' ? MoveLeft : MoveRight
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {steps.map((step, i) => (
        <li key={step.en} className="flex items-center gap-2">
          <span
            className={
              i === steps.length - 1
                ? 'rounded-full bg-afx-squid px-4 py-1.5 text-[12px] font-bold text-afx-price'
                : 'rounded-full border border-white/25 bg-white/5 px-4 py-1.5 text-[12px] font-bold text-white/85'
            }
          >
            {step[locale]}
          </span>
          {i < steps.length - 1 && (
            <Arrow size={14} className="shrink-0 text-white/40" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  )
}
