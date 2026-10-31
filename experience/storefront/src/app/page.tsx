import type { Metadata } from 'next'
import { MarketplaceHome } from '@/components/MarketplaceHome'
import { getLocale } from '@/lib/server-locale'

export const metadata: Metadata = {
  title: 'AFAGHX — Global B2B & B2C Commerce, Sourcing and Advertising',
  description:
    'Discover products, source from business suppliers, and explore clearly labelled promotional placements in the AFAGHX commerce ecosystem.',
  alternates: {
    canonical: '/',
  },
}

export default async function HomePage() {
  const locale = await getLocale()
  return <MarketplaceHome initialLocale={locale} />
}
