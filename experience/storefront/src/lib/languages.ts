/**
 * AFAGHX Locale Bridge — canonical mirror of the platform UX contract.
 *
 * Source of truth: experience/web/public/afaghx-experience-contract.js
 * (AFAGHX_UX_CONTRACT, version 1.0.0). Keep both definitions in lockstep:
 * the storefront must never offer a language the platform does not know.
 */
import type { Locale } from './types'

export interface LanguageEntry {
  /** ISO 639-1 code — matches the platform contract. */
  code: 'fa' | 'en' | 'ar' | 'tr'
  /** Native label shown in the switcher, locale-independent. */
  label: string
  dir: 'rtl' | 'ltr'
  /** Only active languages are switchable — mirrors the platform switcher. */
  active: boolean
}

/** AFAGHX_UX_CONTRACT.version mirrored by this file. */
export const AFAGHX_UX_CONTRACT_VERSION = '1.0.0'

export const AFAGHX_LANGUAGES = Object.freeze([
  { code: 'fa', label: 'فارسی', dir: 'rtl', active: true },
  { code: 'en', label: 'English', dir: 'ltr', active: true },
  { code: 'ar', label: 'العربية', dir: 'rtl', active: false },
  { code: 'tr', label: 'Türkçe', dir: 'ltr', active: false },
] as const satisfies readonly LanguageEntry[])

/** Languages users may currently switch to. */
export function activeLanguages(): LanguageEntry[] {
  return AFAGHX_LANGUAGES.filter((l) => l.active)
}

export function languageByCode(code: string): LanguageEntry | undefined {
  return AFAGHX_LANGUAGES.find((l) => l.code === code)
}

export function isCanonicalLanguage(code: string): boolean {
  return AFAGHX_LANGUAGES.some((l) => l.code === code)
}

/** Runtime guard: is this value a locale the storefront can render? */
export function isLocale(value: unknown): value is Locale {
  return value === 'fa' || value === 'en'
}

/**
 * Map a contract language code to a storefront Locale.
 * Returns null for inactive/unknown codes — callers must keep the current
 * locale in that case (same behavior as the platform language system).
 */
export function toLocale(code: string): Locale | null {
  const entry = languageByCode(code)
  return entry && entry.active && isLocale(entry.code) ? entry.code : null
}
