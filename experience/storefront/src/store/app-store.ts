'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartLine, Locale } from '@/lib/types'

/**
 * Global client state.
 *
 * - Locale is SSR-provided via cookie (`initialLocale`) → zero flash, correct
 *   `dir`/`lang` on first paint. Switching updates cookie + DOM + store.
 * - Cart persists to localStorage with `skipHydration` and rehydrates in a
 *   client effect → no SSR/hydration mismatch, ever.
 */

interface AppState {
  /* cart */
  lines: CartLine[]
  add: (productId: string, qty?: number) => void
  remove: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
  /* ui */
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  hydrated: boolean
  markHydrated: () => void
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function applyLocaleToDom(locale: Locale) {
  const html = document.documentElement
  html.lang = locale
  html.dir = locale === 'fa' ? 'rtl' : 'ltr'
}

export function writeLocaleCookie(locale: Locale) {
  document.cookie = `afx-locale=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (productId, qty = 1) => {
        const lines = [...get().lines]
        const idx = lines.findIndex((l) => l.productId === productId)
        if (idx >= 0) lines[idx] = { ...lines[idx], quantity: Math.min(lines[idx].quantity + qty, 99) }
        else lines.push({ productId, quantity: Math.min(qty, 99) })
        set({ lines })
      },
      remove: (productId) => set({ lines: get().lines.filter((l) => l.productId !== productId) }),
      setQty: (productId, qty) => {
        if (qty <= 0) {
          get().remove(productId)
          return
        }
        set({
          lines: get().lines.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.min(qty, 99) } : l
          ),
        })
      },
      clear: () => set({ lines: [] }),
      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'afx-cart-v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // Persist ONLY cart lines — locale lives in the cookie (SSR source of truth).
      partialize: (s) => ({ lines: s.lines }) as unknown as AppState,
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    }
  )
)

/** Total item count across cart lines. */
export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0)
}
