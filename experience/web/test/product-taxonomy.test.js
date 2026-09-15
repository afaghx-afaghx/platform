import test from 'node:test';
import assert from 'node:assert/strict';

const { createServer } = await import('../server.js');
const server = createServer().listen(0, '127.0.0.1');
const base = `http://127.0.0.1:${server.address().port}`;
const html = await (await fetch(`${base}/`)).text();

const categories = [
  ['dry-fruits-beverages', 'خشکبار و نوشیدنی‌ها'], ['clothing', 'پوشاک'], ['automotive', 'خودرو و لوازم جانبی خودرو'],
  ['home-appliances', 'لوازم خانگی'], ['consumer-electronics', 'لوازم الکترونیک مصرفی'], ['machinery-equipment', 'دستگاه‌ها و ماشین‌آلات'],
  ['electrical-equipment', 'تجهیزات و لوازم الکتریکی'], ['packaging-printing', 'بسته‌بندی و چاپ'], ['office-school', 'لوازم اداری و مدرسه'],
  ['energy', 'انرژی'], ['environment', 'محیط زیست'], ['raw-textiles', 'پارچه و منسوجات خام'], ['home-textiles', 'منسوجات خانگی'],
  ['toys-entertainment', 'اسباب‌بازی و سرگرمی'], ['gifts-handicrafts', 'هدایا و صنایع دستی'], ['furniture', 'مبلمان'], ['home-garden', 'خانه و باغ'],
  ['fashion-accessories', 'لوازم جانبی و مد'], ['watches-jewelry-eyewear', 'ساعت، جواهرات، عینک'], ['electronics-components-communications', 'قطعات الکترونیکی، لوازم جانبی و ارتباطات'],
  ['service-equipment', 'سرویس و خدمات'], ['business-services', 'خدمات تجاری'], ['construction-services', 'خدمات ساخت'], ['lighting', 'چراغ و روشنایی'],
  ['construction-real-estate', 'تجهیزات ساخت‌وساز و املاک و مستغلات'], ['beauty-personal-care', 'زیبایی و مراقبت شخصی'], ['health-medical', 'بهداشت و پزشکی'],
  ['agriculture', 'کشاورزی'], ['minerals-metallurgy', 'مواد معدنی و متالورژی'], ['chemicals', 'مواد شیمیایی'], ['rubber-plastics', 'لاستیک و پلاستیک'],
  ['bags-cases', 'چمدان، کیف، جعبه'], ['footwear', 'کفش و لوازم جانبی'], ['sports-entertainment', 'ورزش و سرگرمی'], ['tools-hardware', 'ابزار و سخت‌افزار'],
  ['security-protection', 'امنیت و حفاظت']
];

test('homepage exposes every approved product category with a stable slug', () => {
  assert.match(html, /id="afx-search-category"/);
  for (const [slug, label] of categories) {
    assert.match(html, new RegExp(`value="${slug}"`), slug);
    assert.match(html, new RegExp(label), label);
  }
  assert.equal((html.match(/<option value="[^"]+">/g) || []).length, categories.length + 1);
});

test('category chips use the same stable taxonomy slugs as search options', () => {
  for (const [slug] of categories) assert.match(html, new RegExp(`data-category="${slug}"`), slug);
});

server.close();
