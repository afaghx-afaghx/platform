import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css=await readFile(new URL('./header-final.css',import.meta.url),'utf8');
const js=await readFile(new URL('./header-final.js',import.meta.url),'utf8');
assert.match(css,/justify-content:flex-end/); assert.match(js,/موقعیت مکانی/); assert.match(js,/Language \/ زبان/); assert.match(js,/سبد کالا/); assert.match(js,/cart/); console.log('FINAL_HEADER_TEST_OK');
