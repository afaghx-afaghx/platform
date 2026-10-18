import type { Locale, Money, Product } from './types'
import { dict } from './i18n'

/**
 * Locale-aware formatting. Persian gets Persian digits + Toman,
 * English gets USD. Deterministic (no Date/locale drift between SSR & CSR).
 */

const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => faDigits[Number(d)])
}

function groupThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
}

export function formatPrice(money: Money, locale: Locale): string {
  if (locale === 'fa') {
    return `${toFaDigits(groupThousands(money.toman))} تومان`
  }
  return `$${money.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatNumber(n: number, locale: Locale): string {
  return locale === 'fa' ? toFaDigits(groupThousands(n)) : n.toLocaleString('en-US')
}

/** "4.7" → "۴.۷" / "4.7" */
export function formatRating(rating: number, locale: Locale): string {
  const s = rating.toFixed(1)
  return locale === 'fa' ? toFaDigits(s) : s
}

export function discountPercent(p: Product): number {
  if (!p.listPrice) return 0
  const base = p.price.usd
  const list = p.listPrice.usd
  if (list <= base) return 0
  return Math.round(((list - base) / list) * 100)
}

/** Safe template replace for "{n}" / "{title}" placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`
  )
}

/** Typed shortcut to the dictionary for a locale. */
export function tr(locale: Locale): typeof dict {
  return dict
}
