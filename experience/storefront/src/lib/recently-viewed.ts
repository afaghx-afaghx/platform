const STORAGE_KEY = 'afx-recently-viewed-v1'
const LIMIT = 100
const EVENT_NAME = 'afx:recently-viewed'

export interface RecentlyViewedEntry {
  productId: string
  viewedAt: number
}

export function readRecentlyViewedSnapshot(): string {
  if (typeof window === 'undefined') return '[]'
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '[]'
  } catch {
    return '[]'
  }
}

export function parseRecentlyViewedSnapshot(snapshot: string): RecentlyViewedEntry[] {
  try {
    const parsed: unknown = JSON.parse(snapshot)
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

export function subscribeRecentlyViewed(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT_NAME, callback)
    window.removeEventListener('storage', callback)
  }
}

export function recordRecentlyViewed(productId: string): void {
  if (typeof window === 'undefined' || !productId) return
  const next = [
    { productId, viewedAt: Date.now() },
    ...parseRecentlyViewedSnapshot(readRecentlyViewedSnapshot()).filter((item) => item.productId !== productId),
  ].slice(0, LIMIT)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {
    // Storage may be disabled or full; product discovery must still work.
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {
    // Ignore storage restrictions; the storefront remains usable.
  }
}
