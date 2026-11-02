import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, PackageSearch } from 'lucide-react'
import { getBasket, PRODUCT_BASKETS } from '@/lib/product-baskets'
import { PRODUCTS } from '@/lib/catalog'
import { getLocale } from '@/lib/server-locale'
import { ProductBasketResults } from '@/components/product/ProductBasketResults'

export function generateStaticParams() {
  return PRODUCT_BASKETS.map((basket) => ({ basketId: basket.id }))
}

export default async function ProductBasketPage({ params }: { params: Promise<{ basketId: string }> }) {
  const [{ basketId }, locale] = await Promise.all([params, getLocale()])
  const basket = getBasket(basketId)
  if (!basket) notFound()
  const products = PRODUCTS.filter((product) => basket.productIds.includes(product.id))
  const fa = locale === 'fa'
  const Back = fa ? ArrowRight : ArrowLeft
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-6 sm:px-6 sm:py-10" dir={fa ? 'rtl' : 'ltr'}>
      <Link href="/#product-baskets" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-bold text-afx-price hover:bg-slate-50"><Back size={16} aria-hidden="true" />{fa ? 'بازگشت به ۳۶ سبد کالا' : 'Back to 36 product baskets'}</Link>
      <header className="mt-5 rounded-2xl bg-[#142638] p-5 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-sky-200">{fa ? 'سبد کالایی AFAGHX' : 'AFAGHX PRODUCT BASKET'}</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">{basket.name[locale]}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-white/75">{basket.description[locale]}</p>
        <p className="mt-4 text-xs font-bold text-sky-100">{fa ? `${products.length} کالا در کاتالوگ فعلی` : `${products.length} items in current catalog`}</p>
      </header>
      {products.length ? <ProductBasketResults products={products} locale={locale} /> : (
        <section className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
          <PackageSearch size={36} className="mx-auto text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-black text-afx-price">{fa ? 'هنوز کالایی به این سبد متصل نشده است' : 'No products are assigned to this basket yet'}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{fa ? 'این سبد در ساختار کاتالوگ ثبت شده است، اما برای جلوگیری از نمایش کالای نامرتبط، تا زمان ورود محصول معتبر خالی می‌ماند.' : 'This basket exists in the catalog taxonomy. It stays empty until relevant products are added; unrelated products are not shown as substitutes.'}</p>
          <Link href="/#product-baskets" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-afx-navy px-5 text-sm font-bold text-white">{fa ? 'مرور سبدهای دیگر' : 'Browse other baskets'}</Link>
        </section>
      )}
    </main>
  )
}
