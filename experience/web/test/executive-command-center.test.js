import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createServer } from '../server.js';

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
  assert.equal(views.length, 28); // 24 navigation entries + 4 contextual drill-down links
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

test('static Experience server serves the executive preview at /admin/', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/admin/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  const body = await response.text();
  assert.match(body, /AFAGHX/);
  assert.match(body, /داده عملیاتی متصل نیست/);
});

test('executive preview never renders fabricated performance chart bars', () => {
  assert.doesNotMatch(html, /class="chart-placeholder"/);
  assert.doesNotMatch(css, /\.chart-placeholder/);
  assert.match(html, /class="performance-empty-icon"/);
  assert.match(html, /داده عملکردی در دسترس نیست/);
});

test('Persian and English translation covers navigation groups and key dashboard labels', () => {
  assert.match(js, /navGroups:\["GOVERNANCE & STRUCTURE","COMMERCIAL COMMAND","INTELLIGENCE & CONTROL"\]/);
  assert.match(js, /kpiLabels:\["Geographic coverage","Organization structure","Commercial performance"/);
  assert.match(js, /scopeOptions:\["Global · Entire ecosystem"/);
  assert.match(js, /document\.documentElement\.dir = english \? "ltr" : "rtl"/);
  assert.match(js, /healthItems:\["API Gateway","AFX-CORE","Database"/);
});
