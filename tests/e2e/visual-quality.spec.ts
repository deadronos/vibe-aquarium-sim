import { expect, test, type Page } from '@playwright/test';

const levels = ['low', 'medium', 'high', 'ultra'] as const;

async function waitForRenderedFish(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__vibe_fishAssetStatus), {
      timeout: 45_000,
    })
    .toEqual({ primary: 'ready', variants: ['ready', 'ready'] });
  await expect
    .poll(() => page.evaluate(() => window.__vibe_renderStatus?.activeEntities), {
      timeout: 20_000,
    })
    .toBe(30);
  // Asset readiness is published in effects; allow the GPU scene to paint too.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

for (const backend of ['webgl', 'webgpu'] as const) {
  test.describe(`${backend} visual quality`, () => {
    test.setTimeout(120_000);

    for (const level of levels) {
      test(`${level} has ready desktop and phone artifacts`, async ({ page }, testInfo) => {
        const errors = new Set<string>();
        page.on('pageerror', (error) => errors.add(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.add(message.text());
        });
        page.on('response', (response) => {
          if (response.status() >= 400) errors.add(`${response.status()} ${response.url()}`);
        });
        await page.addInitScript(() => {
          window.__vibe_debug = { simulateStep: [], fishRender: [], fishUseFrame: [] };
        });
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto(`./index.html?renderer=${backend}&quality=${level}`, {
          waitUntil: 'domcontentloaded',
        });
        await expect
          .poll(() => page.evaluate(() => window.__vibe_rendererStatus?.selected), {
            timeout: 30_000,
          })
          .toBe(backend);
        expect(await page.evaluate(() => window.__vibe_rendererStatus?.fallback)).toBe(false);
        if (backend === 'webgpu') {
          await testInfo.attach('webgpu-adapter', {
            body: JSON.stringify(
              await page.evaluate(async () => {
                const adapter = await navigator.gpu.requestAdapter();
                if (!adapter) return null;
                const { vendor, architecture, device, description } = adapter.info;
                return { vendor, architecture, device, description };
              }),
              null,
              2
            ),
            contentType: 'application/json',
          });
        }
        await waitForRenderedFish(page);

        for (const viewport of [
          { name: 'desktop', width: 1200, height: 800 },
          { name: 'phone', width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await waitForRenderedFish(page);
          await expect
            .poll(() => page.evaluate(() => window.__vibe_qualityStatus?.level))
            .toBe(level);
          const qualityStatus = await page.evaluate(() => window.__vibe_qualityStatus);
          expect(qualityStatus?.tankTransmissionEnabled).toBe(false);
          if (backend === 'webgpu') {
            expect(typeof qualityStatus?.softwareWebGPU).toBe('boolean');
          }
          const name = `${backend}-${level}-${viewport.name}`;
          const path = testInfo.outputPath(`${name}.png`);
          await page.screenshot({ path, timeout: 30_000 });
          await testInfo.attach(name, { path, contentType: 'image/png' });
          await testInfo.attach(`${name}-status`, {
            body: JSON.stringify(
              await page.evaluate(() => ({
                renderer: window.__vibe_rendererStatus,
                quality: window.__vibe_qualityStatus,
                assets: window.__vibe_fishAssetStatus,
                render: window.__vibe_renderStatus,
              })),
              null,
              2
            ),
            contentType: 'application/json',
          });
        }
        expect([...errors]).toEqual([]);
      });
    }
  });
}
