import type { CategoryId, Locale } from './types'

/**
 * Typed bilingual dictionary. `as const` + keyof lookup guarantees
 * compile-time exhaustiveness: adding a key here forces every consumer
 * to stay in sync. No loose strings scattered across components.
 */
export const dict = {
  meta: {
    title: { en: 'AFAGHX — Amazon-Grade Storefront', fa: 'افاغکس — فروشگاه در کلاس جهانی' },
    description: {
      en: 'AFAGHX intelligent ecosystem storefront — millions of products, bilingual experience.',
      fa: 'فروشگاه اکوسیستم هوشمند افاغکس — میلیون‌ها محصول، تجربه دوزبانه.',
    },
  },
  brand: { en: 'AFAGHX', fa: 'افاغکس' },
  header: {
    deliverTo: { en: 'Deliver to', fa: 'ارسال به' },
    location: { en: 'Tehran, Iran', fa: 'تهران، ایران' },
    searchPlaceholder: { en: 'Search AFAGHX', fa: 'جستجو در افاغکس' },
    allDepartments: { en: 'All', fa: 'همه دسته‌ها' },
    accountGreeting: { en: 'Hello, Sign in', fa: 'سلام، وارد شوید' },
    accountLists: { en: 'Account & Lists', fa: 'حساب و لیست‌ها' },
    returns: { en: 'Returns', fa: 'مرجوعی' },
    orders: { en: '& Orders', fa: 'و سفارش‌ها' },
    cart: { en: 'Cart', fa: 'سبد خرید' },
    languageLabel: { en: 'Language', fa: 'زبان' },
    english: { en: 'English — EN', fa: 'انگلیسی — EN' },
    persian: { en: 'Persian — FA', fa: 'فارسی — FA' },
    switchTo: { en: 'Switch to Persian', fa: 'Switch to English' },
    /** Exact strings from the platform language system (afaghx-language-system.js). */
    comingSoon: { en: 'Not yet active', fa: 'فعلاً در دسترس نیست' },
  },
  nav: {
    all: { en: 'All', fa: 'همه' },
    todaysDeals: { en: "Today's Deals", fa: 'پیشنهادهای امروز' },
    bestSellers: { en: 'Best Sellers', fa: 'پرفروش‌ترین‌ها' },
    newArrivals: { en: 'New Releases', fa: 'تازه‌رسیده‌ها' },
    giftCards: { en: 'Gift Cards', fa: 'کارت هدیه' },
    customerService: { en: 'Customer Service', fa: 'خدمات مشتریان' },
    sell: { en: 'Sell', fa: 'فروش در افاغکس' },
    prime: { en: 'Prime', fa: 'پرایم' },
    browseCategories: { en: 'Shop by Category', fa: 'خرید بر اساس دسته' },
  },
  categories: {
    all: { en: 'All Departments', fa: 'همه دسته‌ها' },
    electronics: { en: 'Electronics', fa: 'لوازم الکترونیکی' },
    computers: { en: 'Computers', fa: 'رایانه و لپ‌تاپ' },
    'home-kitchen': { en: 'Home & Kitchen', fa: 'خانه و آشپزخانه' },
    fashion: { en: 'Fashion', fa: 'مد و پوشاک' },
    watches: { en: 'Watches', fa: 'ساعت و زیورآلات' },
    books: { en: 'Books', fa: 'کتاب و رسانه' },
    beauty: { en: 'Beauty & Personal Care', fa: 'زیبایی و مراقبت شخصی' },
    sports: { en: 'Sports & Outdoors', fa: 'ورزش و طبیعت‌گردی' },
  } satisfies Record<CategoryId | 'all', { en: string; fa: string }>,
  categoryTaglines: {
    electronics: { en: 'Smart tech for everyday life', fa: 'فناوری هوشمند برای زندگی روزمره' },
    computers: { en: 'Power your workflow', fa: 'قدرت برای کار شما' },
    'home-kitchen': { en: 'Upgrade your home', fa: 'خانه‌ای هوشمندتر' },
    fashion: { en: 'Style that moves you', fa: 'سبکی که با شما حرکت می‌کند' },
    watches: { en: 'Time, perfected', fa: 'زمان، در کمال بی‌نقصی' },
    books: { en: 'Read. Grow. Lead.', fa: 'بخوانید. رشد کنید. پیشتاز شوید.' },
    beauty: { en: 'Glow every day', fa: 'درخشش هر روز' },
    sports: { en: 'Train beyond limits', fa: 'تمرین فراتر از محدودیت' },
  } satisfies Record<CategoryId, { en: string; fa: string }>,
  hero: {
    slides: [
      {
        kicker: { en: 'AFAGHX Ecosystem', fa: 'اکوسیستم افاغکس' },
        title: { en: 'The everything store, in two languages', fa: 'فروشگاه همه‌چیز، به دو زبان' },
        subtitle: {
          en: 'Shop electronics, home, fashion and more — with seamless Persian & English.',
          fa: 'از الکترونیک تا خانه و مد — با تجربه یکپارچه فارسی و انگلیسی.',
        },
        cta: { en: 'Shop now', fa: 'همین حالا خرید کنید' },
        theme: 'night',
      },
      {
        kicker: { en: 'Autumn Tech Event', fa: 'رویداد فناوری پاییزه' },
        title: { en: 'Up to 40% off top electronics', fa: 'تا ۴۰٪ تخفیف برترین کالاهای دیجیتال' },
        subtitle: {
          en: 'Headphones, laptops, TVs and smart gear at season-low prices.',
          fa: 'هدفون، لپ‌تاپ، تلویزیون و گجت‌های هوشمند با کمترین قیمت فصل.',
        },
        cta: { en: 'See deals', fa: 'مشاهده تخفیف‌ها' },
        theme: 'ember',
      },
      {
        kicker: { en: 'New for Home', fa: 'جدیدترین‌های خانه' },
        title: { en: 'Smart upgrades for every room', fa: 'ارتقای هوشمند برای هر اتاق' },
        subtitle: {
          en: 'Espresso machines, air fryers and robot vacuums people love.',
          fa: 'اسپرسوساز، سرخ‌کن هوامدار و جاروبرقی رباتیک محبوب کاربران.',
        },
        cta: { en: 'Explore home', fa: 'کاوش خانه' },
        theme: 'forest',
      },
      {
        kicker: { en: 'AFAGHX Choice', fa: 'انتخاب افاغکس' },
        title: { en: 'Best sellers, loved worldwide', fa: 'پرفروش‌ترین‌ها، محبوب در سراسر جهان' },
        subtitle: {
          en: 'Thousands of 5-star reviews across our most-loved products.',
          fa: 'هزاران نظر ۵ ستاره روی محبوب‌ترین محصولات ما.',
        },
        cta: { en: 'Shop best sellers', fa: 'خرید پرفروش‌ها' },
        theme: 'royal',
      },
    ] as ReadonlyArray<{
      kicker: { en: string; fa: string }
      title: { en: string; fa: string }
      subtitle: { en: string; fa: string }
      cta: { en: string; fa: string }
      theme: 'night' | 'ember' | 'forest' | 'royal'
    }>,
    prev: { en: 'Previous slide', fa: 'اسلاید قبلی' },
    next: { en: 'Next slide', fa: 'اسلاید بعدی' },
    goto: { en: 'Go to slide', fa: 'برو به اسلاید' },
  },
  sections: {
    dealsTitle: { en: "Today's Deals", fa: 'پیشنهادهای امروز' },
    dealsLink: { en: 'See all deals', fa: 'مشاهده همه تخفیف‌ها' },
    bestSellersTitle: { en: 'Best Sellers in Electronics', fa: 'پرفروش‌ترین‌های الکترونیک' },
    bestSellersLink: { en: 'Shop more', fa: 'خرید بیشتر' },
    categoriesTitle: { en: 'Shop by category', fa: 'خرید بر اساس دسته‌بندی' },
    categoriesLink: { en: 'Explore all', fa: 'کاوش همه' },
    recommendedTitle: { en: 'Recommended for you', fa: 'پیشنهادشده برای شما' },
    resultsTitle: { en: 'Results', fa: 'نتایج' },
    resultsFor: { en: 'results for', fa: 'نتیجه برای' },
    inCategory: { en: 'in', fa: 'در' },
    noResults: {
      title: { en: 'No results found', fa: 'نتیجه‌ای یافت نشد' },
      body: {
        en: 'Try different keywords or remove filters to see more products.',
        fa: 'کلیدواژه‌های دیگری را امتحان کنید یا فیلترها را حذف کنید.',
      },
      reset: { en: 'Clear search & filters', fa: 'پاک‌سازی جستجو و فیلترها' },
    },
  },
  product: {
    addToCart: { en: 'Add to Cart', fa: 'افزودن به سبد' },
    buyNow: { en: 'Buy Now', fa: 'خرید فوری' },
    inStock: { en: 'In Stock', fa: 'موجود در انبار' },
    lowStock: { en: 'Only {n} left in stock', fa: 'تنها {n} عدد در انبار باقی مانده' },
    outOfStock: { en: 'Currently unavailable', fa: 'در حال حاضر ناموجود' },
    freeDelivery: { en: 'FREE delivery', fa: 'ارسال رایگان' },
    deliveryTomorrow: { en: 'Get it by tomorrow', fa: 'دریافت فردا' },
    ratings: { en: '{n} ratings', fa: '{n} دیدگاه' },
    bestSeller: { en: '#1 Best Seller', fa: 'پرفروش‌ترین' },
    choice: { en: "AFAGHX's Choice", fa: 'انتخاب افاغکس' },
    newArrival: { en: 'New Arrival', fa: 'تازه رسیده' },
    limitedDeal: { en: 'Limited time deal', fa: 'پیشنهاد محدود' },
    save: { en: 'Save', fa: 'صرفه‌جویی' },
    off: { en: 'off', fa: 'تخفیف' },
    viewDetails: { en: 'View details', fa: 'مشاهده جزئیات' },
    quickView: { en: 'Quick view', fa: 'نمایش سریع' },
    aboutItem: { en: 'About this item', fa: 'درباره این کالا' },
    quantity: { en: 'Qty:', fa: 'تعداد:' },
    addedToCart: { en: 'Added to cart', fa: 'به سبد خرید اضافه شد' },
    addedToCartBody: { en: '{title} is now in your cart.', fa: '«{title}» اکنون در سبد شماست.' },
    viewCart: { en: 'View Cart', fa: 'مشاهده سبد' },
    brandLabel: { en: 'Brand:', fa: 'برند:' },
    visitStore: { en: 'Visit the {brand} Store', fa: 'مشاهده فروشگاه {brand}' },
    close: { en: 'Close', fa: 'بستن' },
    prevImage: { en: 'Previous image', fa: 'تصویر قبلی' },
    nextImage: { en: 'Next image', fa: 'تصویر بعدی' },
  },
  cart: {
    title: { en: 'Shopping Cart', fa: 'سبد خرید' },
    empty: { en: 'Your AFAGHX Cart is empty', fa: 'سبد خرید افاغکس شما خالی است' },
    emptyBody: {
      en: 'Great deals are waiting. Start shopping to fill it up.',
      fa: 'پیشنهادهای عالی در انتظار شماست. خرید را شروع کنید.',
    },
    startShopping: { en: 'Start shopping', fa: 'شروع خرید' },
    price: { en: 'Price', fa: 'قیمت' },
    subtotal: { en: 'Subtotal ({n} items)', fa: 'جمع سبد ({n} کالا)' },
    subtotalOne: { en: 'Subtotal (1 item)', fa: 'جمع سبد (۱ کالا)' },
    checkout: { en: 'Proceed to Checkout', fa: 'ادامه فرایند خرید' },
    remove: { en: 'Remove', fa: 'حذف' },
    increase: { en: 'Increase quantity', fa: 'افزایش تعداد' },
    decrease: { en: 'Decrease quantity', fa: 'کاهش تعداد' },
    gift: { en: 'This order contains a gift', fa: 'این سفارش شامل هدیه است' },
    freeShipping: { en: 'Your order qualifies for FREE delivery.', fa: 'سفارش شما واجد ارسال رایگان است.' },
    checkoutSoon: {
      en: 'Checkout is a demo — payment is not processed.',
      fa: 'پرداخت صرفاً نمایشی است — تراکنش واقعی انجام نمی‌شود.',
    },
    clearCart: { en: 'Clear cart', fa: 'خالی کردن سبد' },
    cartCleared: { en: 'Cart cleared', fa: 'سبد خرید خالی شد' },
    removed: { en: 'Removed from cart', fa: 'از سبد خرید حذف شد' },
  },
  footer: {
    backToTop: { en: 'Back to top', fa: 'بازگشت به بالا' },
    getToKnow: { en: 'Get to Know Us', fa: 'با ما آشنا شوید' },
    makeMoney: { en: 'Make Money with Us', fa: 'با ما درآمد کسب کنید' },
    payment: { en: 'Payment Products', fa: 'ابزارهای پرداخت' },
    letUsHelp: { en: 'Let Us Help You', fa: 'در خدمت شما هستیم' },
    columns: {
      getToKnow: {
        links: [
          { en: 'About AFAGHX', fa: 'درباره افاغکس' },
          { en: 'Careers', fa: 'فرصت‌های شغلی' },
          { en: 'Press Releases', fa: 'اخبار و بیانیه‌ها' },
          { en: 'Sustainability', fa: 'پایداری و محیط‌زیست' },
        ],
      },
      makeMoney: {
        links: [
          { en: 'Sell on AFAGHX', fa: 'فروش در افاغکس' },
          { en: 'Become an Affiliate', fa: 'همکاری در فروش' },
          { en: 'Advertise Your Products', fa: 'تبلیغ کالاهای شما' },
          { en: 'Self-Publish with Us', fa: 'انتشار مستقل آثار' },
        ],
      },
      payment: {
        links: [
          { en: 'Business Card', fa: 'کارت کسب‌وکار' },
          { en: 'Shop with Points', fa: 'خرید با امتیاز' },
          { en: 'Reload Your Balance', fa: 'شارژ حساب' },
          { en: 'Currency Converter', fa: 'تبدیل ارز' },
        ],
      },
      letUsHelp: {
        links: [
          { en: 'Your Account', fa: 'حساب کاربری' },
          { en: 'Your Orders', fa: 'سفارش‌های شما' },
          { en: 'Shipping Rates & Policies', fa: 'نرخ‌ها و سیاست‌های ارسال' },
          { en: 'Returns & Replacements', fa: 'مرجوعی و تعویض' },
        ],
      },
    },
    copyright: { en: '© 2026 AFAGHX Ecosystem — A demo storefront. All rights reserved.', fa: '© ۲۰۲۶ اکوسیستم افاغکس — فروشگاه نمایشی. تمام حقوق محفوظ است.' },
    languageNote: { en: 'Persian (RTL) & English (LTR)', fa: 'فارسی (راست‌به‌چپ) و انگلیسی (چپ‌به‌راست)' },
  },
  search: {
    sortLabel: { en: 'Sort by:', fa: 'مرتب‌سازی:' },
    sort: {
      featured: { en: 'Featured', fa: 'پیشنهادی' },
      'price-asc': { en: 'Price: Low to High', fa: 'قیمت: کم به زیاد' },
      'price-desc': { en: 'Price: High to Low', fa: 'قیمت: زیاد به کم' },
      rating: { en: 'Avg. Customer Review', fa: 'میانگین امتیاز' },
      newest: { en: 'Newest Arrivals', fa: 'جدیدترین' },
    } as Record<string, { en: string; fa: string }>,
    dealsOnly: { en: 'Deals only', fa: 'فقط تخفیف‌دارها' },
    filter: { en: 'Filter', fa: 'فیلتر' },
  },
  misc: {
    free: { en: 'FREE', fa: 'رایگان' },
    sponsored: { en: 'Sponsored', fa: 'تبلیغاتی' },
    loading: { en: 'Loading…', fa: 'در حال بارگذاری…' },
    toman: { en: 'Toman', fa: 'تومان' },
  },
} as const

export type Dict = typeof dict

/** Lookup helper — fully typed by key path usage at call sites. */
export function t(locale: Locale) {
  return locale
}
