import { expect, test } from '@playwright/test';

// Install and offline checks stay out of smoke.spec.ts, which gates the Pages deploy and runs
// with service workers blocked.
test.use({ serviceWorkers: 'allow' });

test('the manifest is installable from the Pages sub-path', async ({ page, request }) => {
  await page.goto('./?quality=lite');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/vibe-aquarium-sim/manifest.webmanifest');

  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/manifest+json');
  const manifest = (await response.json()) as {
    start_url: string;
    scope: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  const manifestUrl = new URL(href!, page.url());
  expect(new URL(manifest.start_url, manifestUrl).pathname).toBe('/vibe-aquarium-sim/');
  expect(new URL(manifest.scope, manifestUrl).pathname).toBe('/vibe-aquarium-sim/');
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512'])
  );
  for (const icon of manifest.icons) {
    const file = await request.get(new URL(icon.src, manifestUrl).href);
    expect(file.ok(), icon.src).toBe(true);
  }
});

test('after the first visit the room boots offline', async ({ page, context }) => {
  await page.goto('./?quality=lite');
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });
  // `ready` resolves once the worker is active, which is after its precache finished.
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe('/vibe-aquarium-sim/');

  await context.setOffline(true);
  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });
  await expect(page.getByText(/\d+ fish/)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
