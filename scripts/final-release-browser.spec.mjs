import { test, expect } from "@playwright/test";

const baseUrl = process.env.PAGES_URL || "https://afaghx-afaghx.github.io/platform/";

async function assertCommon(page) {
  const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  expect(response, "production URL did not return a response").not.toBeNull();
  expect(response.status(), "production URL must return HTTP 200").toBe(200);

  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page).toHaveTitle(/AFAGHX/i);

  const logo = page.locator("img.brand-logo").first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("alt", /AFAGHX.*AFA GLOBAL HORIZON X/i);
  await expect(logo).toHaveAttribute("src", /assets\/brand\/afaghx-approved-logo\.png$/);

  const metrics = await logo.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      renderedWidth: rect.width,
      renderedHeight: rect.height,
      complete: el.complete
    };
  });

  expect(metrics.complete).toBe(true);
  expect(metrics.naturalWidth).toBe(1024);
  expect(metrics.naturalHeight).toBe(341);
  expect(metrics.renderedWidth).toBeGreaterThan(0);
  expect(metrics.renderedHeight).toBeGreaterThan(0);

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);

  await expect(page.locator("#taxonomy-count")).toContainText("۳۴");
}

test("desktop production browser runtime", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await assertCommon(page);

  const height = await page.locator("img.brand-logo").first().evaluate((el) =>
    Math.round(el.getBoundingClientRect().height)
  );
  expect(height).toBeGreaterThanOrEqual(100);
  expect(height).toBeLessThanOrEqual(110);

  await page.screenshot({
    path: "artifacts/final-release-runtime/final-release-desktop.png",
    fullPage: true
  });
});

test("mobile production browser runtime", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await assertCommon(page);

  const height = await page.locator("img.brand-logo").first().evaluate((el) =>
    Math.round(el.getBoundingClientRect().height)
  );
  expect(height).toBeGreaterThanOrEqual(64);
  expect(height).toBeLessThanOrEqual(72);

  await page.screenshot({
    path: "artifacts/final-release-runtime/final-release-mobile.png",
    fullPage: true
  });
});
