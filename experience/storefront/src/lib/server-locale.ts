import { cookies } from 'next/headers'
import type { Locale } from './types'

const LOCALE_COOKIE = 'afx-locale'

/**
 * Pure locale decision — single source of truth for every afaghx.com page.
 *
 * Default is FA (primary audience, RTL). The `afx-locale=en` cookie is the
 * explicit opt-in to the English (LTR) experience; anything else — missing,
 * stale, or malformed — resolves to FA (fail-safe).
 */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return cookieValue === 'en' ? 'en' : 'fa'
}

/** SSR locale resolution shared by every afaghx.com page (zero FOUC). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return resolveLocale(store.get(LOCALE_COOKIE)?.value)
}
