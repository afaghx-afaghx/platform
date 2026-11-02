import type { LocalizedText } from './types'

export interface ProductBasket {
  id: string
  name: LocalizedText
  description: LocalizedText
  productIds: string[]
  featured: boolean
}

export const PRODUCT_BASKETS: ProductBasket[] = [
  { id: 'electronics-electrical', name: { en: 'Electronics & Electrical', fa: 'الکترونیک و تجهیزات برقی' }, description: { en: 'Consumer electronics, audio, displays and electrical equipment', fa: 'لوازم الکترونیکی، صوتی، نمایشگرها و تجهیزات برقی' }, productIds: ['afx-echo-anc', 'afx-vision-55', 'afx-pulse-phone'], featured: true },
  { id: 'computers-it', name: { en: 'Computers & IT', fa: 'رایانه و فناوری اطلاعات' }, description: { en: 'Computers, peripherals and IT equipment', fa: 'رایانه، تجهیزات جانبی و فناوری اطلاعات' }, productIds: ['afx-nova-book', 'afx-type-75', 'afx-view-27', 'afx-glide-mouse'], featured: true },
  { id: 'home-kitchen', name: { en: 'Home & Kitchen', fa: 'خانه و آشپزخانه' }, description: { en: 'Home appliances, kitchenware and everyday home essentials', fa: 'لوازم خانه، آشپزخانه و نیازهای روزمره' }, productIds: ['afx-crema-pro', 'afx-aircrisp', 'afx-roam-vac'], featured: true },
  { id: 'fashion-apparel', name: { en: 'Fashion & Apparel', fa: 'مد و پوشاک' }, description: { en: 'Clothing, footwear, bags and accessories', fa: 'پوشاک، کفش، کیف و اکسسوری' }, productIds: ['afx-drift-runner', 'afx-voyager-pack', 'afx-solstice'], featured: true },
  { id: 'watches-jewelry', name: { en: 'Watches & Jewelry', fa: 'ساعت و زیورآلات' }, description: { en: 'Watches, jewelry and personal accessories', fa: 'ساعت، زیورآلات و لوازم شخصی' }, productIds: ['afx-halo-watch', 'afx-meridian', 'afx-arc-band'], featured: true },
  { id: 'books-media', name: { en: 'Books & Media', fa: 'کتاب و رسانه' }, description: { en: 'Books, learning resources and media', fa: 'کتاب، منابع آموزشی و رسانه' }, productIds: ['afx-book-craft', 'afx-book-ai', 'afx-book-minds'], featured: true },
  { id: 'beauty-personal-care', name: { en: 'Beauty & Personal Care', fa: 'زیبایی و مراقبت شخصی' }, description: { en: 'Skincare, personal care and grooming products', fa: 'مراقبت پوست، بهداشت فردی و آراستگی' }, productIds: ['afx-glow-serum', 'afx-airflow', 'afx-smile-pro'], featured: true },
  { id: 'sports-outdoors', name: { en: 'Sports & Outdoors', fa: 'ورزش و فضای باز' }, description: { en: 'Fitness, outdoor recreation and sports equipment', fa: 'تناسب اندام، طبیعت‌گردی و تجهیزات ورزشی' }, productIds: ['afx-flow-mat', 'afx-iron-flex', 'afx-aero-helm'], featured: true },
  { id: 'industrial-machinery', name: { en: 'Industrial Machinery', fa: 'ماشین‌آلات صنعتی' }, description: { en: 'Production machinery, industrial equipment and spare parts', fa: 'ماشین‌آلات تولید، تجهیزات صنعتی و قطعات یدکی' }, productIds: [], featured: false },
  { id: 'tools-hardware', name: { en: 'Tools & Hardware', fa: 'ابزار و یراق‌آلات' }, description: { en: 'Hand tools, power tools, fasteners and hardware', fa: 'ابزار دستی و برقی، اتصالات و یراق‌آلات' }, productIds: [], featured: false },
  { id: 'construction-materials', name: { en: 'Construction Materials', fa: 'مصالح ساختمانی' }, description: { en: 'Structural materials, finishing products and building supplies', fa: 'مصالح سازه‌ای، نازک‌کاری و ملزومات ساختمان' }, productIds: [], featured: false },
  { id: 'metals-alloys', name: { en: 'Metals & Alloys', fa: 'فلزات و آلیاژها' }, description: { en: 'Steel, aluminum, copper and industrial alloys', fa: 'فولاد، آلومینیوم، مس و آلیاژهای صنعتی' }, productIds: [], featured: false },
  { id: 'chemicals-polymers', name: { en: 'Chemicals & Polymers', fa: 'مواد شیمیایی و پلیمرها' }, description: { en: 'Industrial chemicals, resins and polymer materials', fa: 'مواد شیمیایی صنعتی، رزین و مواد پلیمری' }, productIds: [], featured: false },
  { id: 'energy-electrical-equipment', name: { en: 'Energy & Power Equipment', fa: 'انرژی و تجهیزات نیروگاهی' }, description: { en: 'Power systems, energy equipment and electrical infrastructure', fa: 'سامانه‌های برق، تجهیزات انرژی و زیرساخت الکتریکی' }, productIds: [], featured: false },
  { id: 'automotive-transport', name: { en: 'Automotive & Transport', fa: 'خودرو و حمل‌ونقل' }, description: { en: 'Vehicles, transport equipment and components', fa: 'وسایل نقلیه، تجهیزات حمل‌ونقل و قطعات' }, productIds: [], featured: false },
  { id: 'agriculture-farming', name: { en: 'Agriculture & Farming', fa: 'کشاورزی و دامداری' }, description: { en: 'Farm inputs, agricultural machinery and cultivation supplies', fa: 'نهاده‌ها، ماشین‌آلات کشاورزی و ملزومات کشت' }, productIds: [], featured: false },
  { id: 'food-beverages', name: { en: 'Food & Beverages', fa: 'مواد غذایی و نوشیدنی' }, description: { en: 'Packaged foods, ingredients and beverages', fa: 'مواد غذایی بسته‌بندی‌شده، ترکیبات و نوشیدنی‌ها' }, productIds: [], featured: false },
  { id: 'healthcare-medical', name: { en: 'Healthcare & Medical', fa: 'سلامت و تجهیزات پزشکی' }, description: { en: 'Medical supplies, healthcare equipment and diagnostics', fa: 'ملزومات پزشکی، تجهیزات سلامت و تشخیص' }, productIds: [], featured: false },
  { id: 'pharmaceuticals', name: { en: 'Pharmaceuticals', fa: 'دارو و محصولات دارویی' }, description: { en: 'Pharmaceutical products and regulated medical supplies', fa: 'محصولات دارویی و ملزومات پزشکی ضابطه‌مند' }, productIds: [], featured: false },
  { id: 'packaging-printing', name: { en: 'Packaging & Printing', fa: 'بسته‌بندی و چاپ' }, description: { en: 'Packaging materials, labels and printing services', fa: 'مواد بسته‌بندی، برچسب و ملزومات چاپ' }, productIds: [], featured: false },
  { id: 'office-school-supplies', name: { en: 'Office & School Supplies', fa: 'ملزومات اداری و آموزشی' }, description: { en: 'Office products, stationery and school supplies', fa: 'لوازم اداری، نوشت‌افزار و ملزومات مدرسه' }, productIds: [], featured: false },
  { id: 'furniture-interiors', name: { en: 'Furniture & Interiors', fa: 'مبلمان و دکوراسیون' }, description: { en: 'Furniture, interior fittings and décor', fa: 'مبلمان، تجهیزات داخلی و دکوراسیون' }, productIds: [], featured: false },
  { id: 'textiles-fabrics', name: { en: 'Textiles & Fabrics', fa: 'منسوجات و پارچه' }, description: { en: 'Fabrics, fibers, yarns and textile supplies', fa: 'پارچه، الیاف، نخ و ملزومات نساجی' }, productIds: [], featured: false },
  { id: 'leather-footwear', name: { en: 'Leather & Footwear', fa: 'چرم و کفش' }, description: { en: 'Leather goods, footwear and shoe components', fa: 'محصولات چرمی، کفش و قطعات کفش' }, productIds: [], featured: false },
  { id: 'toys-baby', name: { en: 'Toys & Baby Products', fa: 'اسباب‌بازی و کودک' }, description: { en: 'Toys, baby care and children’s essentials', fa: 'اسباب‌بازی، مراقبت کودک و نیازهای خردسال' }, productIds: [], featured: false },
  { id: 'pet-products', name: { en: 'Pet Products', fa: 'محصولات حیوانات خانگی' }, description: { en: 'Pet food, accessories and care supplies', fa: 'غذای حیوانات خانگی، لوازم و محصولات مراقبتی' }, productIds: [], featured: false },
  { id: 'jewelry-accessories', name: { en: 'Accessories & Lifestyle', fa: 'اکسسوری و سبک زندگی' }, description: { en: 'Lifestyle accessories and everyday carry goods', fa: 'اکسسوری‌های سبک زندگی و ملزومات روزمره' }, productIds: [], featured: false },
  { id: 'telecom-networking', name: { en: 'Telecom & Networking', fa: 'مخابرات و شبکه' }, description: { en: 'Networking, connectivity and communications equipment', fa: 'تجهیزات شبکه، اتصال و ارتباطات' }, productIds: [], featured: false },
  { id: 'security-surveillance', name: { en: 'Security & Surveillance', fa: 'امنیت و نظارت تصویری' }, description: { en: 'Access control, alarms and security systems', fa: 'کنترل دسترسی، هشدار و سامانه‌های امنیتی' }, productIds: [], featured: false },
  { id: 'laboratory-testing', name: { en: 'Laboratory & Testing', fa: 'آزمایشگاه و آزمون' }, description: { en: 'Lab equipment, testing instruments and consumables', fa: 'تجهیزات آزمایشگاهی، ابزار آزمون و مواد مصرفی' }, productIds: [], featured: false },
  { id: 'water-environment', name: { en: 'Water & Environment', fa: 'آب و محیط زیست' }, description: { en: 'Water treatment, environmental systems and supplies', fa: 'تصفیه آب، سامانه‌های محیط‌زیستی و ملزومات' }, productIds: [], featured: false },
  { id: 'logistics-warehousing', name: { en: 'Logistics & Warehousing', fa: 'لجستیک و انبارداری' }, description: { en: 'Material handling, warehousing and logistics equipment', fa: 'جابجایی کالا، انبارداری و تجهیزات لجستیکی' }, productIds: [], featured: false },
  { id: 'hospitality-catering', name: { en: 'Hospitality & Catering', fa: 'هتلداری و تجهیزات پذیرایی' }, description: { en: 'Hospitality, restaurant and commercial kitchen equipment', fa: 'تجهیزات هتلداری، رستوران و آشپزخانه تجاری' }, productIds: [], featured: false },
  { id: 'renewable-energy', name: { en: 'Renewable Energy', fa: 'انرژی‌های تجدیدپذیر' }, description: { en: 'Solar, wind and energy-storage equipment', fa: 'تجهیزات خورشیدی، بادی و ذخیره‌سازی انرژی' }, productIds: [], featured: false },
  { id: 'professional-services', name: { en: 'Professional & Business Services', fa: 'خدمات حرفه‌ای و کسب‌وکار' }, description: { en: 'Business services supporting sourcing and trade', fa: 'خدمات کسب‌وکار پشتیبان تأمین و تجارت' }, productIds: [], featured: false },
]

export function getBasket(id: string): ProductBasket | undefined {
  return PRODUCT_BASKETS.find((basket) => basket.id === id)
}

export function validateBasketCatalog(productIds: string[]): { missingProductIds: string[]; duplicateProductIds: string[] } {
  const known = new Set(productIds)
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const basket of PRODUCT_BASKETS) {
    for (const productId of basket.productIds) {
      if (seen.has(productId)) duplicates.add(productId)
      seen.add(productId)
    }
  }
  return {
    missingProductIds: [...seen].filter((id) => !known.has(id)),
    duplicateProductIds: [...duplicates],
  }
}
