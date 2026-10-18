import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { getLocale } from '@/lib/server-locale'
import { dict } from '@/lib/i18n'

/**
 * SSR locale resolution: cookie → <html lang dir> before first paint.
 * Single source of truth: @/lib/server-locale (default FA/RTL; the
 * `afx-locale=en` cookie opts into EN/LTR). Client switches update cookie +
 * DOM together — no flash of wrong direction, no hydration mismatch.
 */

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
