import { RecentlyViewedSection } from '@/components/home/RecentlyViewedSection'
import { getLocale } from '@/lib/server-locale'

export const metadata = {
  title: 'AFAGHX | Recently Viewed Products',
}

export default async function AccountHistoryPage() {
  const locale = await getLocale()
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-6 sm:px-6 sm:py-10">
      <RecentlyViewedSection locale={locale} full />
    </main>
  )
}
