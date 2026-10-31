import type { Metadata } from 'next'
import { MarketplaceHome } from '@/components/MarketplaceHome'
import { getLocale } from '@/lib/server-locale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return locale === 'fa'
    ? {
        title: 'AFAGHX | تجارت جهانی، خرید B2B و B2C و تبلیغات',
        description:
          'کشف محصولات، تأمین سازمانی، ارتباط با تأمین‌کنندگان و جایگاه‌های تبلیغاتی در اکوسیستم تجارت AFAGHX.',
        alternates: { canonical: '/' },
      }
    : {
        title: 'AFAGHX — Global B2B & B2C Commerce, Sourcing and Advertising',
        description:
          'Discover products, source from business suppliers, and explore clearly labelled promotional placements in the AFAGHX commerce ecosystem.',
        alternates: { canonical: '/' },
      }
}

export default async function HomePage() {
  const locale = await getLocale()
  return <MarketplaceHome initialLocale={locale} />
}
