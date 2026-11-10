import type { LocalizedText } from './types'

export interface ProductBasket {
  id: string
  name: LocalizedText
  description: LocalizedText
  productIds: string[]
  featured: boolean
  previewImages?: {
    title: LocalizedText
    imageUrl: string
    sourceUrl: string
  }[]
}

// Canonical AFAGHX storefront taxonomy: 36 baskets in the approved display order.
// Product assignments are sample-catalogue references only; they do not prove
// live inventory, seller verification, stock or commercial availability.
export const PRODUCT_BASKETS: ProductBasket[] = [
  { id: 'dry-fruits-beverages', name: { en: 'Dried Fruits & Beverages', fa: 'خشکبار و نوشیدنی‌ها' }, description: { en: 'Dried fruits, nuts and beverages', fa: 'خشکبار، مغزها و نوشیدنی‌ها' }, productIds: [], featured: true },
  { id: 'clothing', name: { en: 'Clothing', fa: 'پوشاک' }, description: { en: 'Apparel and clothing products', fa: 'انواع پوشاک و محصولات مرتبط' }, productIds: ['afx-solstice'], featured: true },
  { id: 'automotive-accessories', name: { en: 'Automotive & Car Accessories', fa: 'خودرو و لوازم جانبی خودرو' }, description: { en: 'Vehicles, parts and automotive accessories', fa: 'خودرو، قطعات و لوازم جانبی خودرو' }, productIds: [], featured: true },
  { id: 'home-appliances', name: { en: 'Home Appliances', fa: 'لوازم خانگی' }, description: { en: 'Household appliances and equipment', fa: 'لوازم و تجهیزات خانگی' }, productIds: ['afx-crema-pro', 'afx-aircrisp', 'afx-roam-vac'], featured: true },
  { id: 'consumer-electronics', name: { en: 'Consumer Electronics', fa: 'لوازم الکترونیک مصرفی' }, description: { en: 'Consumer electronics and smart devices', fa: 'لوازم الکترونیکی مصرفی و تجهیزات هوشمند' }, productIds: ['afx-echo-anc', 'afx-vision-55', 'afx-pulse-phone'], featured: true },
  { id: 'machinery-equipment', name: { en: 'Machinery & Equipment', fa: 'دستگاه‌ها و ماشین‌آلات' }, description: { en: 'Industrial machinery, equipment and production systems', fa: 'ماشین‌آلات صنعتی، تجهیزات و سامانه‌های تولید' }, productIds: [], featured: true },
  { id: 'electrical-equipment', name: { en: 'Electrical Equipment & Supplies', fa: 'تجهیزات و لوازم الکتریکی' }, description: { en: 'Electrical equipment, components and supplies', fa: 'تجهیزات، قطعات و ملزومات الکتریکی' }, productIds: [], featured: true },
  { id: 'packaging-printing', name: { en: 'Packaging & Printing', fa: 'بسته‌بندی و چاپ' }, description: { en: 'Packaging materials, machinery and printing', fa: 'مواد، ماشین‌آلات بسته‌بندی و خدمات چاپ' }, productIds: [], featured: true },
  { id: 'office-school', name: { en: 'Office & School Supplies', fa: 'لوازم اداری و مدرسه' }, description: { en: 'Office, stationery and educational supplies', fa: 'لوازم اداری، نوشت‌افزار و ملزومات آموزشی' }, productIds: ['afx-book-craft', 'afx-book-ai', 'afx-book-minds'], featured: true },
  { id: 'energy', name: { en: 'Energy', fa: 'انرژی' }, description: { en: 'Energy products, systems and solutions', fa: 'محصولات، سامانه‌ها و راهکارهای انرژی' }, productIds: [], featured: false },
  { id: 'environment', name: { en: 'Environment', fa: 'محیط زیست' }, description: { en: 'Environmental products and solutions', fa: 'محصولات و راهکارهای زیست‌محیطی' }, productIds: [], featured: false },
  { id: 'raw-textiles', name: { en: 'Raw Textiles & Fabrics', fa: 'پارچه و منسوجات خام' }, description: { en: 'Raw fabrics, fibers and textile materials', fa: 'پارچه، الیاف و مواد اولیه نساجی' }, productIds: [], featured: false },
  { id: 'home-textiles', name: { en: 'Home Textiles', fa: 'منسوجات خانگی' }, description: { en: 'Home textiles and household fabrics', fa: 'منسوجات و پارچه‌های خانگی' }, productIds: [], featured: false },
  { id: 'toys-entertainment', name: { en: 'Toys & Entertainment', fa: 'اسباب‌بازی و سرگرمی' }, description: { en: 'Toys, games and entertainment products', fa: 'اسباب‌بازی، بازی‌ها و محصولات سرگرمی' }, productIds: [], featured: false },
  { id: 'gifts-handicrafts', name: { en: 'Gifts & Handicrafts', fa: 'هدایا و صنایع دستی' }, description: { en: 'Gifts, crafts and handmade products', fa: 'هدایا، هنرهای دستی و محصولات دست‌ساز' }, productIds: [], featured: false },
  { id: 'furniture', name: { en: 'Commercial, Office & Residential Furniture', fa: 'مبلمان تجاری، اداری و مسکونی' }, description: { en: 'Furniture for commercial, office and residential use', fa: 'مبلمان فضاهای تجاری، اداری و مسکونی' }, productIds: [], featured: false },
  { id: 'home-garden', name: { en: 'Home & Garden', fa: 'خانه و باغ' }, description: { en: 'Home, garden and outdoor living products', fa: 'محصولات خانه، باغ و فضای باز' }, productIds: [], featured: false },
  { id: 'fashion-accessories', name: { en: 'Fashion Accessories & Lifestyle', fa: 'لوازم جانبی و مد' }, description: { en: 'Fashion accessories and lifestyle products', fa: 'لوازم جانبی مد و محصولات سبک زندگی' }, productIds: ['afx-voyager-pack'], featured: false },
  { id: 'watches-jewelry-eyewear', name: { en: 'Watches, Jewelry & Eyewear', fa: 'ساعت، جواهرات و عینک' }, description: { en: 'Watches, jewelry, eyewear and accessories', fa: 'ساعت، جواهرات، عینک و متعلقات' }, productIds: ['afx-halo-watch', 'afx-meridian', 'afx-arc-band'], featured: false },
  { id: 'electronics-components-communications', name: { en: 'Electronic Components, Accessories & Communications', fa: 'قطعات الکترونیکی، لوازم جانبی و ارتباطات' }, description: { en: 'Electronic components, communications and accessories', fa: 'قطعات الکترونیکی، تجهیزات ارتباطی و لوازم جانبی' }, productIds: ['afx-nova-book', 'afx-type-75', 'afx-view-27', 'afx-glide-mouse'], featured: false },
  { id: 'services', name: { en: 'Services', fa: 'سرویس و خدمات' }, description: { en: 'Professional, technical and general services', fa: 'خدمات عمومی، تخصصی و فنی' }, productIds: [], featured: false },
  { id: 'commercial-services', name: { en: 'Commercial Services', fa: 'خدمات تجاری' }, description: { en: 'Trade, sourcing, consulting and business services', fa: 'خدمات بازرگانی، تأمین، مشاوره و کسب‌وکار' }, productIds: [], featured: false },
  { id: 'manufacturing-services', name: { en: 'Manufacturing Services', fa: 'خدمات ساخت' }, description: { en: 'Contract manufacturing, fabrication and production services', fa: 'خدمات تولید قراردادی، ساخت، مونتاژ و تولید' }, productIds: [], featured: false },
  { id: 'lighting', name: { en: 'Lighting', fa: 'چراغ و روشنایی' }, description: { en: 'Lighting products, fixtures and systems', fa: 'محصولات، تجهیزات و سامانه‌های روشنایی' }, productIds: [], featured: false },
  { id: 'construction-real-estate', name: { en: 'Construction Equipment & Real Estate', fa: 'تجهیزات ساخت‌وساز، املاک و مستغلات' }, description: { en: 'Construction equipment, real estate and property', fa: 'تجهیزات ساخت‌وساز، املاک و دارایی‌های غیرمنقول' }, productIds: [], featured: false },
  { id: 'beauty-personal-care', name: { en: 'Beauty & Personal Care', fa: 'زیبایی و مراقبت شخصی' }, description: { en: 'Beauty, cosmetics and personal care products', fa: 'محصولات زیبایی، آرایشی و مراقبت شخصی' }, productIds: ['afx-glow-serum', 'afx-airflow', 'afx-smile-pro'], featured: false },
  { id: 'health-medical', name: { en: 'Health & Medical', fa: 'بهداشت و پزشکی' }, description: { en: 'Healthcare, medical products and equipment', fa: 'محصولات و تجهیزات بهداشتی و پزشکی' }, productIds: [], featured: false },
  { id: 'agriculture', name: { en: 'Agriculture', fa: 'کشاورزی' }, description: { en: 'Agricultural products, inputs and equipment', fa: 'محصولات، نهاده‌ها و تجهیزات کشاورزی' }, productIds: [], featured: false },
  { id: 'minerals-metallurgy', name: { en: 'Minerals & Metallurgy', fa: 'مواد معدنی و متالورژی' }, description: { en: 'Minerals, metals and metallurgical products', fa: 'مواد معدنی، فلزات و محصولات متالورژی' }, productIds: [], featured: false },
  { id: 'chemicals', name: { en: 'Chemicals', fa: 'مواد شیمیایی' }, description: { en: 'Chemical materials and industrial chemicals', fa: 'مواد شیمیایی و مواد اولیه صنعتی' }, productIds: [], featured: false },
  { id: 'rubber-plastics', name: { en: 'Rubber & Plastics', fa: 'لاستیک و پلاستیک' }, description: { en: 'Rubber and plastic materials and products', fa: 'مواد و محصولات لاستیکی و پلاستیکی' }, productIds: [], featured: false },
  { id: 'bags-cases', name: { en: 'Luggage, Bags & Cases', fa: 'چمدان، کیف و جعبه' }, description: { en: 'Luggage, bags, cases and carrying accessories', fa: 'چمدان، کیف، جعبه و لوازم حمل' }, productIds: [], featured: false },
  { id: 'footwear', name: { en: 'Footwear & Accessories', fa: 'کفش و لوازم جانبی' }, description: { en: 'Footwear and footwear accessories', fa: 'کفش و لوازم جانبی کفش' }, productIds: ['afx-drift-runner'], featured: false },
  { id: 'sports-entertainment', name: { en: 'Sports & Recreation', fa: 'ورزش و سرگرمی' }, description: { en: 'Sports, fitness and recreation products', fa: 'محصولات ورزشی، تناسب اندام و تفریح' }, productIds: ['afx-flow-mat', 'afx-iron-flex', 'afx-aero-helm'], featured: false },
  { id: 'tools-hardware', name: { en: 'Tools & Hardware', fa: 'ابزار و سخت‌افزار' }, description: { en: 'Tools, hardware and workshop supplies', fa: 'ابزار، سخت‌افزار و ملزومات کارگاهی' }, productIds: [], featured: false },
  { id: 'security-protection', name: { en: 'Security & Protection', fa: 'امنیت و حفاظت' }, description: { en: 'Security, safety and protection products', fa: 'محصولات امنیت، ایمنی و حفاظت' }, productIds: [], featured: false },
]

export function getBasket(id: string): ProductBasket | undefined {
  return PRODUCT_BASKETS.find((basket) => basket.id === id)
}

export const PRODUCT_BASKET_COUNT = 36 as const

export interface ProductBasketAudit {
  expectedCount: number
  actualCount: number
  duplicateBasketIds: string[]
  missingLocalizedNames: string[]
  unknownProductIds: string[]
  duplicateProductAssignments: string[]
  isValid: boolean
}

/**
 * Deterministic integrity gate for the homepage taxonomy.
 * This validates references only; it does not assert inventory, seller approval,
 * image licensing, product availability or commercial truth.
 */
export function auditProductBaskets(catalogProductIds: readonly string[]): ProductBasketAudit {
  const catalogIds = new Set(catalogProductIds)
  const basketIds = new Set<string>()
  const productAssignments = new Set<string>()
  const duplicateBasketIds = new Set<string>()
  const missingLocalizedNames = new Set<string>()
  const unknownProductIds = new Set<string>()
  const duplicateProductAssignments = new Set<string>()

  for (const basket of PRODUCT_BASKETS) {
    if (basketIds.has(basket.id)) duplicateBasketIds.add(basket.id)
    basketIds.add(basket.id)

    if (!basket.name.fa.trim() || !basket.name.en.trim()) {
      missingLocalizedNames.add(basket.id)
    }

    for (const productId of basket.productIds) {
      if (!catalogIds.has(productId)) unknownProductIds.add(productId)
      if (productAssignments.has(productId)) duplicateProductAssignments.add(productId)
      productAssignments.add(productId)
    }
  }

  const duplicateBasketIdList = [...duplicateBasketIds]
  const missingLocalizedNameList = [...missingLocalizedNames]
  const unknownProductIdList = [...unknownProductIds]
  const duplicateProductAssignmentList = [...duplicateProductAssignments]

  return {
    expectedCount: PRODUCT_BASKET_COUNT,
    actualCount: PRODUCT_BASKETS.length,
    duplicateBasketIds: duplicateBasketIdList,
    missingLocalizedNames: missingLocalizedNameList,
    unknownProductIds: unknownProductIdList,
    duplicateProductAssignments: duplicateProductAssignmentList,
    isValid:
      PRODUCT_BASKETS.length === PRODUCT_BASKET_COUNT &&
      duplicateBasketIdList.length === 0 &&
      missingLocalizedNameList.length === 0 &&
      unknownProductIdList.length === 0 &&
      duplicateProductAssignmentList.length === 0,
  }
}
