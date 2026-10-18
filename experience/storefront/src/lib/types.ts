/**
 * AFAGHX Storefront — Core domain types
 * Strict, exhaustive, no `any`. Every user-facing string is bilingual.
 */

export type Locale = 'fa' | 'en'

export interface LocalizedText {
  en: string
  fa: string
}

export type CategoryId =
  | 'electronics'
  | 'computers'
  | 'home-kitchen'
  | 'fashion'
  | 'watches'
  | 'books'
  | 'beauty'
  | 'sports'

export type ProductBadge = 'best-seller' | 'choice' | 'new-arrival' | 'limited-deal'

export interface Money {
  /** USD price with cents */
  usd: number
  /** Iranian Toman price (no decimals by convention) */
  toman: number
}

export interface Product {
  id: string
  category: CategoryId
  title: LocalizedText
  brand: string
  description: LocalizedText
  features: { en: string[]; fa: string[] }
  price: Money
  /** Original "was" price — enables deal badges & strike-through */
  listPrice?: Money
  rating: number
  reviewCount: number
  image: string
  /** Inline SVG data-URI shown if the primary image fails to load */
  imageFallback?: string
  badge?: ProductBadge
  isPrime: boolean
  stock: number
}

export interface CartLine {
  productId: string
  quantity: number
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest'

export interface SearchState {
  /** home = immersive storefront; results = filtered catalog view */
  mode: 'home' | 'results'
  query: string
  category: CategoryId | 'all'
  sort: SortOption
  dealsOnly: boolean
}
