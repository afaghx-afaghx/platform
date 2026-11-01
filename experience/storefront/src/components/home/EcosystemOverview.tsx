import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Factory,
  Briefcase,
  Globe2,
  Network,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react'
import type { Locale } from '@/lib/types'

type Localized = { en: string; fa: string }

const CAPABILITIES = [
  {
    icon: Factory,
    href: '/factories',
    label: { en: 'INDUSTRY & PRODUCTION', fa: 'صنعت و تولید' },
    title: { en: 'Factories and manufacturers', fa: 'کارخانه‌ها و تولیدکنندگان' },
    body: {
      en: 'Discover manufacturing capabilities, industrial capacity and production partners.',
      fa: 'ظرفیت تولید، توان صنعتی و شرکای ساخت را کشف کنید.',
    },
    action: { en: 'Explore factories', fa: 'کشف کارخانه‌ها' },
  },
  {
    icon: Users,
    href: '/suppliers',
    label: { en: 'SUPPLIER NETWORK', fa: 'شبکه تأمین' },
    title: { en: 'Suppliers and sourcing', fa: 'تأمین‌کنندگان و تأمین کالا' },
    body: {
      en: 'Find suppliers and prepare structured business sourcing requirements.',
      fa: 'تأمین‌کنندگان را پیدا کنید و نیازهای تأمین سازمانی را ساختاریافته تعریف کنید.',
    },
    action: { en: 'Find suppliers', fa: 'یافتن تأمین‌کنندگان' },
  },
  {
    icon: Briefcase,
    href: '/services',
    label: { en: 'BUSINESS SERVICES', fa: 'خدمات کسب‌وکار' },
    title: { en: 'Service providers and business services', fa: 'ارائه‌دهندگان و خدمات کسب‌وکار' },
    body: {
      en: 'Discover professional services that support sourcing, operations and business growth.',
      fa: 'خدمات تخصصی موردنیاز تأمین، عملیات و رشد کسب‌وکار را کشف کنید.',
    },
    action: { en: 'Explore services', fa: 'کشف خدمات' },
  },
  {
    icon: PackageSearch,
    href: '/business-network',
    label: { en: 'B2B COMMERCE', fa: 'تجارت سازمانی' },
    title: { en: 'Procurement and business trade', fa: 'تدارکات و تجارت شرکتی' },
    body: {
      en: 'Connect business demand with sourcing, quotation and partner discovery journeys.',
      fa: 'تقاضای سازمانی را به مسیرهای تأمین، استعلام قیمت و کشف شریک تجاری متصل کنید.',
    },
    action: { en: 'Explore business network', fa: 'کاوش شبکه کسب‌وکار' },
  },
  {
    icon: ShoppingBag,
    href: '/products',
    label: { en: 'B2C COMMERCE', fa: 'تجارت مصرف‌کننده' },
    title: { en: 'Products and personal shopping', fa: 'کالاها و خرید شخصی' },
    body: {
      en: 'Browse product categories and explore the consumer storefront experience.',
      fa: 'دسته‌بندی کالاها را مرور کنید و تجربه فروشگاه مصرف‌کنندگان را ببینید.',
    },
    action: { en: 'Browse products', fa: 'مشاهده کالاها' },
  },
  {
    icon: Globe2,
    href: '/markets',
    label: { en: 'GLOBAL TRADE', fa: 'تجارت بین‌الملل' },
    title: { en: 'Markets and trade routes', fa: 'بازارها و مسیرهای تجاری' },
    body: {
      en: 'Explore market destinations and the context needed for cross-border trade.',
      fa: 'بازارهای هدف و اطلاعات موردنیاز برای تجارت فرامرزی را بررسی کنید.',
    },
    action: { en: 'Explore markets', fa: 'کاوش بازارها' },
  },
  {
    icon: Sparkles,
    href: '/intelligence',
    label: { en: 'INTELLIGENCE', fa: 'لایه هوشمندی' },
    title: { en: 'Data, insight and intelligence', fa: 'داده، بینش و هوشمندی' },
    body: {
      en: 'Discover the platform vision for matching, recommendations, analytics and automation.',
      fa: 'با چشم‌انداز پلتفرم برای تطبیق، پیشنهاددهی، تحلیل و خودکارسازی آشنا شوید.',
    },
    action: { en: 'Explore intelligence', fa: 'کاوش لایه هوشمندی' },
  },
] as const

const LAYERS: Array<{ id: string; title: Localized; body: Localized }> = [
  {
    id: 'CORE',
    title: { en: 'Governance foundation', fa: 'بنیان حاکمیت' },
    body: { en: 'Identity, organization, access and audit primitives.', fa: 'سازوکارهای هویت، سازمان، دسترسی و ممیزی.' },
  },
  {
    id: 'PLATFORM',
    title: { en: 'Shared capabilities', fa: 'قابلیت‌های مشترک' },
    body: { en: 'API, events, search, workflow and notifications.', fa: 'API، رخدادها، جست‌وجو، گردش‌کار و اعلان‌ها.' },
  },
  {
    id: 'DOMAINS',
    title: { en: 'Business capabilities', fa: 'قابلیت‌های کسب‌وکار' },
    body: { en: 'Commerce, industry, services and procurement.', fa: 'تجارت، صنعت، خدمات و تدارکات.' },
  },
  {
    id: 'INTELLIGENCE',
    title: { en: 'Decision support', fa: 'پشتیبانی تصمیم' },
    body: { en: 'Matching, insight, analytics and automation.', fa: 'تطبیق، بینش، تحلیل و خودکارسازی.' },
  },
  {
    id: 'EXPERIENCE',
    title: { en: 'Role experiences', fa: 'تجربه‌های نقش‌محور' },
    body: { en: 'Web, mobile and dedicated workspaces.', fa: 'وب، موبایل و فضاهای کاری اختصاصی.' },
  },
]

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: { en: 'Trust by design', fa: 'اعتماد در طراحی' },
    body: { en: 'Identity, permissions and audit belong to governed platform boundaries.', fa: 'هویت، مجوزها و ممیزی باید در مرزهای حاکمیت‌شده پلتفرم قرار بگیرند.' },
  },
  {
    icon: Network,
    title: { en: 'One connected network', fa: 'یک شبکه یکپارچه' },
    body: { en: 'Distinct roles and business journeys share common platform contracts.', fa: 'نقش‌ها و مسیرهای تجاری مجزا از قراردادهای مشترک پلتفرم استفاده می‌کنند.' },
  },
  {
    icon: Workflow,
    title: { en: 'Traceable business flows', fa: 'جریان‌های تجاری قابل ردیابی' },
    body: { en: 'Business actions should be explicit, attributable and auditable.', fa: 'کنش‌های کسب‌وکار باید شفاف، منتسب به عامل و قابل ممیزی باشند.' },
  },
]

export function EcosystemOverview({ locale }: { locale: Locale }) {
  const fa = locale === 'fa'
  const Arrow = fa ? ArrowLeft : ArrowRight

  return (
    <>
      <section id="network" className="scroll-mt-28 space-y-5" aria-labelledby="ecosystem-title">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-7 p-5 sm:p-8 lg:grid-cols-[0.82fr_1.18fr] lg:p-10">
            <div className="flex flex-col items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-teal-900">
                <Boxes size={14} aria-hidden="true" />
                AFA GLOBAL HORIZON X
              </span>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-afx-link">
                {fa ? 'اکوسیستم دیجیتال تجارت و صنعت' : 'DIGITAL BUSINESS & INDUSTRY ECOSYSTEM'}
              </p>
              <h2 id="ecosystem-title" className="mt-2 text-2xl font-black leading-[1.35] text-afx-price sm:text-3xl">
                {fa
                  ? 'AFAGHX فقط بازار کالا نیست؛ شبکه‌ای برای صنعت، تجارت و خدمات است.'
                  : 'AFAGHX is more than a product marketplace — it connects industry, commerce and services.'}
              </h2>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                {fa
                  ? 'تولیدکنندگان، کارخانه‌ها، تأمین‌کنندگان، خریداران سازمانی و مصرف‌کنندگان، ارائه‌دهندگان خدمات و شرکای تجاری در یک تجربه منسجم به هم متصل می‌شوند. بازار کالا یکی از قابلیت‌های این اکوسیستم است، نه هویت کامل آن.'
                  : 'Manufacturers, factories, suppliers, business buyers, consumers, service providers and commercial partners are brought into one coherent experience. Product commerce is one capability of the ecosystem, not its entire identity.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/business-network" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-afx-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-afx-navy-hover">
                  {fa ? 'معرفی شبکه کسب‌وکار' : 'Explore the business network'}
                  <Arrow size={15} aria-hidden="true" />
                </Link>
                <Link href="/factories" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-afx-price transition hover:bg-slate-50">
                  {fa ? 'کشف ظرفیت تولید' : 'Discover production'}
                </Link>
              </div>
            </div>

            <div id="ecosystem-capabilities" className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
              {CAPABILITIES.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group last:col-span-2 flex min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:rounded-2xl sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-800 shadow-sm ring-1 ring-slate-200">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="text-[9px] font-black tracking-[0.14em] text-slate-500">{item.label[locale]}</span>
                    </div>
                    <h3 className="mt-3 text-xs font-black leading-5 text-afx-price sm:text-sm sm:leading-6">{item.title[locale]}</h3>
                    <p className="mt-1 flex-1 text-[10px] leading-5 text-muted-foreground sm:text-xs sm:leading-6">{item.body[locale]}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-afx-link group-hover:underline">
                      {item.action[locale]}
                      <Arrow size={13} aria-hidden="true" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="scroll-mt-28 space-y-5" aria-labelledby="architecture-title">
        <div className="rounded-[28px] bg-[#102536] p-5 text-white shadow-lg sm:p-8 lg:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-200">
              {fa ? 'معماری حاکمیت‌شده پلتفرم' : 'GOVERNED PLATFORM ARCHITECTURE'}
            </p>
            <h2 id="architecture-title" className="mt-2 text-2xl font-black sm:text-3xl">
              {fa ? 'یک ستون فقرات مشترک؛ تجربه‌های تخصصی و مستقل' : 'One shared platform spine. Distinct specialist experiences.'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/70">
              {fa
                ? 'لایه‌های معماری، مسئولیت‌ها را از هم جدا می‌کنند و از ایجاد سامانه‌های جزیره‌ای جلوگیری می‌کنند.'
                : 'The architecture separates responsibilities and is designed to prevent isolated, disconnected applications.'}
            </p>
          </div>

          <div id="ecosystem-layers" className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-5">
            {LAYERS.map((layer, index) => (
              <article key={layer.id} className="last:col-span-2 rounded-xl border border-white/15 bg-white/[0.07] p-3 sm:rounded-2xl sm:p-4 xl:last:col-span-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black tracking-[0.14em] text-teal-200">{layer.id}</span>
                  <span className="font-mono text-[10px] text-white/35">0{index + 1}</span>
                </div>
                <h3 className="mt-2 text-xs font-black leading-5 sm:mt-3 sm:text-sm">{layer.title[locale]}</h3>
                <p className="mt-1 text-[10px] leading-5 text-white/65 sm:mt-2 sm:text-xs sm:leading-6">{layer.body[locale]}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-amber-200/20 bg-amber-100/10 px-4 py-3 text-xs leading-6 text-amber-100/90">
            {fa
              ? 'شفافیت وضعیت: این بخش مدل معماری هدف AFAGHX را توضیح می‌دهد؛ نمایش آن به معنی فعال‌بودن یا تکمیل همه سرویس‌ها نیست.'
              : 'Status transparency: this section describes the AFAGHX target architecture. Its presence does not mean every service is live or complete.'}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="principles-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-afx-link">
              {fa ? 'اصول طراحی پلتفرم' : 'PLATFORM DESIGN PRINCIPLES'}
            </p>
            <h2 id="principles-title" className="mt-2 text-xl font-black text-afx-price sm:text-2xl">
              {fa ? 'اعتماد، اتصال و پاسخ‌گویی از ابتدا' : 'Trust, connection and accountability by design'}
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">
            {fa ? 'اصول معماری؛ نه ادعای وضعیت عملیاتی' : 'Architecture principles — not live-status claims'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
          {PRINCIPLES.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title.en} className="rounded-xl bg-slate-50 p-3 sm:rounded-2xl sm:p-5">
                <Icon size={22} className="text-teal-800" aria-hidden="true" />
                <h3 className="mt-2 text-xs font-black text-afx-price sm:mt-3 sm:text-sm">{item.title[locale]}</h3>
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:mt-2 sm:text-xs sm:leading-6">{item.body[locale]}</p>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
