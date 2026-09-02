import { expect, test, type Page } from '@playwright/test';

// Renderer initialization includes dynamic imports and GPU capability probing;
// allow slower CI runners enough time to report the final backend without
// treating a healthy but delayed startup as a flaky test.
test.setTimeout(60_000);

async function expectHealthyAquarium(page: Page, path = './') {
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 404) failedResponses.push(response.url());
  });

  await page.goto(path, { waitUntil: 'networkidle' });
  await expect(page.getByText('Fish', { exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });

  return { pageErrors, failedResponses };
}

test('boots the aquarium shell and selects the stable WebGL renderer', async ({ page }) => {
  const { pageErrors, failedResponses } = await expectHealthyAquarium(page);

  await expect
    .poll(() => page.evaluate(() => window.__vibe_rendererStatus?.selected), {
      timeout: 20_000,
    })
    .toBe('webgl');

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);

  await expect
    .poll(() =>
      page.evaluate(async () => (await fetch('Copilot3D-fish.glb')).headers.get('content-type'))
    )
    .toBe('model/gltf-binary');
});

test('falls back cleanly when WebGPU is explicitly requested but unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
  });

  const { pageErrors, failedResponses } = await expectHealthyAquarium(
    page,
    './index.html?renderer=webgpu'
  );

  await expect
    .poll(() => page.evaluate(() => window.__vibe_rendererStatus?.selected), {
      timeout: 20_000,
    })
    .toBe('webgl');
  await expect
    .poll(() => page.evaluate(() => window.__vibe_rendererStatus?.fallback), {
      timeout: 20_000,
    })
    .toBe(true);

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
