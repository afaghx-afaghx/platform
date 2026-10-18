import { Storefront } from '@/components/Storefront'
import { cookies } from 'next/headers'
import type { Locale } from '@/lib/types'

/**
 * Server entry: resolves the locale from the cookie so the very first
 * HTML paint already has the right language AND direction (dir=rtl for
 * Persian). The catalog is bundled statically — zero latency, zero
 * loading spinners on first render.
 */
const LOCALE_COOKIE = 'afx-locale'

export default async function Page() {
  const store = await cookies()
  const locale: Locale = store.get(LOCALE_COOKIE)?.value === 'fa' ? 'fa' : 'en'
  return <Storefront initialLocale={locale} />
}
