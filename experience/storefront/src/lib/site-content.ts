/**
 * AFAGHX.com — bilingual site content (typed, SSR).
 *
 * Route set mirrors the canonical experience contract
 * (experience/web/public/afaghx-experience-contract.js → routes) and the
 * module registry (experience/module-registry.json → hosts). Copy is drawn
 * from the platform README's approved five-layer spine — no invented facts.
 */
import type { LocalizedText } from './types'

export type SiteSlug =
  | 'suppliers'
  | 'factories'
  | 'services'
  | 'markets'
  | 'business-network'
  | 'intelligence'

export interface ContentBlock {
  title: LocalizedText
  body: LocalizedText
}

export interface SiteStat {
  value: number
  label: LocalizedText
}

export interface SitePage {
  slug: SiteSlug
  navLabel: LocalizedText
  /** Canonical host from experience/module-registry.json */
  host: string
  title: LocalizedText
  subtitle: LocalizedText
  blocks: ContentBlock[]
  capabilities: LocalizedText[]
  stats: SiteStat[]
  cta: LocalizedText
}

/* ── Navigation — canonical contract routes ────────────────────── */

export const SITE_NAV: readonly { href: string; label: LocalizedText }[] =
  Object.freeze([
    { href: '/', label: { en: 'Home', fa: 'خانه' } },
    { href: '/products', label: { en: 'Products', fa: 'محصولات' } },
    { href: '/suppliers', label: { en: 'Suppliers', fa: 'تأمین‌کنندگان' } },
    { href: '/factories', label: { en: 'Factories', fa: 'کارخانه‌ها' } },
    { href: '/services', label: { en: 'Services', fa: 'خدمات' } },
    { href: '/markets', label: { en: 'Markets', fa: 'بازارها' } },
    { href: '/business-network', label: { en: 'Business Network', fa: 'شبکهٔ کسب‌وکار' } },
    { href: '/intelligence', label: { en: 'Intelligence', fa: 'هوش' } },
  ])

/* ── Landing — mirrors homeSections of the UX contract ────────── */

export const HOME = Object.freeze({
  hero: {
    eyebrow: { en: 'AFAGHX Ecosystem Platform', fa: 'پلتفرم اکوسیستم AFAGHX' },
    title: {
      en: 'Commerce, Industry and Intelligence — One Governed Ecosystem',
      fa: 'تجارت، صنعت و هوش — یک اکوسیستم حاکمیت‌شده',
    },
    subtitle: {
      en: 'AFAGHX is an ecosystem platform for commerce, industry, services, business communication and intelligence — not a single storefront, but a five-layer governed spine from trust to experience.',
      fa: 'افاخس پلتفرم اکوسیستم برای تجارت، صنعت، خدمات، ارتباطات کسب‌وکار و هوش است — نه فقط یک فروشگاه؛ ستون فقرات پنج‌لایهٔ حاکمیت‌شده از اعتماد تا تجربه.',
    },
    primaryCta: { en: 'Enter the Marketplace', fa: 'ورود به بازار' },
    secondaryCta: { en: 'Explore the Architecture', fa: 'کاوش در معماری' },
  },

  actions: Object.freeze([
    {
      title: { en: 'Buy with confidence', fa: 'با اطمینان بخرید' },
      body: {
        en: 'A bilingual marketplace with deal pricing, verified sellers and a persistent cart.',
        fa: 'بازاری دوزبانه با قیمت‌های ویژه، فروشندگان احرازشده و سبد خرید ماندگار.',
      },
      href: '/products',
      cta: { en: 'Shop now', fa: 'همین حالا بخرید' },
    },
    {
      title: { en: 'Sell to the network', fa: 'به شبکه بفروشید' },
      body: {
        en: 'Seller workspaces with inventory, orders and marketing built on one identity spine.',
        fa: 'فضای کاری فروشندگان با انبار، سفارش‌ها و بازاریابی بر پایهٔ یک ستون هویتی.',
      },
      href: '/suppliers',
      cta: { en: 'Become a seller', fa: 'فروشنده شوید' },
    },
    {
      title: { en: 'Produce and manufacture', fa: 'تولید و ساخت' },
      body: {
        en: 'Factories list capacity and take contract manufacturing orders across 35+ baskets.',
        fa: 'کارخانه‌ها ظرفیت خود را ثبت می‌کنند و سفارش ساخت در بیش از ۳۵ سبد می‌پذیرند.',
      },
      href: '/factories',
      cta: { en: 'List capacity', fa: 'ثبت ظرفیت' },
    },
    {
      title: { en: 'Offer and find services', fa: 'خدمات ارائه و بیابید' },
      body: {
        en: 'The canonical services host connects providers with businesses across the ecosystem.',
        fa: 'میزبان رسمی خدمات، ارائه‌دهندگان را با کسب‌وکارهای اکوسیستم پیوند می‌زند.',
      },
      href: '/services',
      cta: { en: 'Discover services', fa: 'کشف خدمات' },
    },
  ]),

  layers: Object.freeze([
    {
      id: 'AFX-CORE',
      title: { en: 'Trust Foundation', fa: 'بنیان اعتماد' },
      body: {
        en: 'Identity, credentials, authentication, RBAC, policy, audit, consent, trust primitives and registry — one authority, fail-closed.',
        fa: 'هویت، اعتبارنامه‌ها، احراز هویت، دسترسی نقش‌محور، سیاست، حسابرسی، رضایت و اعتماد — یک مرجع واحد با سیاست بسته‌شوندگی در خطا.',
      },
    },
    {
      id: 'AFX-PLATFORM',
      title: { en: 'Shared Platform', fa: 'پلتفرم مشترک' },
      body: {
        en: 'Gateway, events, queue, workflow, search, cache, storage, notification, localization and currency — versioned contracts for every capability.',
        fa: 'گیت‌وی، رخدادها، صف، گردش کار، جست‌وجو، کش، ذخیره‌سازی، اعلان، بومی‌سازی و ارز — قراردادهای نسخه‌دار برای هر توان.',
      },
    },
    {
      id: 'DOMAIN',
      title: { en: 'Business Domains', fa: 'دامنه‌های کسب‌وکار' },
      body: {
        en: 'Independently bounded business capabilities with explicit persistence ownership — domains never bypass another domain’s boundary.',
        fa: 'قابلیت‌های کسب‌وکاری مستقل با مالکیت صریح داده — هیچ دامنه‌ای از مرز دیگری عبور نمی‌کند.',
      },
    },
    {
      id: 'INTELLIGENCE',
      title: { en: 'Intelligence', fa: 'هوش' },
      body: {
        en: 'AI, analytics, recommendations, automation and risk — governed through approved contracts and data products.',
        fa: 'هوش مصنوعی، تحلیل، پیشنهادگر، اتوماسیون و ریسک — حاکمیت‌شده از طریق قراردادها و داده‌محصولات تأییدشده.',
      },
    },
    {
      id: 'EXPERIENCE',
      title: { en: 'Experience', fa: 'تجربه' },
      body: {
        en: 'Web, mobile, administration and 17 role-specific applications — including the Amazon-grade bilingual storefront.',
        fa: 'وب، موبایل، مدیریت و ۱۷ اپلیکیشن نقش‌محور — از جمله فروشگاه دوزبانهٔ هم‌تراز آمازون.',
      },
    },
  ]),

  securityFlow: Object.freeze([
    { en: 'Authentication', fa: 'احراز هویت' },
    { en: 'Identity', fa: 'هویت' },
    { en: 'Tenant Context', fa: 'زمینهٔ مستأجر' },
    { en: 'Membership', fa: 'عضویت' },
    { en: 'RBAC / Permission', fa: 'دسترسی نقش‌محور' },
    { en: 'Policy', fa: 'سیاست' },
    { en: 'Resource State', fa: 'وضعیت منبع' },
  ]),

  roles: Object.freeze({
    title: { en: 'One ecosystem — 17 role experiences', fa: 'یک اکوسیستم — ۱۷ تجربهٔ نقش‌محور' },
    subtitle: {
      en: 'Every role gets a dedicated workspace on its canonical subdomain, sharing one identity, one trust foundation and one API spine.',
      fa: 'هر نقش، فضای کاری اختصاصی روی زیردامنهٔ رسمی خود دارد — با یک هویت، یک بنیان اعتماد و یک ستون API مشترک.',
    },
    items: Object.freeze([
      { slug: 'executive', name: { en: 'Executive', fa: 'مدیریت ارشد' } },
      { slug: 'admin', name: { en: 'Administration', fa: 'مدیریت سامانه' } },
      { slug: 'sell', name: { en: 'Sellers', fa: 'فروشندگان' } },
      { slug: 'buyer', name: { en: 'Buyers', fa: 'خریداران' } },
      { slug: 'affiliate', name: { en: 'Affiliate', fa: 'بازاریابی زیرمجموعه‌ای' } },
      { slug: 'finance', name: { en: 'Finance', fa: 'مالی' } },
      { slug: 'inventory', name: { en: 'Inventory', fa: 'انبار' } },
      { slug: 'logistics', name: { en: 'Logistics', fa: 'لجستیک' } },
      { slug: 'marketing', name: { en: 'Marketing', fa: 'بازاریابی' } },
      { slug: 'ads', name: { en: 'Advertising', fa: 'تبلیغات' } },
      { slug: 'seo', name: { en: 'SEO', fa: 'سئو' } },
      { slug: 'supplier', name: { en: 'Suppliers', fa: 'تأمین‌کنندگان' } },
      { slug: 'factory', name: { en: 'Factories', fa: 'کارخانه‌ها' } },
      { slug: 'services', name: { en: 'Services', fa: 'خدمات' } },
      { slug: 'trust', name: { en: 'Trust & Verification', fa: 'اعتماد و احراز' } },
      { slug: 'support', name: { en: 'Support', fa: 'پشتیبانی' } },
      { slug: 'api', name: { en: 'API Spine', fa: 'ستون فقرات API' } },
    ]),
  }),

  trust: {
    title: { en: 'Trust is the foundation, not a feature', fa: 'اعتماد بنیان است، نه یک ویژگی' },
    body: {
      en: 'AFAX-CORE governs identity and trust primitives for the whole ecosystem: tenant isolation, audited actions, explicit consent and fail-closed security. Experience layers never touch databases directly and never create authentication silos.',
      fa: 'AFX-CORE هویت و سازوکارهای اعتماد کل اکوسیستم را حاکم می‌کند: جداسازی مستأجران، کنش‌های حسابرسی‌شده، رضایت صریح و امنیت بسته‌شوندگی در خطا. لایه‌های تجربه هرگز مستقیم به پایگاه داده وصل نمی‌شوند و جزیرهٔ احراز هویت نمی‌سازند.',
    },
    points: [
      { en: 'Canonical security flow on every request', fa: 'جریان امنیتی کانونی در هر درخواست' },
      { en: 'Audit and consent as first-class primitives', fa: 'حسابرسی و رضایت به‌عنوان سازوکار درجه‌یک' },
      { en: 'Versioned contracts — no silent breaking changes', fa: 'قراردادهای نسخه‌دار — بدون تغییر شکستنِ بی‌صدا' },
      { en: 'Architecture decisions recorded as ADRs', fa: 'تصمیمات معماری به‌صورت ADR ثبت می‌شوند' },
    ] as LocalizedText[],
  },

  partners: {
    title: { en: 'Build on the API spine', fa: 'روی ستون فقرات API بسازید' },
    body: {
      en: 'api.afaghx.com is the canonical enforcement boundary. Partners integrate through versioned contracts and events — with governed data products from INTELLIGENCE.',
      fa: 'api.afaghx.com مرز رسمی اعمال قانون است. همکاران از طریق قراردادها و رخدادهای نسخه‌دار یکپارچه می‌شوند — با داده‌محصولات حاکمیت‌شدهٔ لایهٔ هوش.',
    },
    cta: { en: 'Partner with AFAGHX', fa: 'همکاری با افاخس' },
  },
})

/* ── Contract route pages ──────────────────────────────────────── */

export const SITE_PAGES: Record<SiteSlug, SitePage> = Object.freeze({
  suppliers: {
    slug: 'suppliers',
    navLabel: { en: 'Suppliers', fa: 'تأمین‌کنندگان' },
    host: 'supplier.afaghx.com',
    title: {
      en: 'The Verified Supplier Network',
      fa: 'شبکهٔ تأمین‌کنندگان احرازشده',
    },
    subtitle: {
      en: 'Connect to audited suppliers across 35+ product baskets — with RFQ, matching and procurement built on the platform trust foundation.',
      fa: 'به تأمین‌کنندگان ممیزی‌شده در بیش از ۳۵ سبد کالایی وصل شوید — با استعلام، تطبیق هوشمند و تدارک بر بنیان اعتماد پلتفرم.',
    },
    blocks: [
      {
        title: { en: 'Verification before visibility', fa: 'اول احراز، بعد دیده‌شدن' },
        body: {
          en: 'Suppliers enter the network only after verification through the Trust & Verification experience. Their identity, organization and membership live in AFX-CORE — one account across every role workspace.',
          fa: 'تأمین‌کنندگان فقط پس از احراز از طریق تجربهٔ «اعتماد و احراز» وارد شبکه می‌شوند. هویت، سازمان و عضویت آن‌ها در AFX-CORE است — یک حساب برای همهٔ فضاهای کاری.',
        },
      },
      {
        title: { en: 'Requests find the right supplier', fa: 'درخواست‌ها تأمین‌کنندهٔ درست را می‌یابند' },
        body: {
          en: 'Purchase requests are matched by the INTELLIGENCE layer against capacity, category and history — suppliers see qualified opportunities, buyers see qualified offers.',
          fa: 'درخواست‌های خرید توسط لایهٔ هوش با ظرفیت، دسته‌بندی و سابقه تطبیق داده می‌شوند — تأمین‌کننده فرصت واجد شرایط می‌بیند، خریدار پیشنهاد واجد شرایط.',
        },
      },
      {
        title: { en: 'From RFQ to contract', fa: 'از استعلام تا قرارداد' },
        body: {
          en: 'Quotes, negotiation and order state flow through versioned event contracts — finance, logistics and inventory experiences stay in sync automatically.',
          fa: 'پیش‌فاکتور، مذاکره و وضعیت سفارش با قراردادهای رخدادی نسخه‌دار جریان می‌یابد — تجربه‌های مالی، لجستیک و انبار خودبه‌خود هم‌گام می‌مانند.',
        },
      },
    ],
    capabilities: [
      { en: 'Verified supplier profiles with audit trail', fa: 'پروفایل احرازشدهٔ تأمین‌کننده با ردپای حسابرسی' },
      { en: 'Category-scoped RFQ with smart matching', fa: 'استعلام دامنه‌محور با تطبیق هوشمند' },
      { en: 'Basket-based procurement across 35+ baskets', fa: 'تدارک سبدی در بیش از ۳۵ سبد کالایی' },
      { en: 'Event-driven order lifecycle', fa: 'چرخهٔ سفارش رخدادمحور' },
      { en: 'Bilingual catalogs (FA/EN) with dual pricing', fa: 'کاتالوگ دوزبانه با قیمت‌گذاری دوگانه (تومان/دلار)' },
      { en: 'One identity across all 17 role workspaces', fa: 'یک هویت در هر ۱۷ فضای کاری نقش‌محور' },
    ],
    stats: [
      { value: 35, label: { en: 'Product baskets', fa: 'سبد کالایی' } },
      { value: 17, label: { en: 'Role experiences', fa: 'تجربهٔ نقش‌محور' } },
      { value: 5, label: { en: 'Governed layers', fa: 'لایهٔ حاکمیت‌شده' } },
    ],
    cta: { en: 'Join as a supplier', fa: 'به‌عنوان تأمین‌کننده بپیوندید' },
  },

  factories: {
    slug: 'factories',
    navLabel: { en: 'Factories', fa: 'کارخانه‌ها' },
    host: 'factory.afaghx.com',
    title: {
      en: 'Manufacturing Capacity, Digitally Listed',
      fa: 'ظرفیت تولید، به‌صورت دیجیتال ثبت‌شده',
    },
    subtitle: {
      en: 'Factories publish real capacity, take contract-manufacturing orders and reach buyers directly — no middle layer between production and demand.',
      fa: 'کارخانه‌ها ظرفیت واقعی خود را منتشر می‌کنند، سفارش ساخت می‌پذیرند و مستقیم به خریدار می‌رسند — بدون لایهٔ واسطه میان تولید و تقاضا.',
    },
    blocks: [
      {
        title: { en: 'Capacity as a first-class object', fa: 'ظرفیت به‌عنوان موجودیت درجه‌یک' },
        body: {
          en: 'Lines, materials, certifications and lead times are structured domain data — searchable through the PLATFORM search service, not buried in PDFs.',
          fa: 'خطوط، مواد، گواهی‌ها و زمان تحویل، دادهٔ ساختاریافتهٔ دامنه‌اند — قابل جست‌وجو از سرویس جست‌وجوی پلتفرم، نه گم‌شده در فایل‌های PDF.',
        },
      },
      {
        title: { en: 'Contract manufacturing, governed', fa: 'ساخت قراردادی، حاکمیت‌شده' },
        body: {
          en: 'From specification to delivery, each step is an event on versioned contracts — quality checks, logistics handoffs and payments stay auditable.',
          fa: 'از مشخصات تا تحویل، هر گام یک رخداد روی قراردادهای نسخه‌دار است — کنترل کیفیت، تحویل لجستیک و پرداخت‌ها همیشه قابل حسابرسی‌اند.',
        },
      },
      {
        title: { en: 'Raw materials to finished goods', fa: 'از مواد اولیه تا کالای نهایی' },
        body: {
          en: 'Factories source raw materials, textiles, chemicals and components inside the same ecosystem they sell into — supply and demand meet in one governed network.',
          fa: 'کارخانه‌ها مواد اولیه، منسوجات، مواد شیمیایی و قطعات را در همان اکوسیستمی تأمین می‌کنند که در آن می‌فروشند — عرضه و تقاضا در یک شبکهٔ حاکمیت‌شده به هم می‌رسند.',
        },
      },
    ],
    capabilities: [
      { en: 'Structured capacity and certification profiles', fa: 'پروفایل ساختاریافتهٔ ظرفیت و گواهی‌ها' },
      { en: 'Contract-manufacturing order lifecycle', fa: 'چرخهٔ سفارش ساخت قراردادی' },
      { en: 'Machinery & equipment basket', fa: 'سبد ماشین‌آلات و تجهیزات' },
      { en: 'Raw materials sourcing network', fa: 'شبکهٔ تأمین مواد اولیه' },
      { en: 'Logistics handoff events', fa: 'رخدادهای تحویل به لجستیک' },
      { en: 'Executive dashboards for output', fa: 'داشبورد مدیریتی برای خروجی تولید' },
    ],
    stats: [
      { value: 34, label: { en: 'Industrial baskets', fa: 'سبد صنعتی' } },
      { value: 17, label: { en: 'Role experiences', fa: 'تجربهٔ نقش‌محور' } },
      { value: 100, label: { en: 'Percent auditable flow', fa: 'درصد جریان قابل حسابرسی' } },
    ],
    cta: { en: 'Register your factory', fa: 'کارخانهٔ خود را ثبت کنید' },
  },

  services: {
    slug: 'services',
    navLabel: { en: 'Services', fa: 'خدمات' },
    host: 'services.afaghx.com',
    title: {
      en: 'The Services Marketplace',
      fa: 'بازار خدمات',
    },
    subtitle: {
      en: 'Professional services — engineering, design, certification, trade — offered and procured on the canonical services host of the ecosystem.',
      fa: 'خدمات حرفه‌ای — مهندسی، طراحی، صدور گواهی، تجارت — روی میزبان رسمی خدمات اکوسیستم عرضه و تدارک دیده می‌شود.',
    },
    blocks: [
      {
        title: { en: 'One canonical host', fa: 'یک میزبان کانونی' },
        body: {
          en: 'services.afaghx.com is the registry-enforced entrypoint for the services experience — one address, one contract, no shadow variants.',
          fa: 'services.afaghx.com نقطهٔ ورودِ تحمیل‌شده توسط رجیستری برای تجربهٔ خدمات است — یک نشانی، یک قرارداد، بدون نسخه‌های موازی.',
        },
      },
      {
        title: { en: 'Service catalogues that mean something', fa: 'کاتالوگ خدماتی که معنا دارد' },
        body: {
          en: 'Scope, deliverables and acceptance criteria are structured fields — so matching, contracts and payments work without human guesswork.',
          fa: 'دامنهٔ کار، خروجی‌ها و معیار پذیرش فیلدهای ساختاریافته‌اند — پس تطبیق، قرارداد و پرداخت بدون حدس زدن انسانی کار می‌کند.',
        },
      },
      {
        title: { en: 'Trusted counterparties', fa: 'طرف‌های معتمد' },
        body: {
          en: 'Providers and clients authenticate through the same CORE identity spine; every agreement inherits tenant isolation and audit.',
          fa: 'ارائه‌دهندگان و کارفرمایان از همان ستون هویتی CORE احراز می‌شوند؛ هر توافقی جداسازی مستأجر و حسابرسی را به ارث می‌برد.',
        },
      },
    ],
    capabilities: [
      { en: 'Structured service listings', fa: 'آگهی‌های خدماتی ساختاریافته' },
      { en: 'Milestone-based engagement flow', fa: 'جریان همکاری مبتنی بر نقاط عطف' },
      { en: 'Acceptance criteria as data', fa: 'معیار پذیرش به‌عنوان داده' },
      { en: 'Escrow-ready payment events', fa: 'رخدادهای پرداخت آمادهٔ امانی' },
      { en: 'Reviews bound to verified transactions', fa: 'نظرات متصل به تراکنش‌های احرازشده' },
      { en: 'Bilingual service discovery', fa: 'کشف خدمات دوزبانه' },
    ],
    stats: [
      { value: 1, label: { en: 'Canonical host', fa: 'میزبان کانونی' } },
      { value: 17, label: { en: 'Role experiences', fa: 'تجربهٔ نقش‌محور' } },
      { value: 2, label: { en: 'Languages, zero gaps', fa: 'زبان، بدون شکاف' } },
    ],
    cta: { en: 'Offer a service', fa: 'خدمات خود را ارائه دهید' },
  },

  markets: {
    slug: 'markets',
    navLabel: { en: 'Markets', fa: 'بازارها' },
    host: 'www.afaghx.com',
    title: {
      en: 'Baskets, Prices and Global Trade',
      fa: 'سبدها، قیمت‌ها و تجارت جهانی',
    },
    subtitle: {
      en: 'From daily deals to global trade corridors — the marketplace layer turns product baskets into living markets with dual-currency pricing.',
      fa: 'از پیشنهادهای ویژهٔ روزانه تا کریدورهای تجارت جهانی — لایهٔ بازار، سبد کالایی را به بازارهای زنده با قیمت‌گذاری دو ارزی تبدیل می‌کند.',
    },
    blocks: [
      {
        title: { en: 'Baskets as market units', fa: 'سبد به‌عنوان واحد بازار' },
        body: {
          en: 'Thirty-five curated baskets — from beauty to minerals — give every industry a native shelf, with taxonomy enforced by platform tests.',
          fa: '۳۵ سبد گزینش‌شده — از زیبایی تا مواد معدنی — به هر صنعت قفسهٔ بومی می‌دهد؛ با تاکسونومی‌ای که با تست‌های پلتفرم تضمین می‌شود.',
        },
      },
      {
        title: { en: 'Dual-currency by design', fa: 'دو ارزی از پایه' },
        body: {
          en: 'Prices are stored as Money — USD and Toman — and formatted per locale with Persian digits. No conversion hacks in the UI layer.',
          fa: 'قیمت‌ها به‌صورت Money — دلار و تومان — ذخیره و برای هر زبان با اعداد فارسی قالب‌بندی می‌شوند. بدون ترفند تبدیل در لایهٔ UI.',
        },
      },
      {
        title: { en: 'Global trade, local trust', fa: 'تجارت جهانی، اعتماد محلی' },
        body: {
          en: 'Cross-border flows ride the same event spine as domestic orders — customs documents, logistics and finance are all governed participants.',
          fa: 'جریان‌های فرامرزی از همان ستون رخدادی سفارش‌های داخلی می‌گذرند — اسناد گمرکی، لجستیک و مالی همگی بازیگران حاکمیت‌شده‌اند.',
        },
      },
    ],
    capabilities: [
      { en: '35+ curated product baskets', fa: 'بیش از ۳۵ سبد کالایی گزینش‌شده' },
      { en: 'Deals engine with real discount math', fa: 'موتور تخفیف با محاسبهٔ واقعی' },
      { en: 'Toman + USD dual pricing', fa: 'قیمت‌گذاری دوگانه تومان + دلار' },
      { en: 'Search with category scoping', fa: 'جست‌وجو با دامنهٔ دسته‌بندی' },
      { en: 'Bilingual product content', fa: 'محتوای دوزبانهٔ محصول' },
      { en: 'Event-driven cart and checkout', fa: 'سبد و پرداخت رخدادمحور' },
    ],
    stats: [
      { value: 35, label: { en: 'Product baskets', fa: 'سبد کالایی' } },
      { value: 2, label: { en: 'Currencies, native', fa: 'ارز، بومی' } },
      { value: 25, label: { en: 'Products live in storefront', fa: 'محصول فعال در فروشگاه' } },
    ],
    cta: { en: 'Browse the market', fa: 'گشت در بازار' },
  },

  'business-network': {
    slug: 'business-network',
    navLabel: { en: 'Business Network', fa: 'شبکهٔ کسب‌وکار' },
    host: 'www.afaghx.com',
    title: {
      en: 'Business Communication, Governed',
      fa: 'ارتباطات کسب‌وکار، حاکمیت‌شده',
    },
    subtitle: {
      en: 'Organizations, memberships and conversations on one identity spine — where business relationships form with policy and audit built in.',
      fa: 'سازمان‌ها، عضویت‌ها و گفت‌وگوها روی یک ستون هویتی — جایی که روابط کسب‌وکاری با سیاست و حسابرسیِ درون‌ساخت شکل می‌گیرد.',
    },
    blocks: [
      {
        title: { en: 'Organizations are real entities', fa: 'سازمان موجودیت واقعی است' },
        body: {
          en: 'Companies exist as governed organizations with members, roles and tenant context — not as free-text profile pages.',
          fa: 'شرکت‌ها به‌عنوان سازمان‌های حاکمیت‌شده با اعضا، نقش‌ها و زمینهٔ مستأجر وجود دارند — نه صفحات متنی آزاد.',
        },
      },
      {
        title: { en: 'Conversations with boundaries', fa: 'گفت‌وگو با مرز' },
        body: {
          en: 'Every message flows between authenticated members under policy — spam, impersonation and data leakage lose structurally.',
          fa: 'هر پیام میان اعضای احرازشده و زیر سیاست جریان می‌یابد — هرزنامه، جعل هویت و نشت داده ساختارمحور شکست می‌خورند.',
        },
      },
      {
        title: { en: 'Relationships that compound', fa: 'روابطی که انباشته می‌شوند' },
        body: {
          en: 'Verified history — orders, contracts, fulfillment — turns into network reputation. Trust becomes data, not marketing.',
          fa: 'سابقهٔ احرازشده — سفارش‌ها، قراردادها، اجرا — به اعتبار شبکه‌ای تبدیل می‌شود. اعتماد داده است، نه شعار بازاریابی.',
        },
      },
    ],
    capabilities: [
      { en: 'Organization & membership model', fa: 'مدل سازمان و عضویت' },
      { en: 'Policy-bound messaging', fa: 'پیام‌رسانی مقید به سیاست' },
      { en: 'Verified transaction history', fa: 'سابقهٔ تراکنش احرازشده' },
      { en: 'Tenant-isolated workspaces', fa: 'فضاهای کاری جداسازی‌شده' },
      { en: 'Event-driven notifications', fa: 'اعلان‌های رخدادمحور' },
      { en: 'Directory across 17 roles', fa: 'دایرکتوری در ۱۷ نقش' },
    ],
    stats: [
      { value: 17, label: { en: 'Connected roles', fa: 'نقش متصل' } },
      { value: 1, label: { en: 'Identity spine', fa: 'ستون هویتی' } },
      { value: 0, label: { en: 'Auth silos allowed', fa: 'جزیرهٔ احراز هویت مجاز' } },
    ],
    cta: { en: 'Build your network', fa: 'شبکهٔ خود را بسازید' },
  },

  intelligence: {
    slug: 'intelligence',
    navLabel: { en: 'Intelligence', fa: 'هوش' },
    host: 'www.afaghx.com',
    title: {
      en: 'Governed Intelligence for Real Commerce',
      fa: 'هوش حاکمیت‌شده برای تجارت واقعی',
    },
    subtitle: {
      en: 'AI, analytics, recommendations, automation and risk — produced inside governed contracts, never as a black box bolted to the side.',
      fa: 'هوش مصنوعی، تحلیل، پیشنهادگر، اتوماسیون و ریسک — تولیدشده درون قراردادهای حاکم، نه جعبهٔ سیاهی چسبیده به پهلو.',
    },
    blocks: [
      {
        title: { en: 'Matching that moves markets', fa: 'تطبیقی که بازار را می‌حرکتاند' },
        body: {
          en: 'Buyer requests, factory capacity and supplier catalogs meet in governed matching flows — procurement cycles shrink from weeks to hours.',
          fa: 'درخواست خرید، ظرفیت کارخانه و کاتالوگ تأمین‌کننده در جریان‌های تطبیق حاکم به هم می‌رسند — چرخهٔ تدارک از هفته‌ها به ساعت کوتاه می‌شود.',
        },
      },
      {
        title: { en: 'Data products, not data dumps', fa: 'داده‌محصول، نه انبوه داده' },
        body: {
          en: 'INTELLIGENCE consumes approved contracts and events, and publishes governed data products — analytics other layers can trust and build on.',
          fa: 'لایهٔ هوش از قراردادها و رخدادهای تأییدشده تغذیه می‌کند و داده‌محصولات حاکم منتشر می‌سازد — تحلیل‌هایی که لایه‌های دیگر به آن اعتماد و بر آن می‌سازند.',
        },
      },
      {
        title: { en: 'Automation with accountability', fa: 'اتوماسیون با پاسخ‌گویی' },
        body: {
          en: 'Risk scoring, recommendations and automation actions are audited through CORE — every automated decision has an owner and a trail.',
          fa: 'امتیازدهی ریسک، پیشنهادها و کنش‌های اتوماسیون از CORE حسابرسی می‌شوند — هر تصمیم خودکار مالک و ردپا دارد.',
        },
      },
    ],
    capabilities: [
      { en: 'Buyer–supplier smart matching', fa: 'تطبیق هوشمند خریدار–تأمین‌کننده' },
      { en: 'Recommendations in the storefront', fa: 'پیشنهادها در فروشگاه' },
      { en: 'Governed data products', fa: 'داده‌محصولات حاکم' },
      { en: 'Risk & fraud signals', fa: 'سیگنال‌های ریسک و تقلب' },
      { en: 'Bilingual semantic search', fa: 'جست‌وجوی معنایی دوزبانه' },
      { en: 'Executive analytics dashboards', fa: 'داشبوردهای تحلیلی مدیریتی' },
    ],
    stats: [
      { value: 1, label: { en: 'Governed AI layer', fa: 'لایهٔ هوش حاکم' } },
      { value: 5, label: { en: 'Capability families', fa: 'خانوادهٔ قابلیت' } },
      { value: 100, label: { en: 'Percent auditable actions', fa: 'درصد کنش قابل حسابرسی' } },
    ],
    cta: { en: 'Explore intelligence', fa: 'کاوش در هوش' },
  },
})

export function isSiteSlug(value: string): value is SiteSlug {
  return Object.prototype.hasOwnProperty.call(SITE_PAGES, value)
}

export function sitePage(slug: SiteSlug): SitePage {
  return SITE_PAGES[slug]
}
