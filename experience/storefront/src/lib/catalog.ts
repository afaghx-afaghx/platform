import type { CategoryId, Product } from './types'

/**
 * AFAGHX storefront catalog — 25 bilingual products across 8 categories.
 * Prices: USD + Iranian Toman (demo rates). Images served from /public/images/products.
 * A tiny SVG data-URI fallback keeps the grid beautiful if an image is missing.
 */

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f0f2f2"/><text x="50%" y="52%" font-family="sans-serif" font-size="120" fill="#c8cdcd" text-anchor="middle">AFX</text></svg>`
  )

const img = (id: string) => `/images/products/${id}.jpg`

type Seed = Omit<Product, 'image'> & { imageId: string }

const SEEDS: Seed[] = [
  // ─── Electronics ──────────────────────────────────────────────
  {
    id: 'afx-echo-anc',
    category: 'electronics',
    brand: 'Aurio',
    title: { en: 'Aurio EchoPod ANC Wireless Over-Ear Headphones', fa: 'هدفون بی‌سیم روگوشی اوریو اکوپاد با نویزکنسلینگ فعال' },
    description: {
      en: 'Immersive sound with adaptive noise cancellation, 40-hour battery, multipoint Bluetooth 5.3 and a featherlight aluminum frame.',
      fa: 'صدای فراگیر با نویزکنسلینگ تطبیقی، باتری ۴۰ ساعته، بلوتوث ۵.۳ چندنقطه‌ای و فریم آلومینیومی سبک.',
    },
    features: {
      en: [
        'Adaptive ANC silences engines, chatter and city noise',
        '40-hour playback; 5-minute charge yields 4 hours',
        'Bluetooth 5.3 multipoint — phone and laptop at once',
        'Memory-foam earcups rotate flat for travel',
      ],
      fa: [
        'نویزکنسلینگ تطبیقی صدای موتور، گفتگو و شهر را حذف می‌کند',
        'پخش ۴۰ ساعته؛ شارژ ۵ دقیقه‌ای معادل ۴ ساعت پخش',
        'بلوتوث ۵.۳ چندنقطه‌ای — اتصال هم‌زمان گوشی و لپ‌تاپ',
        'ایرکاپ مموری‌فوم با چرخش تخت برای سفر',
      ],
    },
    price: { usd: 199, toman: 12900000 },
    listPrice: { usd: 279, toman: 18100000 },
    rating: 4.7,
    reviewCount: 24318,
    badge: 'best-seller',
    isPrime: true,
    stock: 42,
    imageId: 'headphones',
  },
  {
    id: 'afx-vision-55',
    category: 'electronics',
    brand: 'Vantix',
    title: { en: 'Vantix Vision 55" 4K QLED Smart TV (2026)', fa: 'تلویزیون هوشمند ونتیکس ویژن ۵۵ اینچ ۴کی QLED (۲۰۲۶)' },
    description: {
      en: 'Quantum-dot 4K HDR10+ panel with 120Hz gaming mode, dual-band Wi-Fi and the AFAGHX TV OS in Persian and English.',
      fa: 'پنل کوانتومی ۴کی HDR10+ با حالت گیمینگ ۱۲۰ هرتز، وای‌فای دو‌باند و سیستم‌عامل افاغکس به فارسی و انگلیسی.',
    },
    features: {
      en: [
        'QLED 4K with full-array local dimming',
        '120Hz VRR — perfect for next-gen consoles',
        'Bilingual UI: Persian & English out of the box',
        'Dolby Atmos with 2×12W speakers',
      ],
      fa: [
        'پنل QLED چهارکی با نورپردازی موضعی تمام‌آرایه',
        '۱۲۰ هرتز با VRR — ایده‌آل برای کنسول‌های نسل جدید',
        'رابط دوزبانه: فارسی و انگلیسی از ابتدا',
        'دالبی اتموس با بلندگوهای دوگانه ۱۲ واتی',
      ],
    },
    price: { usd: 549, toman: 35900000 },
    listPrice: { usd: 699, toman: 45800000 },
    rating: 4.6,
    reviewCount: 8941,
    isPrime: true,
    stock: 15,
    imageId: 'tv',
  },
  {
    id: 'afx-nova-book',
    category: 'electronics',
    brand: 'Zenvo',
    title: { en: 'Zenvo NovaBook 14 Ultrabook — 16GB/1TB', fa: 'اولترابوک زن‌وو نوا بوک ۱۴ — حافظه ۱۶ گیگ / یک ترابایت' },
    description: {
      en: 'A 1.2kg magnesium ultrabook with a 3K 120Hz display, 18-hour battery and a studio-grade webcam for hybrid work.',
      fa: 'اولترابوک منیزیمی ۱.۲ کیلویی با نمایشگر ۳K ۱۲۰ هرتز، باتری ۱۸ ساعته و وبکم استودیویی برای کار ترکیبی.',
    },
    features: {
      en: [
        '3K 120Hz Calibrated display, 500 nits',
        '18-hour battery with 65W USB-C fast charge',
        '16GB LPDDR5 + 1TB NVMe SSD',
        'Fanless quiet design, 1.2kg',
      ],
      fa: [
        'نمایشگر کالیبره ۳K با نرخ ۱۲۰ هرتز و روشنایی ۵۰۰ نیت',
        'باتری ۱۸ ساعته با شارژ سریع ۶۵ واتی USB-C',
        '۱۶ گیگابایت LPDDR5 و یک ترابایت SSD NVMe',
        'طراحی بی‌صدا بدون فن، وزن ۱.۲ کیلوگرم',
      ],
    },
    price: { usd: 1199, toman: 78900000 },
    rating: 4.8,
    reviewCount: 5210,
    badge: 'choice',
    isPrime: true,
    stock: 8,
    imageId: 'laptop',
  },
  {
    id: 'afx-pulse-phone',
    category: 'electronics',
    brand: 'Zenvo',
    title: { en: 'Zenvo Pulse X5 Smartphone 256GB — Dual SIM', fa: 'گوشی هوشمند زن‌وو پالس X5 با ۲۵۶ گیگابایت — دو سیم‌کارت' },
    description: {
      en: 'Flagship 6.5" AMOLED 144Hz, triple 50MP camera system with night mode, and 80W charging that fills up in 32 minutes.',
      fa: 'پرچمدار ۶.۵ اینچ AMOLED با نرخ ۱۴۴ هرتز، دوربین سه‌گانه ۵۰ مگاپیکسل با حالت شب و شارژ ۸۰ واتی در ۳۲ دقیقه.',
    },
    features: {
      en: [
        '6.5" 144Hz AMOLED, 2000 nits peak',
        'Triple 50MP camera with 5x lossless zoom',
        '5000mAh — 32-minute full charge',
        '5 years of OS updates',
      ],
      fa: [
        'نمایشگر ۶.۵ اینچ AMOLED با نرخ ۱۴۴ هرتز و روشنایی ۲۰۰۰ نیت',
        'دوربین سه‌گانه ۵۰ مگاپیکسل با زوم بی‌افت ۵ برابر',
        'باتری ۵۰۰۰ میلی‌آمپری با شارژ کامل در ۳۲ دقیقه',
        'پنج سال به‌روزرسانی سیستم‌عامل',
      ],
    },
    price: { usd: 899, toman: 58900000 },
    listPrice: { usd: 999, toman: 65900000 },
    rating: 4.7,
    reviewCount: 17320,
    isPrime: true,
    stock: 26,
    imageId: 'phone',
  },

  // ─── Computers ────────────────────────────────────────────────
  {
    id: 'afx-type-75',
    category: 'computers',
    brand: 'Keyora',
    title: { en: 'Keyora Type-75 Mechanical Keyboard — Hot-Swap', fa: 'کیبورد مکانیکی کیورا تایپ-۷۵ — قابلیت تعویض سوئیچ' },
    description: {
      en: 'Gasket-mounted 75% keyboard with south-facing RGB, hot-swappable switches and dual USB-C/2.4GHz/wireless modes.',
      fa: 'کیبورد ۷۵٪ گسکت‌مانت با RGB رو به جنوب، سوئیچ‌های تعویضی و سه حالت اتصال USB-C و ۲.۴ گیگاهرتز و بی‌سیم.',
    },
    features: {
      en: [
        'Gasket mount with sound-dampening foam',
        'Hot-swap sockets — no soldering',
        'Tri-mode: USB-C, 2.4GHz, Bluetooth',
        'PBT double-shot keycaps, FA/EN legends',
      ],
      fa: [
        'مونتاژ گسکت با فوم ضدرزونانس',
        'سوئیکت تعویض سریع — بدون لحیم‌کاری',
        'اتصال سه‌گانه: USB-C، ۲.۴ گیگاهرتز، بلوتوث',
        'کیکپ PBT دو‌رنگ با حروف فارسی و انگلیسی',
      ],
    },
    price: { usd: 129, toman: 8400000 },
    listPrice: { usd: 159, toman: 10400000 },
    rating: 4.6,
    reviewCount: 6729,
    isPrime: true,
    stock: 60,
    imageId: 'keyboard',
  },
  {
    id: 'afx-view-27',
    category: 'computers',
    brand: 'Vantix',
    title: { en: 'Vantix ViewPro 27" 4K IPS Monitor — USB-C 90W', fa: 'نمایشگر ونتیکس ویوپرو ۲۷ اینچ ۴کی IPS — USB-C با ۹۰ وات' },
    description: {
      en: 'Factory-calibrated 4K IPS with 99% sRGB, one-cable 90W USB-C docking and a height/tilt/pivot ergonomic stand.',
      fa: 'پنل ۴کی IPS کالیبره کارخانه‌ای با پوشش ۹۹٪ sRGB، داک USB-C تک‌کابلی ۹۰ واتی و استند ارگونومیک ارتفاع/زاویه/چرخش.',
    },
    features: {
      en: [
        '4K IPS, 99% sRGB / 95% DCI-P3',
        'Single-cable docking: video + 90W power',
        'Height, tilt, swivel & pivot stand',
        'Low-blue-light + flicker-free certified',
      ],
      fa: [
        '۴کی IPS با پوشش ۹۹٪ sRGB و ۹۵٪ DCI-P3',
        'داک تک‌کابلی: تصویر + توان ۹۰ وات',
        'استند قابل تنظیم ارتفاع، زاویه، چرخش و عمود',
        'دارای گواهی نور آبی کم و بدون سوسو زدن',
      ],
    },
    price: { usd: 429, toman: 27900000 },
    rating: 4.5,
    reviewCount: 3854,
    isPrime: true,
    stock: 19,
    imageId: 'monitor',
  },
  {
    id: 'afx-glide-mouse',
    category: 'computers',
    brand: 'Keyora',
    title: { en: 'Keyora Glide Silent Wireless Mouse — 8000 DPI', fa: 'ماوس بی‌سیم بی‌صدا کیورا گلاید — دقت ۸۰۰۰ DPI' },
    description: {
      en: 'A whisper-quiet ergonomic mouse with 8000 DPI tracking, six programmable buttons and 70-day battery life.',
      fa: 'ماوس ارگونومیک فوق‌ساکت با دقت ۸۰۰۰ DPI، شش دکمه قابل برنامه‌ریزی و باتری ۷۰ روزه.',
    },
    features: {
      en: [
        '90% quieter clicks for shared spaces',
        '8000 DPI optical sensor',
        '70-day battery on one AA',
        'Works on glass and fabric',
      ],
      fa: [
        'کلیک‌های ۹۰٪ بی‌صداتر برای فضاهای اشتراکی',
        'سنسور نوری با دقت ۸۰۰۰ DPI',
        '۷۰ روز کارکرد با یک باتری قلمی',
        'کارکرد روی شیشه و پارچه',
      ],
    },
    price: { usd: 34, toman: 2200000 },
    listPrice: { usd: 45, toman: 2900000 },
    rating: 4.4,
    reviewCount: 12907,
    isPrime: true,
    stock: 120,
    imageId: 'mouse',
  },

  // ─── Home & Kitchen ───────────────────────────────────────────
  {
    id: 'afx-crema-pro',
    category: 'home-kitchen',
    brand: 'Brewline',
    title: { en: 'Brewline CremaPro Semi-Automatic Espresso Machine', fa: 'اسپرسوساز نیمه‌اتوماتیک برو‌لاین کرماپرو' },
    description: {
      en: 'A 20-bar Italian pump, PID temperature control and a steam wand that turns kitchen mornings into café rituals.',
      fa: 'پمپ ایتالیایی ۲۰ بار، کنترل دمای PID و بخارپز حرفه‌ای که صبح‌های خانه را به کافه تبدیل می‌کند.',
    },
    features: {
      en: [
        '20-bar Italian pump with PID control',
        '58mm commercial-style portafilter',
        'Steam wand for latte art',
        'Persian & English quick-start guide',
      ],
      fa: [
        'پمپ ایتالیایی ۲۰ بار با کنترل PID',
        'پرتافیلتر ۵۸ میلی‌متری تجاری',
        'لوله بخار برای لاته آرت',
        'راهنمای سریع فارسی و انگلیسی',
      ],
    },
    price: { usd: 399, toman: 25900000 },
    listPrice: { usd: 529, toman: 34400000 },
    rating: 4.7,
    reviewCount: 9108,
    badge: 'best-seller',
    isPrime: true,
    stock: 12,
    imageId: 'espresso',
  },
  {
    id: 'afx-aircrisp',
    category: 'home-kitchen',
    brand: 'Brewline',
    title: { en: 'Brewline AirCrisp 6L Digital Air Fryer', fa: 'سرخ‌کن هوایی دیجیتال برو‌لین ایرکریسپ ۶ لیتری' },
    description: {
      en: '6-liter rapid-air fryer with 12 presets, shake reminder and dishwasher-safe ceramic basket — crisp with 85% less oil.',
      fa: 'سرخ‌کن هوایی ۶ لیتری با ۱۲ برنامه آماده، یادآور تکان دادن و سبدهای سرامیکی قابل شستشو — ترد با ۸۵٪ روغن کمتر.',
    },
    features: {
      en: [
        '12 one-touch presets incl. Persian dishes',
        'Shake reminder for even crisping',
        'Dishwasher-safe ceramic non-stick basket',
        'Digital timer up to 60 minutes',
      ],
      fa: [
        '۱۲ برنامه لمسی شامل غذاهای ایرانی',
        'یادآور تکان دادن برای تردی یکنواخت',
        'سبد سرامیکی ضدچسبان قابل شستشو در ماشین',
        'تایمر دیجیتال تا ۶۰ دقیقه',
      ],
    },
    price: { usd: 119, toman: 7700000 },
    listPrice: { usd: 149, toman: 9700000 },
    rating: 4.6,
    reviewCount: 21543,
    isPrime: true,
    stock: 34,
    imageId: 'airfryer',
  },
  {
    id: 'afx-roam-vac',
    category: 'home-kitchen',
    brand: 'Vantix',
    title: { en: 'Vantix Roam R7 Robot Vacuum & Mop — LiDAR', fa: 'جاروبرقی رباتیک و طی‌کننده ونتیکس روم R7 — لیدار' },
    description: {
      en: 'LiDAR navigation maps three floors, sweeps then mops with 4000Pa suction, and self-empties into a 60-day dust bag.',
      fa: 'ناوبری لیدار سه طبقه را نقشه‌برداری می‌کند، با مکش ۴۰۰0 پاسا جارو و سپس طی می‌کند و خودکار در کیسه ۶۰ روزه تخلیه می‌شود.',
    },
    features: {
      en: [
        '4000Pa suction with carpet auto-boost',
        'Sweep + mop with electronic water control',
        'Self-empty base — 60-day capacity',
        'No-go zones in the bilingual app',
      ],
      fa: [
        'مکش ۴۰۰0 پاسا با تقویت خودکار روی فرش',
        'جارو و طی هم‌زمان با کنترل الکترونیکی آب',
        'پایگاه تخلیه خودکار با ظرفیت ۶۰ روز',
        'مناطق ممنوعه در اپلیکیشن دوزبانه',
      ],
    },
    price: { usd: 459, toman: 29900000 },
    listPrice: { usd: 599, toman: 38900000 },
    rating: 4.5,
    reviewCount: 7306,
    isPrime: true,
    stock: 9,
    imageId: 'robotvac',
  },

  // ─── Fashion ──────────────────────────────────────────────────
  {
    id: 'afx-drift-runner',
    category: 'fashion',
    brand: 'Stride',
    title: { en: 'Stride DriftCloud 2 Running Shoes — Unisex', fa: 'کفش دویدن استراید دریفت‌کلاود ۲ — مردانه/زنانه' },
    description: {
      en: 'Featherweight knit upper on a dual-density foam midsole — 240g of all-day cushioning for road and treadmill.',
      fa: 'رویه بافت سبک روی میان‌کف فوم دولایه — فقط ۲۴۰ گرم وزن با دوشیختگی تمام‌روز برای آسفالت و تردمیل.',
    },
    features: {
      en: [
        '240g featherweight breathable knit',
        'Dual-density foam — 30% energy return',
        'Reflective safety strips',
        'Sizes 36–46, unisex fit',
      ],
      fa: [
        'بافت تنفس‌پذیر با وزن ۲۴۰ گرم',
        'فوم دولایه با ۳۰٪ بازگشت انرژی',
        'نوارهای بازتابنده ایمنی',
        'سایز ۳۶ تا ۴۶، فرم یونیسکس',
      ],
    },
    price: { usd: 89, toman: 5800000 },
    listPrice: { usd: 120, toman: 7800000 },
    rating: 4.5,
    reviewCount: 15877,
    isPrime: true,
    stock: 75,
    imageId: 'sneakers',
  },
  {
    id: 'afx-voyager-pack',
    category: 'fashion',
    brand: 'Terra North',
    title: { en: 'Terra North Voyager 22L Water-Resistant Backpack', fa: 'کوله‌پشتی ضدآب ترا نورث وویجر ۲۲ لیتری' },
    description: {
      en: 'A minimalist 22L commuter pack with padded 16" laptop sleeve, hidden passport pocket and YKK water-resistant zippers.',
      fa: 'کوله شهری مینیمال ۲۲ لیتری با محفظه لپ‌تاپ ۱۶ اینچ، جیب مخفی پاسپورت و زیپ‌های ضدآب YKK.',
    },
    features: {
      en: [
        'Fits 16" laptops, padded & suspended',
        'Hidden anti-theft back pocket',
        'YKK Aquaguard water-resistant zips',
        'Luggage pass-through for travel',
      ],
      fa: [
        'جاگذاری لپ‌تاپ ۱۶ اینچ با محافظ معلق',
        'جیب پشتی ضدسرقت مخفی',
        'زیپ‌های ضدآب Aquaguard YKK',
        'پاس‌ترو چمدان برای سفر',
      ],
    },
    price: { usd: 74, toman: 4800000 },
    rating: 4.6,
    reviewCount: 4211,
    isPrime: true,
    stock: 48,
    imageId: 'backpack',
  },
  {
    id: 'afx-solstice',
    category: 'fashion',
    brand: 'Solstice',
    title: { en: 'Solstice Classic Aviator Sunglasses — Polarized UV400', fa: 'عینک آفتابی کلاسیک خلبانی سولستیسی — پلاریزه UV400' },
    description: {
      en: 'Polarized glass lenses with full UV400 protection in a lightweight stainless frame with spring hinges.',
      fa: 'لنزهای پلاریزه شیشه‌ای با محافظت کامل UV400 در فریم استیل سبک با لولای فنری.',
    },
    features: {
      en: [
        'Polarized — kills road & water glare',
        '100% UVA/UVB protection',
        'Spring hinges, unisex fit',
        'Hard case + microfiber cloth included',
      ],
      fa: [
        'پلاریزه — حذف کامل انعکاس جاده و آب',
        'محافظت ۱۰۰٪ از UVA و UVB',
        'لولای فنری با فرم یونیسکس',
        'همراه کیف سخت و دستمال مایکروفایبر',
      ],
    },
    price: { usd: 59, toman: 3800000 },
    listPrice: { usd: 79, toman: 5100000 },
    rating: 4.4,
    reviewCount: 8642,
    isPrime: true,
    stock: 90,
    imageId: 'sunglasses',
  },

  // ─── Watches ──────────────────────────────────────────────────
  {
    id: 'afx-halo-watch',
    category: 'watches',
    brand: 'Zenvo',
    title: { en: 'Zenvo Halo Fit Smartwatch — AMOLED, 14-Day Battery', fa: 'ساعت هوشمند زن‌وو هالو فیت — AMOLED با باتری ۱۴ روزه' },
    description: {
      en: 'A 1.9" always-on AMOLED with dual-band GPS, ECG-grade heart tracking and 14 days of real-world battery.',
      fa: 'نمایشگر ۱.۹ اینچ AMOLED همیشه‌روشن با GPS دو‌باند، پایش قلبی دقیق ECG و باتری واقعی ۱۴ روزه.',
    },
    features: {
      en: [
        '1.9" AMOLED always-on, sapphire glass',
        'Dual-band GPS route tracking',
        'SpO2, HRV & sleep staging',
        '100+ sport modes, 5ATM water resistance',
      ],
      fa: [
        'نمایشگر ۱.۹ اینچ AMOLED همیشه‌روشن با شیشه یاقوتی',
        'ردیابی مسیر با GPS دو‌باند',
        'سنجش اکسیژن خون، HRV و مراحل خواب',
        'بیش از ۱۰۰ حالت ورزشی و مقاومت آبی 5ATM',
      ],
    },
    price: { usd: 219, toman: 14300000 },
    listPrice: { usd: 279, toman: 18200000 },
    rating: 4.6,
    reviewCount: 11024,
    badge: 'choice',
    isPrime: true,
    stock: 31,
    imageId: 'smartwatch',
  },
  {
    id: 'afx-meridian',
    category: 'watches',
    brand: 'Meridian',
    title: { en: 'Meridian Heritage Automatic Chronograph', fa: 'کرنوگراف اتوماتیک کلاسیک مریدین هریتیج' },
    description: {
      en: 'A 41mm automatic chronograph with sapphire crystal, exhibition caseback and Italian leather strap.',
      fa: 'کرنوگراف اتوماتیک ۴۱ میلی‌متری با شیشه یاقوت، درب نمایشی مکانیزم و بند چرم ایتالیایی.',
    },
    features: {
      en: [
        'Automatic movement, 42h power reserve',
        'Sapphire crystal + exhibition back',
        'Italian full-grain leather strap',
        '10ATM water resistance',
      ],
      fa: [
        'مکانیزم اتوماتیک با ذخیره توان ۴۲ ساعته',
        'شیشه یاقوت + درب نمایشی حرکت',
        'بند چرم طبیعی ایتالیایی',
        'مقاومت آبی 10ATM',
      ],
    },
    price: { usd: 349, toman: 22900000 },
    rating: 4.8,
    reviewCount: 1893,
    isPrime: false,
    stock: 6,
    imageId: 'watch',
  },
  {
    id: 'afx-arc-band',
    category: 'watches',
    brand: 'Zenvo',
    title: { en: 'Zenvo Arc Slim Fitness Tracker', fa: 'دستبند تناسب اندام باریک زن‌وو آرک' },
    description: {
      en: 'An ultra-slim band with 21-day battery, automatic workout detection and stress breathing coaching.',
      fa: 'دستبند فوق‌باریک با باتری ۲۱ روزه، تشخیص خودکار تمرین و مربی تنفس برای کاهش استرس.',
    },
    features: {
      en: [
        '21-day battery, 1.1" AMOLED',
        'Auto workout detection for 14 sports',
        'Guided breathing sessions',
        'Swim-proof 5ATM design',
      ],
      fa: [
        'باتری ۲۱ روزه با نمایشگر ۱.۱ اینچ AMOLED',
        'تشخیص خودکار تمرین در ۱۴ رشته ورزشی',
        'جلسات تنفس هدایت‌شده',
        'طراحی ضدآب 5ATM مناسب شنا',
      ],
    },
    price: { usd: 59, toman: 3800000 },
    listPrice: { usd: 79, toman: 5100000 },
    rating: 4.3,
    reviewCount: 19482,
    isPrime: true,
    stock: 140,
    imageId: 'fitband',
  },

  // ─── Books ────────────────────────────────────────────────────
  {
    id: 'afx-book-craft',
    category: 'books',
    brand: 'AFAGHX Press',
    title: { en: 'The Ruthless Coder: Shipping 9.5/10 Software', fa: 'کدنویس بی‌رحمانه: ساخت نرم‌افزار ۹.۵ از ۱۰' },
    description: {
      en: 'A field manual for engineers who refuse shortcuts — architecture, reviews and the discipline of finishing well.',
      fa: 'راهنمای میدانی برای مهندسانی که میان‌بُر را رد می‌کنند — معماری، بازبینی کد و نظم در اتمام درست کار.',
    },
    features: {
      en: [
        '320 pages, hardcover, bilingual edition',
        'Chapters on review culture & scoring',
        'Case studies from real refactors',
        'Includes RTL/i18n engineering chapter',
      ],
      fa: [
        '۳۲۰ صفحه، جلد سخت، نسخه دوزبانه',
        'فصل‌هایی درباره فرهنگ بازبینی و نمره‌دهی',
        'مطالعه موردی از ریفکتورهای واقعی',
        'شامل فصل مهندسی RTL و بومی‌سازی',
      ],
    },
    price: { usd: 29, toman: 1890000 },
    listPrice: { usd: 39, toman: 2540000 },
    rating: 4.9,
    reviewCount: 3204,
    badge: 'best-seller',
    isPrime: true,
    stock: 210,
    imageId: 'bookstack',
  },
  {
    id: 'afx-book-ai',
    category: 'books',
    brand: 'AFAGHX Press',
    title: { en: 'Intelligence at Scale: AI Systems in Production', fa: 'هوش در مقیاس: سیستم‌های هوش مصنوعی در محیط عملیاتی' },
    description: {
      en: 'From embeddings to evaluation gates — the complete lifecycle of trustworthy AI products, in plain language.',
      fa: 'از امبدینگ تا گیت‌های ارزیابی — چرخه کامل ساخت محصولات هوش مصنوعی قابل‌اعتماد، به زبان ساده.',
    },
    features: {
      en: [
        'Hands-on patterns for production AI',
        'Evaluation gates & fail-closed design',
        'Persian translation reviewed by experts',
        'Free companion notebooks',
      ],
      fa: [
        'الگوهای کاربردی برای هوش مصنوعی عملیاتی',
        'گیت‌های ارزیابی و طراحی امن با شکست کنترل‌شده',
        'ترجمه فارسی بازبینی‌شده توسط متخصصان',
        'نوت‌بوک‌های همراه رایگان',
      ],
    },
    price: { usd: 34, toman: 2200000 },
    rating: 4.7,
    reviewCount: 1876,
    badge: 'new-arrival',
    isPrime: true,
    stock: 160,
    imageId: 'aibook',
  },
  {
    id: 'afx-book-minds',
    category: 'books',
    brand: 'AFAGHX Press',
    title: { en: 'The Focused Mind: Deep Work in a Loud World', fa: 'ذهن متمرکز: کار عمیق در دنیای پرصدا' },
    description: {
      en: 'Practical focus systems for builders — rituals, environments and digital minimalism that actually stick.',
      fa: 'سیستم‌های کاربردی تمرکز برای سازندگان — آیین‌ها، محیط‌ها و مینیمالیسم دیجیتالی که واقعاً ماندگارند.',
    },
    features: {
      en: [
        '256 pages, premium paperback',
        '12-week focus program included',
        'Translated bestseller — 400k copies',
        'Bilingual workbook download',
      ],
      fa: [
        '۲۵۶ صفحه، جلد شومیز پریمیوم',
        'شامل برنامه ۱۲ هفته‌ای تمرکز',
        'پرفروش ترجمه‌شده — ۴۰۰ هزار نسخه',
        'دانلود دفترکار دوزبانه',
      ],
    },
    price: { usd: 19, toman: 1240000 },
    listPrice: { usd: 26, toman: 1690000 },
    rating: 4.6,
    reviewCount: 9871,
    isPrime: true,
    stock: 320,
    imageId: 'bookstack',
  },

  // ─── Beauty ───────────────────────────────────────────────────
  {
    id: 'afx-glow-serum',
    category: 'beauty',
    brand: 'Lumière Lab',
    title: { en: 'Lumière Lab 15% Vitamin C + HA Glow Serum 30ml', fa: 'سرم روشن‌کننده لومیر لب ۱۵٪ ویتامین C + هیالورونیک ۳۰ میلی' },
    description: {
      en: 'A stabilized 15% vitamin C serum with hyaluronic acid and vitamin E — brighter, smoother skin in 4 weeks.',
      fa: 'سرم ویتامین C پایدار ۱۵٪ همراه هیالورونیک اسید و ویتامین E — پوستی روشن‌تر و یکنواخت‌تر در ۴ هفته.',
    },
    features: {
      en: [
        '15% stabilized L-ascorbic acid',
        'Hyaluronic acid triple-complex',
        'Fragrance-free, vegan, dermatologist-tested',
        'Airless pump keeps formula fresh',
      ],
      fa: [
        '۱۵٪ اسید L-آسکوربیک پایدار',
        'کمپلکس سه‌گانه هیالورونیک اسید',
        'بدون عطر، وگان، تست‌شده توسط متخصص پوست',
        'پمپ بدون هوا تازگی فرمول را حفظ می‌کند',
      ],
    },
    price: { usd: 24, toman: 1560000 },
    listPrice: { usd: 32, toman: 2080000 },
    rating: 4.5,
    reviewCount: 26310,
    badge: 'choice',
    isPrime: true,
    stock: 88,
    imageId: 'serum',
  },
  {
    id: 'afx-airflow',
    category: 'beauty',
    brand: 'Aeris',
    title: { en: 'Aeris IonicPro Hair Dryer 1800W — Ion Care', fa: 'سشوار آیریونیک‌پرو آریس ۱۸۰۰ وات — مراقبت یونی' },
    description: {
      en: 'Brushless ionic drying with intelligent heat control, magnetic styling nozzles and a 3-year motor warranty.',
      fa: 'خشک‌کن یونی بدون‌جاروبک با کنترل هوشمند حرارت، نازل‌های مغناطیسی حالت‌دهی و ۳ سال گارانتی موتور.',
    },
    features: {
      en: [
        'Brushless motor — 110,000 rpm',
        'Intelligent heat control every 20ms',
        'Magnetic concentrator + diffuser',
        'Negative ions cut frizz by 70%',
      ],
      fa: [
        'موتور بدون جاروبک با ۱۱۰ هزار دور در دقیقه',
        'کنترل هوشمند دما در هر ۲۰ میلی‌ثانیه',
        'نازل متمرکزکننده و دیفیوزر مغناطیسی',
        'یون‌های منفی تا ۷۰٪ وزکردن مو را کاهش می‌دهند',
      ],
    },
    price: { usd: 149, toman: 9700000 },
    listPrice: { usd: 189, toman: 12300000 },
    rating: 4.6,
    reviewCount: 7714,
    isPrime: true,
    stock: 27,
    imageId: 'hairdryer',
  },
  {
    id: 'afx-smile-pro',
    category: 'beauty',
    brand: 'Orave',
    title: { en: 'Orave SmilePro Sonic Toothbrush with 5 Modes', fa: 'مسواک برقی سونیک اوراو اسمایل‌پرو با ۵ حالت' },
    description: {
      en: 'A dentist-designed sonic brush with pressure sensor, 90-day battery and bilingual coaching in the app.',
      fa: 'مسواک سونیک طراحی‌شده توسط دندانپزشکان با سنسور فشار، باتری ۹۰ روزه و مربی دوزبانه در اپلیکیشن.',
    },
    features: {
      en: [
        '62,000 sonic movements per minute',
        'Smart pressure sensor protects gums',
        '90-day battery, USB-C travel case',
        'Persian & English in-app coaching',
      ],
      fa: [
        '۶۲ هزار حرکت سونیک در دقیقه',
        'سنسور هوشمند فشار برای محافظت از لثه',
        'باتری ۹۰ روزه با کیف سفر USB-C',
        'مربی درون‌برنامه‌ای فارسی و انگلیسی',
      ],
    },
    price: { usd: 69, toman: 4490000 },
    listPrice: { usd: 89, toman: 5800000 },
    rating: 4.7,
    reviewCount: 14355,
    badge: 'best-seller',
    isPrime: true,
    stock: 55,
    imageId: 'toothbrush',
  },

  // ─── Sports ───────────────────────────────────────────────────
  {
    id: 'afx-flow-mat',
    category: 'sports',
    brand: 'Asana Gear',
    title: { en: 'Asana FlowGrip Yoga Mat 6mm — Non-Slip TPE', fa: 'مت یوگا آسانا فلوگراپ ۶ میلی‌متری — TPE ضدلغزش' },
    description: {
      en: 'A dual-layer TPE mat with alignment lines, grippy wet-dry texture and a carry strap — kind to joints and planet.',
      fa: 'مت دولایه TPE با خطوط تراز، بافت چسبنده در حالت خشک و تر و بند حمل — مهربان با مفاصل و طبیعت.',
    },
    features: {
      en: [
        '6mm dual-layer TPE cushioning',
        'Wet & dry non-slip surface',
        'Alignment guides for poses',
        'Free from PVC and heavy metals',
      ],
      fa: [
        'ضخامت ۶ میلی‌متر با لایه دولایه TPE',
        'سطح ضدلغزش در حالت خشک و تر',
        'خطوط راهنمای تراز برای حرکات',
        'عاری از PVC و فلزات سنگین',
      ],
    },
    price: { usd: 42, toman: 2730000 },
    listPrice: { usd: 55, toman: 3580000 },
    rating: 4.6,
    reviewCount: 11308,
    isPrime: true,
    stock: 64,
    imageId: 'yogamat',
  },
  {
    id: 'afx-iron-flex',
    category: 'sports',
    brand: 'IronCore',
    title: { en: 'IronCore FlexDumbbell 5–25kg Adjustable Pair', fa: 'دمبل قابل تنظیم آیرون‌کور فلکس ۵ تا ۲۵ کیلوگرم (جفت)' },
    description: {
      en: 'Dial-a-weight dumbbells from 5 to 25kg each with a safety lock cradle — a full rack in the space of one.',
      fa: 'دمبل‌های تنظیم‌شونده ۵ تا ۲۵ کیلوگرمی با قفل ایمنی — یک قفسه کامل وزنه در فضای یک دمبل ثابت.',
    },
    features: {
      en: [
        '5–25kg per dumbbell, 2.5kg steps',
        'One-dial weight change under 3 seconds',
        'Safety lock prevents mid-set release',
        'Includes compact storage cradles',
      ],
      fa: [
        '۵ تا ۲۵ کیلوگرم در هر دمبل با گام ۲.۵ کیلویی',
        'تغییر وزن با یک پیچ، زیر ۳ ثانیه',
        'قفل ایمنی از رهاسازی ناخواسته جلوگیری می‌کند',
        'همراه پایه نگهداری کم‌جا',
      ],
    },
    price: { usd: 329, toman: 21400000 },
    listPrice: { usd: 429, toman: 27900000 },
    rating: 4.7,
    reviewCount: 5602,
    badge: 'limited-deal',
    isPrime: false,
    stock: 7,
    imageId: 'dumbbells',
  },
  {
    id: 'afx-aero-helm',
    category: 'sports',
    brand: 'Stride',
    title: { en: 'Stride AeroLite Cycling Helmet with MIPS', fa: 'کلاه ایمنی دوچرخه استراید آیرولایت با سیستم MIPS' },
    description: {
      en: 'A 260g in-mold MIPS helmet with 18 vents, rear LED light and a dial-fit system that disappears on your head.',
      fa: 'کلاه MIPS این‌مولد با وزن ۲۶۰ گرم، ۱۸ دریچه تهویه، چراغ عقب LED و سیستم تنظیم پیچی نامحسوس.',
    },
    features: {
      en: [
        'MIPS rotational impact protection',
        '260g with 18 ventilation channels',
        'USB-rechargeable rear LED',
        'CPSC & CE certified',
      ],
      fa: [
        'محافظت ضربه چرخشی MIPS',
        'وزن ۲۶۰ گرم با ۱۸ کانال تهویه',
        'چراغ عقب LED قابل شارژ USB',
        'دارای گواهی CPSC و CE',
      ],
    },
    price: { usd: 79, toman: 5140000 },
    rating: 4.8,
    reviewCount: 6420,
    isPrime: true,
    stock: 38,
    imageId: 'helmet',
  },
]

export const PRODUCTS: Product[] = SEEDS.map(({ imageId, ...p }) => ({
  ...p,
  image: img(imageId),
  imageFallback: FALLBACK,
}))

export const CATEGORIES: CategoryId[] = [
  'electronics',
  'computers',
  'home-kitchen',
  'fashion',
  'watches',
  'books',
  'beauty',
  'sports',
]

/** Category → representative products for the shop-by-category grid. */
export const CATEGORY_HERO_IDS: Record<CategoryId, string> = {
  electronics: 'afx-echo-anc',
  computers: 'afx-view-27',
  'home-kitchen': 'afx-crema-pro',
  fashion: 'afx-drift-runner',
  watches: 'afx-halo-watch',
  books: 'afx-book-craft',
  beauty: 'afx-glow-serum',
  sports: 'afx-flow-mat',
}

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}
