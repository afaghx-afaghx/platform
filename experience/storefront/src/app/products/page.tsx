import { Storefront } from '@/components/Storefront'
import { getLocale } from '@/lib/server-locale'

/**
 * /products — the Amazon-grade bilingual marketplace (EXPERIENCE layer).
 * The catalog is bundled statically — zero latency, zero loading spinners
 * on first render. Locale comes from the afx-locale cookie (SSR).
 */
export const metadata = {
  title: 'AFAGHX Marketplace | afaghx.com',
}

export default async function ProductsPage() {
  const locale = await getLocale()
  return <Storefront initialLocale={locale} />
}
