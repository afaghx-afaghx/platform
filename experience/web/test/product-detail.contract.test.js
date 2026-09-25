import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('public');
const page=fs.readFileSync(path.join(root,'products/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'products/product-detail-v1.js'),'utf8');
const css=fs.readFileSync(path.join(root,'products/product-detail-v1.css'),'utf8');

test('Product detail stays on canonical API boundary',()=>{
  assert.match(js,/https:\/\/api\.afaghx\.com/);
  assert.match(js,/\/v1\/products\//);
  assert.doesNotMatch(js,/localhost|127\.0\.0\.1|mock|fixture/i);
});

test('Product detail is fail-closed and handles auth/tenant responses',()=>{
  assert.match(js,/r\.status===401/);
  assert.match(js,/r\.status===403/);
  assert.match(js,/r\.status===404/);
  assert.match(js,/no fabricated data/i);
});

test('Product projection does not render forbidden commercial truth',()=>{
  assert.doesNotMatch(js,/product\.price|product\.stock|paymentState|orderState/);
  assert.match(js,/Commercial fields/);
});

test('RTL/LTR and responsive accessibility baseline',()=>{
  assert.match(page,/lang="fa" dir="rtl"/);
  assert.match(js,/document\.documentElement\.lang/);
  assert.match(js,/document\.documentElement\.dir/);
  assert.match(css,/max-width:620px/);
  assert.match(js,/role="status"/);
});