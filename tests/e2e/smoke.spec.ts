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

test('critical fish model loads before deferred variants', async ({ page }) => {
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];
  const fishRequestUrls: string[] = [];
  const fishResponses: Array<{ url: string; status: number }> = [];
  const fishRequestFailures: Array<{ url: string; error: string | null }> = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 404) failedResponses.push(response.url());
    if (new URL(response.url()).pathname.endsWith('.glb'))
      fishResponses.push({ url: response.url(), status: response.status() });
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('.glb')) fishRequestUrls.push(request.url());
  });
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).pathname.endsWith('.glb'))
      fishRequestFailures.push({ url: request.url(), error: request.failure()?.errorText ?? null });
  });

  await page.goto('./', { waitUntil: 'domcontentloaded' });

  await expect.poll(() => fishRequestUrls.length).toBeGreaterThan(0);
  expect(new URL(fishRequestUrls[0]!).pathname).toMatch(/\/Copilot3D-fish\.glb$/);

  await expect
    .poll(() => page.evaluate(() => window.__vibe_fishAssetStatus?.primary), {
      timeout: 20_000,
    })
    .toBe('ready');
  try {
    await expect
      .poll(() => page.evaluate(() => window.__vibe_fishAssetStatus?.variants), {
        timeout: 20_000,
      })
      .toEqual(['ready', 'ready']);
  } catch (error) {
    const diagnostics = await page.evaluate(
      ({ responses, requestFailures }) => ({
        status: window.__vibe_fishAssetStatus,
        glbResources: performance
          .getEntriesByType('resource')
          .filter((entry) => entry.name.endsWith('.glb'))
          .map((entry) => {
            const resource = entry as PerformanceResourceTiming;
            return {
              name: resource.name,
              duration: resource.duration,
              transferSize: resource.transferSize,
              encodedBodySize: resource.encodedBodySize,
            };
          }),
        responses,
        requestFailures,
      }),
      { responses: fishResponses, requestFailures: fishRequestFailures }
    );
    console.log(`Fish asset diagnostics: ${JSON.stringify(diagnostics)}`);
    throw error;
  }
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test('applies the low-quality stress profile to a bounded larger school', async ({ page }) => {
  const { pageErrors, failedResponses } = await expectHealthyAquarium(
    page,
    './index.html?quality=low&stress=quality'
  );

  await expect
    .poll(() => page.evaluate(() => window.__vibe_qualityStatus?.level), {
      timeout: 20_000,
    })
    .toBe('low');
  await expect
    .poll(() => page.evaluate(() => window.__vibe_qualityStatus?.fishCount ?? 0), {
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(300);

  const status = await page.evaluate(() => window.__vibe_qualityStatus);
  expect(status?.causticsEnabled).toBe(false);
  expect(status?.fishRimLightingEnabled).toBe(false);
  expect(status?.fishSubsurfaceScatteringEnabled).toBe(false);
  expect(status?.spotLightShadowsEnabled).toBe(false);
  expect(status?.tankTransmissionEnabled).toBe(false);
  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test('uses a non-isolated worker transport without overlapping jobs', async ({ page }) => {
  const { pageErrors, failedResponses } = await expectHealthyAquarium(page);

  await expect
    .poll(() => page.evaluate(() => window.__vibe_transportStatus?.mode), {
      timeout: 20_000,
    })
    .toMatch(/^(transfer|copy)$/);
  await expect
    .poll(() => page.evaluate(() => window.__vibe_transportStatus?.submitted ?? 0), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);

  const status = await page.evaluate(() => window.__vibe_transportStatus);
  expect(status?.isolationSupported).toBe(false);
  expect(status?.overlapCount).toBe(0);
  expect(status?.completed).toBeLessThanOrEqual(status?.submitted ?? 0);
  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
