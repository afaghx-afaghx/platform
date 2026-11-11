import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_TAXONOMY, PRODUCT_TAXONOMY_COUNTS } from '../public/product-taxonomy.js';
import { readFile } from 'node:fs/promises';
import { createServer } from '../server.js';

test('canonical owner catalogue has exactly 36 unique ordered categories',()=>{
  assert.equal(PRODUCT_TAXONOMY.length,36);
  assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug])=>slug)).size,36);
  assert.equal(PRODUCT_TAXONOMY_COUNTS.totalImageSlots,144);
  assert.deepEqual(PRODUCT_TAXONOMY.slice(20,24).map(x=>x[1]),['سرویس و خدمات','خدمات تجاری','خدمات ساخت','چراغ و روشنایی']);
  for(const [slug,fa,en] of PRODUCT_TAXONOMY) assert.ok(slug&&fa&&en);
});

test('homepage source implements four separate image slots per category and no fake campaign records',async()=>{
  const js=await readFile(new URL('../public/home-v5.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../public/homepage-v2.css',import.meta.url),'utf8');
  const fa=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const en=await readFile(new URL('../public/en/index.html',import.meta.url),'utf8');
  assert.match(js,/Array\.from\(\{ length: 4 \}/);
  assert.match(js,/special-products/);
  assert.match(js,/No eligible campaigns have been returned|کمپین واجد شرایطی/);
  assert.match(js,/30 placements|۳۰ جایگاه/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/max-width:1199px/);
  assert.match(css,/max-width:1023px/);
  assert.match(fa,/خرید شخصی/);
  assert.match(fa,/خرید سازمانی/);
  assert.match(en,/Personal shopping \(B2C\)/);
  assert.match(en,/Organizational purchasing \(B2B\)/);
  assert.match(css,/max-width:820px/);
  assert.match(css,/max-width:359px/);
});

test('homepage serves Persian RTL and English LTR without breaking static routes',async()=>{
  let server;let base;
  await new Promise(resolve=>{server=createServer().listen(0,'127.0.0.1',()=>{base='http://127.0.0.1:'+server.address().port;resolve();});});
  try{
    const [fa,en,css]=await Promise.all([fetch(base+'/'),fetch(base+'/en/index.html'),fetch(base+'/homepage-v2.css')]);
    assert.match(await fa.text(),/lang="fa" dir="rtl"/);
    assert.match(await en.text(),/lang="en" dir="ltr"/);
    assert.equal(css.status,200);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
