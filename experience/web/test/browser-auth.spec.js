import { test, expect } from '@playwright/test';

test('real browser login reaches dashboard and logout returns to login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ورود به AFAGHX' })).toBeVisible();
  await page.getByLabel('ایمیل').fill(process.env.AFAGHX_BOOTSTRAP_EMAIL);
  await page.getByLabel('رمز عبور').fill(process.env.AFAGHX_BOOTSTRAP_PASSWORD);
  await page.getByRole('button', { name: 'ورود' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/کاربر:/)).toBeVisible();
  await page.getByRole('button', { name: /خروج/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'ورود به AFAGHX' })).toBeVisible();
});
