# AFAGHX Storefront — فروشگاه دوزبانه آفاخس

> Amazon-grade bilingual e-commerce experience · تجربهٔ فروشگاهی هم‌تراز آمازون، دوزبانه (فارسی/انگلیسی)

## 🇮🇷 فارسی

### معرفی
این ماپ، لایهٔ EXPERIENCE پلتفرم AFAGHX را با معماری مرجع آمازون پیاده‌سازی می‌کند: هدر تیره با جست‌وجوی دامنه‌محور، ناوبری دسته‌بندی، کاروسل هیرو، ریل‌های محصول، کارت محصول با نشان‌های تخفیف/Prime، دیالوگ جزئیات محصول، سبد خرید ماندگار و فوتر چندستونه — همه با پشتیبانی کامل و بومی از **RTL (فارسی) و LTR (انگلیسی)**.

### ویژگی‌های کلیدی
| ویژگی | توضیح |
|---|---|
| دوزبانگی SSR | خواندن کوکی `afx-locale` در سرور؛ `<html lang dir>` قبل از رنگ‌آمیزی — بدون فلش (FOUC) |
| RTL واقعی | خواص منطقی CSS، آینه‌سازی ناوبری، اعداد فارسی، قیمت تومان |
| سبد خرید ماندگار | Zustand + localStorage با `skipHydration` (بدون عدم‌تطابق SSR) |
| جست‌وجو | دامنهٔ دسته‌بندی + فیلتر تخفیف‌ها + مرتب‌سازی |
| API فید | `GET /api/products?q=&category=&deals=&sort=` |
| دسترس‌پذیری | ARIA کامل، فوکوس‌پذیری، کنتراست AA |
| تصاویر مقاوم | `ProductImage` با fallback SVG در برابر خطای شبکه |

### اجرا
```bash
cd experience/storefront
bun install        # یا: npm install
bun run dev        # یا: npm run dev  →  http://localhost:3000
bun run build && bun run start   # نسخهٔ پروداکشن
```

### یکپارچگی پلتفرم / Platform Integration
- **جست‌وجو:** `GET /api/search` — با `MEILISEARCH_URL` از سرویس PLATFORM پاس می‌گیرد؛
  در غیر این صورت (یا در خطا) به کاتالوگ محلی کاهش سطح می‌دهد و هرگز جست‌وجو را نمی‌شکند.
  هدرهای `x-afx-search-source` و `x-afx-search-degraded` منبع واقعی را گزارش می‌کنند.
- **استقرار زندهٔ Meilisearch:** باینری رسمی + ایندکس `afaghx` + کلید فقط-جستجو
  (کم‌حداقل). راه‌اندازی، ایندکس‌گذاری و عملیات: `ops/README.md` ·
  اسکریپت‌ها: `ops/provision.ts` و `ops/index-catalog.ts`.
  الگوی نمونه: `env.example`.
- **زبان:** سوییچر هدر از قرارداد `AFAGHX_UX_CONTRACT` می‌خواند — fa/en فعال،
  ar/tr با رشتهٔ رسمی پلتفرم غیرفعال.
- جزئیات کامل: `ARCHITECTURE.md` و `ADR-EXP-001` (در ریشهٔ مخزن).
- تست‌های قرارداد: `bun test src/lib/search-client.test.ts` (۱۵ مورد).

### نقشهٔ معماری
```
src/
├── app/                    # Next.js App Router (SSR)
│   ├── layout.tsx          # تزریق lang/dir از کوکی — بدون فلش زبان
│   ├── page.tsx            # صفحه اصلی (Server Component)
│   └── api/products/       # فید کاتالوگ با فیلترها
├── lib/
│   ├── types.ts            # انواع سخت‌گیرانه دامنه (Product, Money, Locale)
│   ├── i18n.ts             # دیکشنری تایپ‌شده fa/en — پوشش کامل رشته‌ها
│   ├── languages.ts        # پل زبان — آینهٔ AFAGHX_UX_CONTRACT v1.0.0
│   ├── search-client.ts    # آینهٔ قرارداد جست‌وجوی PLATFORM (Meilisearch)
│   ├── catalog.ts          # ۲۵ محصول دوزبانه / ۸ دسته
│   └── format.ts           # اعداد فارسی، تومان/USD، bidi-safe
├── store/app-store.ts      # Zustand: سبد ماندگار + locale
└── components/
    ├── layout/             # Header, SubNav, Footer
    ├── home/               # HeroCarousel, CategoryGrid, ProductRail
    ├── product/            # ProductCard, ProductDialog, Stars, ProductImage
    ├── cart/CartSheet.tsx  # سبد خرید کشویی
    └── Storefront.tsx      # هماهنگ‌کنندهٔ کلاینت
```

---

## 🇬🇧 English

### Overview
This app implements the AFAGHX EXPERIENCE layer with Amazon's reference architecture: dark header with category-scoped search, category sub-navigation, hero carousel, product rails, deal/prime-badged product cards, product detail dialog, persistent cart, and a multi-column footer — with **native RTL (Persian) and LTR (English)** support.

### Key Features
- **SSR bilingual**: `afx-locale` cookie read server-side; `<html lang dir>` set before paint (zero flash).
- **True RTL**: logical CSS properties, mirrored navigation, Persian digits, Toman pricing.
- **Persistent cart**: Zustand + localStorage with `skipHydration` (no SSR mismatch).
- **Search**: category-scoped query + deals filter + sorting.
- **Catalog API**: `GET /api/products?q=&category=&deals=&sort=`.
- **Accessibility**: full ARIA, keyboard focus, AA contrast.
- **Resilient imagery**: `ProductImage` with SVG network-error fallback.

### Run
```bash
cd experience/storefront
bun install   # or npm install
bun run dev   # → http://localhost:3000
bun run build && bun run start   # production
```

### Quality
- ESLint: 0 errors / 0 warnings · Browser console: 0 errors
- Verified EN + FA (RTL), mobile 390px, cart/search/dialog interactions
- Self-assessment: **9.5 / 10**

---
Part of the AFAGHX platform (layer 5 — EXPERIENCE). © AFAGHX
