import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PUBLIC = new URL('../public/', import.meta.url);
const premiumCss = fs.readFileSync(new URL('afaghx-ui-premium-v1.css', PUBLIC), 'utf8');
const experienceV3Css = fs.readFileSync(new URL('afaghx-experience-v3.css', PUBLIC), 'utf8');
const experienceV4Css = fs.readFileSync(new URL('afaghx-experience-v4.css', PUBLIC), 'utf8');
const rolePages = ['roles.html','customer.html','supplier.html','factory.html','partner.html','business.html'];

test('premium public Experience design system implements the four-pillar visual system', () => {
  assert.match(premiumCss, /AFAGHX Experience UI v2\.0/);
  assert.match(premiumCss, /01 Hierarchy/);
  assert.match(premiumCss, /02 Color/);
  assert.match(premiumCss, /03 Meaning/);
  assert.match(premiumCss, /04 Trust/);
  assert.match(premiumCss, /--afx-navy:#0b1426/);
  assert.match(premiumCss, /--afx-blue:#2563eb/);
  assert.match(premiumCss, /--afx-violet:#705cf6/);
  assert.match(premiumCss, /--afx-mint:#12b89a/);
  assert.match(premiumCss, /--afx-gradient:/);
  assert.match(premiumCss, /\.afx-hero-grid/);
  assert.match(premiumCss, /\.afx-card-grid/);
  assert.match(premiumCss, /\.afx-success/);
  assert.match(premiumCss, /\.afx-warning/);
  assert.match(premiumCss, /\.afx-danger/);
  assert.match(premiumCss, /@media\(max-width:680px\)/);
  assert.match(premiumCss, /prefers-reduced-motion/);
  assert.match(experienceV3Css, /جذب → کشف → اعتماد → اقدام/);
  assert.match(experienceV3Css, /#discover\{order:1\}/);
  assert.match(experienceV3Css, /#modes\{order:2\}/);
  assert.match(experienceV3Css, /#trust/);
  assert.match(experienceV3Css, /#need/);
});

test('public role pages use the canonical premium UI shell', () => {
  for (const name of rolePages) {
    const html = fs.readFileSync(new URL(name, PUBLIC), 'utf8');
    assert.match(html, /afaghx-ui-premium-v1\.css/);
    assert.match(html, /class="afx-site-header"/);
    assert.match(html, /class="afx-search"/);
    assert.match(html, /class="afx-hero"/);
    assert.match(html, /class="afx-card-grid"/);
    assert.match(html, /<nav[^>]*>|role="navigation"[^>]*aria-label="ناوبری اصلی"/);
    assert.doesNotMatch(html, /Customer Experience|Supplier Experience|Factory Experience|Partner Experience|Business Experience|Experience Hub/);
  }
});

test('role hub preserves the established runtime contract', () => {
  const html = fs.readFileSync(new URL('roles.html', PUBLIC), 'utf8');
  assert.match(html, /مسیر تجربه خود را/);
  assert.match(html, /Canonical API/);
  assert.match(html, /role-experience\.js/);
  for (const route of ['./customer.html','./business.html','./supplier.html','./factory.html','./partner.html']) {
    assert.match(html, new RegExp(route.replace('./','\\./')));
  }
});

test('homepage uses the premium presentation layer without losing canonical runtime', () => {
  const fa = fs.readFileSync(new URL('index.html', PUBLIC), 'utf8');
  const en = fs.readFileSync(new URL('en/index.html', PUBLIC), 'utf8');
  assert.match(fa, /afaghx-ui-premium-v1\.css/);
  assert.match(en, /afaghx-ui-premium-v1\.css/);
  assert.match(fa, /<script type="module" src="\.\/home-v5\.js"><\/script>/);
  assert.match(en, /<script type="module" src="\.\.\/home-v5\.js"><\/script>/);
  assert.match(fa, /id="taxonomy-families"/);
  assert.match(fa, /class="dual-mode-card consumer"/);
  assert.match(fa, /class="dual-mode-card business"/);
  assert.match(fa, /class="dual-mode-card" href="\.\/supplier\.html"/);
  assert.match(fa, /class="dual-mode-card" href="\.\/partner\.html"/);
  assert.match(fa, /شروع با نیاز من/);
  assert.match(fa, /کشف ۳۴ سبد کالا/);
  assert.doesNotMatch(fa, /شبکه کسب‌وکار<\/a>/);
  assert.match(en, /id="taxonomy-families"/);
});

test('approved AFAGHX logo remains the canonical public asset', () => {
  assert.equal(fs.existsSync(new URL('assets/brand/afaghx-approved-logo.png', PUBLIC)), true);
});
