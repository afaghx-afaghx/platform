import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { dict } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

/**
 * SSR locale resolution: cookie → <html lang dir> before first paint.
 * No flash of wrong direction, no hydration mismatch — the server already
 * knows the direction. Client switches update cookie + DOM + store together.
 */
const LOCALE_COOKIE = 'afx-locale'

async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return store.get(LOCALE_COOKIE)?.value === 'fa' ? 'fa' : 'en'
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: dict.meta.title[locale],
    description: dict.meta.description[locale],
    icons: { icon: '/favicon.svg' },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale()
  const dir = locale === 'fa' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/Vazirmatn-font-face.css"
        />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
