import { cookies } from 'next/headers'
import type { Locale } from './types'

const LOCALE_COOKIE = 'afx-locale'

/** SSR locale resolution shared by every afaghx.com page (zero FOUC). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return store.get(LOCALE_COOKIE)?.value === 'fa' ? 'fa' : 'en'
}
