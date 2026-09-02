import { expect, test } from '@playwright/test';

test('boots the aquarium shell and selects the stable WebGL renderer', async ({ page }) => {
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 404) failedResponses.push(response.url());
  });

  await page.goto('./', { waitUntil: 'networkidle' });
  await expect(page.getByText('Fish', { exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });

  await expect
    .poll(() => page.evaluate(() => window.__vibe_rendererStatus?.selected), {
      timeout: 20_000,
    })
    .toBe('webgl');

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
