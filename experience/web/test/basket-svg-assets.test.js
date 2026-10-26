import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const PUBLIC = new URL('../public/', import.meta.url);

test('all 34 canonical basket SVGs contain actual drawable vector geometry', () => {
  assert.equal(PRODUCT_TAXONOMY.length, 34, 'Canonical taxonomy must contain 34 approved baskets');
  const problems = [];

  for (const [slug, persianLabel, englishLabel] of PRODUCT_TAXONOMY) {
    const fileUrl = new URL('assets/baskets/' + slug + '.svg', PUBLIC);
    if (!fs.existsSync(fileUrl)) {
      problems.push({ slug, reason: 'missing-svg-file' });
      continue;
    }

    const svg = fs.readFileSync(fileUrl, 'utf8');
    const hasTitle = /<title(?:\s[^>]*)?>[^<]+<\/title>/.test(svg);
    const drawablePaths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((pathData) => pathData.trim().length >= 12 && /[Mm]\s*[\d.-]/.test(pathData));
    const hasOrphanedPathText = /<g\b[^>]*>\s*[Mm]\s*[\d.-][^<]*<\/g>/.test(svg);

    if (!hasTitle) problems.push({ slug, reason: 'missing-accessible-title' });
    if (drawablePaths.length === 0) problems.push({ slug, reason: 'no-drawable-path' });
    if (hasOrphanedPathText) problems.push({ slug, reason: 'path-commands-not-wrapped-in-path-element' });
    if (!persianLabel || !englishLabel) problems.push({ slug, reason: 'missing-bilingual-taxonomy-label' });
  }

  assert.deepEqual(problems, [], 'Malformed basket art assets: ' + JSON.stringify(problems));
});
