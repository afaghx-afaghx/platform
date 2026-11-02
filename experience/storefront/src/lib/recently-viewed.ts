const STORAGE_KEY = 'afx-recently-viewed-v1'
const LIMIT = 100
const EVENT_NAME = 'afx:recently-viewed'

export interface RecentlyViewedEntry {
  productId: string
  viewedAt: number
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined'
}

export function readRecentlyViewed(): RecentlyViewedEntry[] {
  if (!canUseStorage()) return []
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is RecentlyViewedEntry =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as RecentlyViewedEntry).productId === 'string' &&
      typeof (item as RecentlyViewedEntry).viewedAt === 'number'
    ).slice(0, LIMIT)
  } catch {
    return []
  }
}

export function recordRecentlyViewed(productId: string): void {
  if (!canUseStorage() || !productId) return
  const next = [
    { productId, viewedAt: Date.now() },
    ...readRecentlyViewed().filter((item) => item.productId !== productId),
  ].slice(0, LIMIT)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {
    // Storage may be disabled or full; product discovery must still work.
  }
}

export function clearRecentlyViewed(): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {
    // Ignore storage restrictions; the storefront remains usable.
  }
}

export function recentlyViewedEventName(): string {
  return EVENT_NAME
}
