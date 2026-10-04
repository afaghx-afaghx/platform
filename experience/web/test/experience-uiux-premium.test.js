import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PUBLIC = new URL('../public/', import.meta.url);
const premiumCss = fs.readFileSync(new URL('afaghx-ui-premium-v1.css', PUBLIC), 'utf8');
const rolePages = ['roles.html','customer.html','supplier.html','factory.html','partner.html','business.html'];

test('premium public Experience design system is present', () => {
  assert.match(premiumCss, /--afx-navy:#071b2e/);
  assert.match(premiumCss, /--afx-blue:#1769d5/);
  assert.match(premiumCss, /\.afx-hero-grid/);
  assert.match(premiumCss, /\.afx-card-grid/);
  assert.match(premiumCss, /@media\(max-width:680px\)/);
  assert.match(premiumCss, /prefers-reduced-motion/);
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
  assert.match(en, /id="taxonomy-families"/);
});

test('approved AFAGHX logo remains the canonical public asset', () => {
  assert.equal(fs.existsSync(new URL('assets/brand/afaghx-approved-logo.png', PUBLIC)), true);
});
