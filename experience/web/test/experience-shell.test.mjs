import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("experience/web/public");
const surfaces = [
  "about","admin","architecture","assistant","b2b","b2c","baskets","cart","checkout","company",
  "contact","contracts","dashboard","docs","factories","kyb","markets","match","network","orders",
  "po","products","profile","quotes","rfq","roadmap","services","suppliers","trust"
];

for (const slug of surfaces) {
  const file = path.join(root, slug, "index.html");
  assert.equal(fs.existsSync(file), true, `missing governed surface: ${slug}`);
  const html = fs.readFileSync(file, "utf8");
  assert.match(html, /experience-pages-v1\.js/, `missing shared renderer: ${slug}`);
  assert.match(html, /experience-defects-v1\.css/, `missing shared stylesheet: ${slug}`);
}

const renderer = fs.readFileSync(path.join(root, "experience-pages-v1.js"), "utf8");
assert.match(renderer, /document\.documentElement\.dir = fa \? 'rtl' : 'ltr'/);
assert.match(renderer, /params\.get\('lang'\) === 'fa'/);
assert.match(renderer, /href="\\\$\{other\\\}"/);
assert.match(renderer, /No live capability is claimed without runtime evidence/);

console.log(`Experience shell UX contract: ${surfaces.length} surfaces verified`);
