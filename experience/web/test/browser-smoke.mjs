import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.AFAGHX_BASE_URL || 'http://127.0.0.1:3000/';
const evidenceDir = new URL('../test-artifacts/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const scriptResponses = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));
page.on('response', (response) => {
  if (/\.m?js(?:\?|$)/.test(response.url())) scriptResponses.push({ status: response.status(), url: response.url() });
});

try {
  const response = await page.goto(baseURL, { waitUntil: 'load', timeout: 20000 });
  assert.ok(response && response.ok(), `Homepage did not return a successful response: ${response?.status()}`);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  const locationButton = page.locator('#afx-location');
  const languageButton = page.locator('#afx-language-switch');
  const statusRegion = page.locator('#afx-header-status');

  await locationButton.waitFor({ state: 'visible', timeout: 10000 });
  await languageButton.waitFor({ state: 'visible', timeout: 10000 });
  await statusRegion.waitFor({ state: 'attached', timeout: 10000 });
  assert.equal(await statusRegion.getAttribute('role'), 'status');
  assert.equal(await statusRegion.getAttribute('aria-live'), 'polite');
  assert.match(await languageButton.innerText(), /نسخه انگلیسی/);

  await page.screenshot({ path: new URL('homepage-persian.png', evidenceDir), fullPage: true });
  await languageButton.click();
  await page.waitForURL((url) => url.pathname === '/en/' || url.pathname.endsWith('/en/index.html'), { timeout: 10000 });

  await page.locator('#afx-location').waitFor({ state: 'visible', timeout: 10000 });
  const englishLanguageButton = page.locator('#afx-language-switch');
  await englishLanguageButton.waitFor({ state: 'visible', timeout: 10000 });
  assert.match(await englishLanguageButton.innerText(), /Switch to Persian version/);
  assert.match(await page.locator('#afx-location').getAttribute('aria-label'), /Enable location/);
  await page.screenshot({ path: new URL('homepage-english.png', evidenceDir), fullPage: true });

  await englishLanguageButton.click();
  await page.waitForURL((url) => url.pathname.endsWith('/index.html') && !url.pathname.includes('/en/'), { timeout: 10000 });
  await page.locator('#afx-language-switch').waitFor({ state: 'visible', timeout: 10000 });
  assert.match(await page.locator('#afx-language-switch').innerText(), /نسخه انگلیسی/);

  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join('; ')}`);
  assert.deepEqual(failedRequests, [], `Failed browser requests: ${JSON.stringify(failedRequests)}`);
  assert.ok(scriptResponses.length > 0 && scriptResponses.every((item) => item.status < 400),
    `JavaScript responses missing or failing: ${JSON.stringify(scriptResponses)}`);
  console.log(JSON.stringify({
    result: 'PASS',
    baseURL,
    checks: [
      'Persian homepage loads',
      'Location button is visible',
      'Language switch is visible',
      'Accessible live status region exists',
      'Persian to English navigation works',
      'English controls render',
      'English to Persian navigation works',
      'No uncaught page errors',
      'No browser console errors',
      'No failed network requests',
      'JavaScript assets return successful responses'
    ],
    scriptResponses,
    screenshots: ['homepage-persian.png', 'homepage-english.png']
  }, null, 2));
} catch (error) {
  await page.screenshot({ path: new URL('browser-smoke-failure.png', evidenceDir), fullPage: true }).catch(() => {});
  console.error(error);
  console.error(JSON.stringify({ pageErrors, consoleErrors, failedRequests, scriptResponses, pageUrl: page.url() }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
