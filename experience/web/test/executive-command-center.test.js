import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../public/admin/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/admin/executive.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../public/admin/executive.js', import.meta.url), 'utf8');

test('executive preview exposes all 24 planned workspaces', () => {
  const views = [...html.matchAll(/data-view="([^"]+)"/g)].map((match) => match[1]);
  const navViews = [...html.matchAll(/class="nav-item(?: active)?"[^>]*data-view="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(navViews.length, 24);
  assert.equal(new Set(navViews).size, 24);
  assert.ok(navViews.includes('overview'));
  assert.ok(navViews.includes('geography'));
  assert.ok(navViews.includes('workforce'));
  assert.ok(navViews.includes('marketing'));
  assert.ok(navViews.includes('finance'));
  assert.ok(navViews.includes('security'));
  assert.equal(views.length, 27); // 24 navigation entries + 3 contextual drill-down links
});

test('preview is explicit about missing live data and never fabricates KPI values', () => {
  assert.match(html, /داده عملیاتی متصل نیست/);
  assert.match(html, /DESIGN PREVIEW/);
  assert.equal((html.match(/class="kpi-value">—<\/div>/g) || []).length, 6);
  assert.match(html, /نامشخص/);
  assert.doesNotMatch(js, /\bfetch\s*\(/);
  assert.doesNotMatch(js, /XMLHttpRequest|localStorage|sessionStorage/);
});

test('preview provides accessible navigation and bilingual document direction', () => {
  assert.match(html, /id="main-content"/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label="ناوبری مرکز فرماندهی"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(js, /document\.documentElement\.dir = english \? "ltr" : "rtl"/);
  assert.match(js, /Escape/);
});

test('responsive styles include desktop, tablet and mobile breakpoints', () => {
  assert.match(css, /@media\(max-width:1400px\)/);
  assert.match(css, /@media\(max-width:1050px\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:420px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test('executive interaction script parses without executing browser APIs', () => {
  assert.doesNotThrow(() => new vm.Script(js));
});
