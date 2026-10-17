import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const baseURL = process.env.AFAGHX_BASE_URL || 'http://127.0.0.1:3000/';
const evidenceDir = fileURLToPath(new URL('../test-artifacts/', import.meta.url));

async function verifyTaxonomyImages(page, locale) {
  const images = page.locator('#taxonomy-families img');
  const count = await images.count();
  assert.equal(count, 34, `Expected 34 taxonomy basket images in ${locale}; got ${count}`);
  const cards = page.locator('#taxonomy-families .family-row-item');
  assert.equal(await cards.count(), 34, `Expected 34 interactive basket cards in ${locale}`);
  const labels = await cards.evaluateAll((items) => items.map((card) => {
    const label = card.querySelector('strong');
    if (!label) return { text: '', visible: false, reason: 'missing-label' };
    const rect = label.getBoundingClientRect();
    const style = getComputedStyle(label);
    return {
      text: label.textContent.trim(),
      visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
        style.visibility !== 'hidden' && Number(style.opacity) > 0,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }));
  const unreadable = labels.filter((label) => !label.text || !label.visible || label.width < 35 || label.height < 10);
  assert.deepEqual(unreadable, [], `Basket labels are missing or not visibly laid out in ${locale}: ${JSON.stringify(unreadable)}`);

  // Force all lazy images to load before a full-page screenshot; otherwise
  // Chromium screenshots can preserve visually empty lazy-loaded grid rows.
  await images.evaluateAll((items) => {
    for (const image of items) {
      image.loading = 'eager';
      image.fetchPriority = 'high';
    }
  });
  await page.waitForFunction(() => {
    const items = [...document.querySelectorAll('#taxonomy-families img')];
    return items.length === 34 && items.every((image) => image.complete);
  }, undefined, { timeout: 15000 });

  const loaded = await images.evaluateAll((items) => items.map((image) => ({
    src: image.currentSrc || image.src,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight
  })));
  const broken = loaded.filter((image) => image.naturalWidth <= 0 || image.naturalHeight <= 0);
  assert.deepEqual(broken, [], `Broken taxonomy basket images in ${locale}: ${JSON.stringify(broken)}`);
  return loaded;
}
await mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const infrastructureFailures = [];
const badResponses = [];
const scriptResponses = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  const failure = { url: request.url(), error: request.failure()?.errorText || 'unknown' };
  // A DNS failure for the configured production API is an infrastructure finding,
  // not evidence that the local UI is broken. Record it explicitly; never mock it.
  if (new URL(request.url()).hostname === 'api.afaghx.com' && failure.error.includes('ERR_NAME_NOT_RESOLVED')) {
    infrastructureFailures.push(failure);
  } else {
    failedRequests.push(failure);
  }
});
page.on('response', (response) => {
  if (/\.m?js(?:\?|$)/.test(response.url())) scriptResponses.push({ status: response.status(), url: response.url(), contentType: response.headers()['content-type'] || '' });
  if (response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() });
});

try {
  const response = await page.goto(baseURL, { waitUntil: 'load', timeout: 20000 });
  assert.ok(response && response.ok(), `Homepage did not return a successful response: ${response?.status()}`);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const persianBasketImages = await verifyTaxonomyImages(page, 'Persian');

  const locationButton = page.locator('#afx-location');
  const languageSelect = page.locator('#afx-language-select');
  const statusRegion = page.locator('#afx-header-status');

  await locationButton.waitFor({ state: 'visible', timeout: 10000 });
  await languageSelect.waitFor({ state: 'visible', timeout: 10000 });
  await statusRegion.waitFor({ state: 'attached', timeout: 10000 });
  assert.equal(await statusRegion.getAttribute('role'), 'status');
  assert.equal(await statusRegion.getAttribute('aria-live'), 'polite');
  assert.equal(await languageSelect.inputValue(), 'fa');

  await page.screenshot({ path: join(evidenceDir, 'homepage-persian.png'), fullPage: true });
  await languageSelect.selectOption('en');
  await page.waitForURL((url) => url.pathname === '/en/' || url.pathname.endsWith('/en/index.html'), { timeout: 10000 });

  const englishLocation = page.locator('#afx-location');
  const englishLanguageSelect = page.locator('#afx-language-select');
  await englishLocation.waitFor({ state: 'visible', timeout: 10000 });
  await englishLanguageSelect.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await englishLanguageSelect.inputValue(), 'en');
  assert.match(await englishLocation.getAttribute('aria-label'), /Enable location/);
  const englishBasketImages = await verifyTaxonomyImages(page, 'English');
  await page.screenshot({ path: join(evidenceDir, 'homepage-english.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await englishLocation.waitFor({ state: 'visible', timeout: 10000 });
  await englishLanguageSelect.waitFor({ state: 'visible', timeout: 10000 });
  const mobileLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  assert.ok(mobileLayout.documentWidth <= mobileLayout.viewportWidth + 1,
    `Mobile homepage has horizontal document overflow: ${JSON.stringify(mobileLayout)}`);
  await page.screenshot({ path: join(evidenceDir, 'homepage-mobile.png'), fullPage: false });

  await englishLanguageSelect.selectOption('fa');
  await page.waitForURL((url) => !url.pathname.includes('/en/'), { timeout: 10000 });
  await page.locator('#afx-language-select').waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await page.locator('#afx-language-select').inputValue(), 'fa');

  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join('; ')}`);
  // Chromium emits a generic console error for each failed resource, without its URL.
  // Exclude only the exact count matched to the explicitly recorded API DNS failures.
  const remainingConsoleErrors = [...consoleErrors];
  for (let i = 0; i < infrastructureFailures.length; i++) {
    const genericIndex = remainingConsoleErrors.findIndex((entry) => /Failed to load resource: net::ERR_NAME_NOT_RESOLVED/.test(entry));
    if (genericIndex >= 0) remainingConsoleErrors.splice(genericIndex, 1);
  }
  assert.deepEqual(remainingConsoleErrors, [], `Unexpected browser console errors: ${remainingConsoleErrors.join('; ')}`);
  assert.deepEqual(failedRequests, [], `Unexpected failed browser requests: ${JSON.stringify(failedRequests)}`);
  assert.deepEqual(badResponses, [], `HTTP error responses: ${JSON.stringify(badResponses)}`);
  assert.ok(scriptResponses.length > 0, 'No JavaScript assets were observed');
  assert.ok(scriptResponses.every((item) => item.status < 400 && /javascript|ecmascript/i.test(item.contentType)),
    `JavaScript assets have failing status or invalid MIME type: ${JSON.stringify(scriptResponses)}`);
  const requireApi = process.env.AFAGHX_REQUIRE_API === 'true';
  // Local UI tests may report an infrastructure warning; a production runtime
  // check must fail closed if the real API hostname cannot resolve.
  if (requireApi) {
    assert.equal(
      infrastructureFailures.length,
      0,
      `Production API gate failed: ${infrastructureFailures.length} request(s) to api.afaghx.com did not resolve. No API behavior was mocked.`
    );
  }
  console.log(JSON.stringify({
    result: infrastructureFailures.length ? 'PASS_WITH_INFRASTRUCTURE_WARNING' : 'PASS',
    requiredApiGate: requireApi,
    baseURL,
    checks: [
      'Persian homepage loads',
      'Location button is visible',
      'Canonical language selector is visible',
      'Accessible live status region exists',
      'Persian to English navigation works',
      'English controls render',
      'English to Persian navigation works',
      'No uncaught page errors',
      'No uncaught browser console errors after correlating exact API DNS failures',
      'No unexpected failed network requests',
      'No HTTP error responses',
      'JavaScript assets use a JavaScript MIME type'
    ],
    scriptResponses,
    taxonomyImageChecks: { persian: persianBasketImages.length, english: englishBasketImages.length, result: 'PASS' },
    mobileLayout,
    infrastructureFailures,
    infrastructureStatus: infrastructureFailures.length ? 'BLOCKED: api.afaghx.com DNS unresolved; not mocked and not considered API health proof' : 'No API DNS failure observed in this run',
    unexpectedConsoleErrors: remainingConsoleErrors,
    unexpectedFailedRequests: failedRequests,
    screenshots: ['homepage-persian.png', 'homepage-english.png']
  }, null, 2));
} catch (error) {
  await page.screenshot({ path: join(evidenceDir, 'browser-smoke-failure.png'), fullPage: true }).catch(() => {});
  console.error(error);
  console.error(JSON.stringify({ pageErrors, consoleErrors, failedRequests, badResponses, scriptResponses, pageUrl: page.url() }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
