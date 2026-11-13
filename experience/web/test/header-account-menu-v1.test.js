import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('AFAGHX account flyout includes all 14 account areas and four list actions in both locales',async()=>{
  const fa=await readFile(new URL('../public/header-account-menu-v1.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../public/header-account-menu-v1.css',import.meta.url),'utf8');
  const faHtml=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const enHtml=await readFile(new URL('../public/en/index.html',import.meta.url),'utf8');
  for(const label of ['Account & Security','Orders & Transactions','Activity & Engagement','Intelligence & Recommendations','Seller Center','Procurement & Sourcing','Marketing & Advertising','Finance & Payments','Membership & Subscriptions','Contracts & Documentation','Digital Solutions','Customer Care & Resolution','AFA CODE Registry','Organization & Administration']) assert.ok(fa.includes(label),label);
  for(const label of ['ایجاد فهرست','کشف فهرست‌ها','مجموعه‌های ذخیره‌شده','فهرست‌های اشتراکی']) assert.ok(fa.includes(label),label);
  assert.match(fa,/aria-expanded/);
  assert.match(fa,/Escape/);
  assert.match(fa,/role|aria-label/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(css,/focus-visible/);
  assert.match(faHtml,/header-account-menu-v1\.js/);
  assert.match(enHtml,/header-account-menu-v1\.js/);
});
