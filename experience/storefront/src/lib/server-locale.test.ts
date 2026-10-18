import { describe, expect, test } from 'bun:test'
import { resolveLocale } from './server-locale'

describe('resolveLocale — afaghx.com locale contract', () => {
  test('no cookie → FA (default audience, RTL)', () => {
    expect(resolveLocale(undefined)).toBe('fa')
  })

  test('empty cookie value → FA (defensive)', () => {
    expect(resolveLocale('')).toBe('fa')
  })

  test("afx-locale=en → EN (explicit opt-in, LTR)", () => {
    expect(resolveLocale('en')).toBe('en')
  })

  test('afx-locale=fa → FA (explicit)', () => {
    expect(resolveLocale('fa')).toBe('fa')
  })

  test('malformed/stale values → FA (fail-safe)', () => {
    expect(resolveLocale('EN')).toBe('fa')
    expect(resolveLocale('fr')).toBe('fa')
    expect(resolveLocale('fa; path=/')).toBe('fa')
  })
})
