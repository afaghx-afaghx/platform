import type { Metadata } from 'next'
import { MarketplaceHome } from '@/components/MarketplaceHome'
import { getLocale } from '@/lib/server-locale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return locale === 'fa'
    ? {
        title: 'AFAGHX | اکوسیستم دیجیتال صنعت، تجارت و خدمات',
        description:
          'اتصال تولیدکنندگان، کارخانه‌ها، تأمین‌کنندگان، خریداران B2B و B2C، خدمات و شرکای تجاری در اکوسیستم دیجیتال AFAGHX.',
        alternates: { canonical: '/' },
      }
    : {
        title: 'AFAGHX — Digital Ecosystem for Industry, Commerce and Services',
        description:
          'Connect with manufacturers, suppliers, business buyers, consumers and service partners through the AFAGHX digital business ecosystem.',
        alternates: { canonical: '/' },
      }
}

export default async function HomePage() {
  const locale = await getLocale()
  return <MarketplaceHome initialLocale={locale} />
}
