import type { LocalizedText } from './types'

export interface ProductBasket {
  id: string
  name: LocalizedText
  description: LocalizedText
  productIds: string[]
  featured: boolean
}

// Canonical AFAGHX product-basket taxonomy: the 36 categories approved by the project owner.
// Empty productIds mean no real catalog products have yet been assigned; never fabricate listings.
export const PRODUCT_BASKETS: ProductBasket[] = [
  { id: 'dried-fruits-beverages', name: { en: 'Nuts, dried fruits and beverages', fa: 'خشکبار و نوشیدنی‌ها' }, description: { en: 'Nuts, dried fruits and beverages', fa: 'خشکبار و نوشیدنی‌ها' }, productIds: ['afx-crema-pro'], featured: true },
  { id: 'apparel', name: { en: 'Clothing and apparel', fa: 'پوشاک' }, description: { en: 'Clothing and apparel', fa: 'پوشاک' }, productIds: ['afx-solstice'], featured: true },
  { id: 'automotive-accessories', name: { en: 'Vehicles and automotive accessories', fa: 'خودرو و لوازم جانبی خودرو' }, description: { en: 'Vehicles and automotive accessories', fa: 'خودرو و لوازم جانبی خودرو' }, productIds: [], featured: true },
  { id: 'home-appliances', name: { en: 'Home appliances', fa: 'لوازم خانگی' }, description: { en: 'Home appliances', fa: 'لوازم خانگی' }, productIds: ['afx-aircrisp', 'afx-roam-vac'], featured: true },
  { id: 'consumer-electronics', name: { en: 'Consumer electronics', fa: 'لوازم الکترونیک مصرفی' }, description: { en: 'Consumer electronics', fa: 'لوازم الکترونیک مصرفی' }, productIds: ['afx-echo-anc', 'afx-vision-55', 'afx-pulse-phone'], featured: true },
  { id: 'machinery-equipment', name: { en: 'Machinery and equipment', fa: 'دستگاه‌ها و ماشین‌آلات' }, description: { en: 'Machinery and equipment', fa: 'دستگاه‌ها و ماشین‌آلات' }, productIds: [], featured: true },
  { id: 'electrical-equipment', name: { en: 'Electrical equipment and supplies', fa: 'تجهیزات و لوازم الکتریکی' }, description: { en: 'Electrical equipment and supplies', fa: 'تجهیزات و لوازم الکتریکی' }, productIds: [], featured: true },
  { id: 'packaging-printing', name: { en: 'Packaging and printing', fa: 'بسته‌بندی و چاپ' }, description: { en: 'Packaging and printing', fa: 'بسته‌بندی و چاپ' }, productIds: [], featured: true },
  { id: 'office-school-supplies', name: { en: 'Office and school supplies', fa: 'لوازم اداری و مدرسه' }, description: { en: 'Office and school supplies', fa: 'لوازم اداری و مدرسه' }, productIds: ['afx-nova-book', 'afx-type-75'], featured: true },
  { id: 'energy', name: { en: 'Energy products and systems', fa: 'انرژی' }, description: { en: 'Energy products and systems', fa: 'انرژی' }, productIds: [], featured: false },
  { id: 'environment', name: { en: 'Environmental products and solutions', fa: 'محیط زیست' }, description: { en: 'Environmental products and solutions', fa: 'محیط زیست' }, productIds: [], featured: false },
  { id: 'raw-textiles-fabrics', name: { en: 'Raw fabrics and textiles', fa: 'پارچه و منسوجات خام' }, description: { en: 'Raw fabrics and textiles', fa: 'پارچه و منسوجات خام' }, productIds: [], featured: false },
  { id: 'home-textiles', name: { en: 'Home textiles', fa: 'منسوجات خانگی' }, description: { en: 'Home textiles', fa: 'منسوجات خانگی' }, productIds: [], featured: false },
  { id: 'toys-entertainment', name: { en: 'Toys and entertainment', fa: 'اسباب‌بازی و سرگرمی' }, description: { en: 'Toys and entertainment', fa: 'اسباب‌بازی و سرگرمی' }, productIds: [], featured: false },
  { id: 'gifts-handicrafts', name: { en: 'Gifts and handicrafts', fa: 'هدایا و صنایع دستی' }, description: { en: 'Gifts and handicrafts', fa: 'هدایا و صنایع دستی' }, productIds: [], featured: false },
  { id: 'furniture', name: { en: 'Commercial, office and residential furniture', fa: 'مبلمان تجاری، اداری و مسکونی' }, description: { en: 'Commercial, office and residential furniture', fa: 'مبلمان تجاری، اداری و مسکونی' }, productIds: [], featured: false },
  { id: 'home-garden', name: { en: 'Home and garden', fa: 'خانه و باغ' }, description: { en: 'Home and garden', fa: 'خانه و باغ' }, productIds: [], featured: false },
  { id: 'fashion-accessories', name: { en: 'Fashion accessories', fa: 'لوازم جانبی و مد' }, description: { en: 'Fashion accessories', fa: 'لوازم جانبی و مد' }, productIds: ['afx-voyager-pack'], featured: false },
  { id: 'watches-jewelry-eyewear', name: { en: 'Watches, jewelry and eyewear', fa: 'ساعت، جواهرات، عینک' }, description: { en: 'Watches, jewelry and eyewear', fa: 'ساعت، جواهرات، عینک' }, productIds: ['afx-halo-watch', 'afx-meridian', 'afx-arc-band'], featured: false },
  { id: 'electronic-components-communications', name: { en: 'Electronic components, accessories and communications', fa: 'قطعات الکترونیکی، لوازم جانبی، ارتباطات' }, description: { en: 'Electronic components, accessories and communications', fa: 'قطعات الکترونیکی، لوازم جانبی، ارتباطات' }, productIds: ['afx-view-27', 'afx-glide-mouse'], featured: false },
  { id: 'service-equipment', name: { en: 'Service equipment and services', fa: 'سرویس و خدمات' }, description: { en: 'Service equipment and services', fa: 'سرویس و خدمات' }, productIds: [], featured: false },
  { id: 'business-services', name: { en: 'Business services', fa: 'خدمات تجاری' }, description: { en: 'Business services', fa: 'خدمات تجاری' }, productIds: [], featured: false },
  { id: 'manufacturing-services', name: { en: 'Manufacturing services', fa: 'خدمات ساخت' }, description: { en: 'Manufacturing services', fa: 'خدمات ساخت' }, productIds: [], featured: false },
  { id: 'lighting', name: { en: 'Lighting and illumination', fa: 'چراغ و روشنایی' }, description: { en: 'Lighting and illumination', fa: 'چراغ و روشنایی' }, productIds: [], featured: false },
  { id: 'construction-real-estate', name: { en: 'Construction equipment, real estate and property', fa: 'تجهیزات ساخت‌وساز، املاک و مستغلات' }, description: { en: 'Construction equipment, real estate and property', fa: 'تجهیزات ساخت‌وساز، املاک و مستغلات' }, productIds: [], featured: false },
  { id: 'beauty-personal-care', name: { en: 'Beauty and personal care', fa: 'زیبایی و مراقبت شخصی' }, description: { en: 'Beauty and personal care', fa: 'زیبایی و مراقبت شخصی' }, productIds: ['afx-glow-serum', 'afx-airflow', 'afx-smile-pro'], featured: false },
  { id: 'health-medical', name: { en: 'Healthcare and medical products', fa: 'بهداشت و پزشکی' }, description: { en: 'Healthcare and medical products', fa: 'بهداشت و پزشکی' }, productIds: [], featured: false },
  { id: 'agriculture', name: { en: 'Agriculture and farming', fa: 'کشاورزی' }, description: { en: 'Agriculture and farming', fa: 'کشاورزی' }, productIds: [], featured: false },
  { id: 'minerals-metallurgy', name: { en: 'Minerals and metallurgy', fa: 'مواد معدنی و متالورژی' }, description: { en: 'Minerals and metallurgy', fa: 'مواد معدنی و متالورژی' }, productIds: [], featured: false },
  { id: 'chemicals', name: { en: 'Chemicals', fa: 'مواد شیمیایی' }, description: { en: 'Chemicals', fa: 'مواد شیمیایی' }, productIds: [], featured: false },
  { id: 'rubber-plastics', name: { en: 'Rubber and plastics', fa: 'لاستیک و پلاستیک' }, description: { en: 'Rubber and plastics', fa: 'لاستیک و پلاستیک' }, productIds: [], featured: false },
  { id: 'luggage-bags-boxes', name: { en: 'Luggage, bags and cases', fa: 'چمدان، کیف، جعبه' }, description: { en: 'Luggage, bags and cases', fa: 'چمدان، کیف، جعبه' }, productIds: [], featured: false },
  { id: 'footwear-accessories', name: { en: 'Footwear and footwear accessories', fa: 'کفش و لوازم جانبی' }, description: { en: 'Footwear and footwear accessories', fa: 'کفش و لوازم جانبی' }, productIds: ['afx-drift-runner'], featured: false },
  { id: 'sports-entertainment', name: { en: 'Sports and recreation', fa: 'ورزش و سرگرمی' }, description: { en: 'Sports and recreation', fa: 'ورزش و سرگرمی' }, productIds: ['afx-flow-mat', 'afx-iron-flex', 'afx-aero-helm'], featured: false },
  { id: 'tools-hardware', name: { en: 'Tools and hardware', fa: 'ابزار و سخت‌افزار' }, description: { en: 'Tools and hardware', fa: 'ابزار و سخت‌افزار' }, productIds: [], featured: false },
  { id: 'security-protection', name: { en: 'Security and protection', fa: 'امنیت و حفاظت' }, description: { en: 'Security and protection', fa: 'امنیت و حفاظت' }, productIds: [], featured: false },
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
