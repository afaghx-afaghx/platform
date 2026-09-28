import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const forbidden = [
  'auth' + 'enticateAccessToken',
  '.' + 'authorize' + '(',
  'author' + 'ization',
  'Bearer',
  'token' + 'Value'
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk('domains');
const hits = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const marker of forbidden) if (text.includes(marker)) hits.push({ file, marker });
}
if (hits.length) {
  console.error(JSON.stringify({ status: 'FAIL', hits }, null, 2));
  process.exit(1);
}
execFileSync(process.execPath, ['--test', 'domains/product/product-query.test.mjs'], { stdio: 'inherit' });
console.log(JSON.stringify({ status: 'PASS', filesChecked: files.length, boundary: 'SecurityContext-only' }));
