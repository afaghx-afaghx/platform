import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Package } from 'lucide-react'
import { getBasket } from '@/lib/product-baskets'
import { PRODUCTS } from '@/lib/catalog'
import { getLocale } from '@/lib/server-locale'
import { ProductImage } from '@/components/product/ProductImage'

interface CategoryPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { id } = await params
  const basket = getBasket(id)
  if (!basket) return { title: 'Category not found | AFAGHX' }
  return {
    title: `${basket.name.en} | AFAGHX`,
    description: basket.description.en,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const [{ id }, locale] = await Promise.all([params, getLocale()])
  const basket = getBasket(id)
  if (!basket) notFound()

  const fa = locale === 'fa'
  const products = basket.productIds
    .map((productId) => PRODUCTS.find((product) => product.id === productId))
    .filter((product): product is (typeof PRODUCTS)[number] => Boolean(product))
  const BackArrow = fa ? ArrowRight : ArrowLeft

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-6 sm:px-5" dir={fa ? 'rtl' : 'ltr'}>
      <nav aria-label={fa ? 'مسیر صفحه' : 'Breadcrumb'} className="mb-5 text-sm text-slate-500">
        <Link href="/" className="font-semibold text-sky-700 hover:underline">
          {fa ? 'صفحه اصلی' : 'Home'}
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{basket.name[locale]}</span>
      </nav>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:underline">
          <BackArrow size={16} aria-hidden="true" />
          {fa ? 'بازگشت به صفحه اصلی' : 'Back to home'}
        </Link>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">AFAGHX CATALOG</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{basket.name[locale]}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{basket.description[locale]}</p>
      </header>

      {products.length > 0 ? (
        <section className="mt-5" aria-labelledby="category-products-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="category-products-title" className="text-lg font-black text-slate-950">
              {fa ? 'کالاهای نمونه این دسته' : 'Sample products in this category'}
            </h2>
            <span className="text-xs text-slate-500">
              {fa ? `${products.length} کالای نمونه` : `${products.length} sample products`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50">
                  <ProductImage
                    product={product}
                    alt={product.title[locale]}
                    sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 18vw"
                    className="object-contain p-3"
                  />
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-slate-900">
                  {product.title[locale]}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{product.brand}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {fa ? 'موجودی نمایشی' : 'Demo catalogue stock'}: {product.stock}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <Package size={34} className="text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-base font-black text-slate-800">
            {fa ? 'هنوز کالایی در این دسته ثبت نشده است' : 'No products have been published in this category yet'}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {fa
              ? 'پس از ثبت کالا توسط فروشنده و تکمیل بررسی و تأیید، محصولات این دسته در این صفحه نمایش داده می‌شوند.'
              : 'Products will appear here after seller submission and the required review and approval.'}
          </p>
        </section>
      )}

      <p className="mt-5 text-xs leading-6 text-slate-500">
        {fa
          ? 'توجه: اطلاعات کاتالوگ فعلی نمایشی است و موجودی، قیمت و وضعیت فروش واقعی محسوب نمی‌شود.'
          : 'Note: The current catalogue is demonstrative. Stock, pricing and sale status are not verified live data.'}
      </p>
    </main>
  )
}
