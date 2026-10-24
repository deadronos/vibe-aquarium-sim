import { expect, type Page, type Response, test } from '@playwright/test';

// Failure paths stay out of smoke.spec.ts, which gates the Pages deploy and should stay quick.

const postChunkUrl = /\/(Effects|postprocessing)-[^/]+\.js$/;

const isPostChunk = (url: string) => postChunkUrl.test(new URL(url).pathname);

/** Stale deploys and dropped responses 404 the hashed post-processing chunks. */
const blockPostStack = async (page: Page) => {
  let hits = 0;
  await page.route(postChunkUrl, (route) => {
    hits += 1;
    return route.fulfill({
      status: 404,
      contentType: 'text/plain',
      headers: { 'cache-control': 'no-store' },
      body: 'missing chunk',
    });
  });
  return {
    hits: () => hits,
    unblock: () => page.unroute(postChunkUrl),
  };
};

const postChunkResponse = (status: number) => (response: Response) =>
  isPostChunk(response.url()) && response.status() === status;

/** The quality control is on screen, but the page does not scroll and Playwright will not click it. */
const switchQuality = (page: Page) =>
  page.evaluate(() => {
    const button = document.querySelector('button[title="Rendering quality"]');
    if (!(button instanceof HTMLButtonElement)) throw new Error('quality button missing');
    button.click();
  });

/** The room finished drawing and the crash veil did not replace it. */
const expectRoomKeptDrawing = async (page: Page) => {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });
  await expect(page.getByText(/\d+ fish/)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lite' })).toBeVisible();
};

test('a failed fish download shows an error with a working Retry', async ({ page }) => {
  // The failed fetch is reported within a couple of seconds, but software GL can block the
  // main thread long enough that React commits the alert after a 30s expect has given up.
  test.setTimeout(240_000);
  let blocked = true;
  await page.route('**/*.glb', (route) => (blocked ? route.abort() : route.continue()));
  await page.goto('./?quality=lite');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('The fish did not arrive', { timeout: 90_000 });
  await expect(page.locator('.loading')).not.toHaveClass(/loading--done/);

  blocked = false;
  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(alert).toBeHidden();
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });
});

test('a browser without WebGL gets an explanation instead of a canvas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
      const [type] = args;
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return original.apply(this, args as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto('./?quality=lite');

  await expect(page.getByRole('alert')).toContainText('needs WebGL');
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('a lost graphics context is explained and recovers on restore', async ({ page }) => {
  await page.goto('./?quality=lite');
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });

  await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) throw new Error('WEBGL_lose_context unavailable');
    (window as unknown as { loseExt: WEBGL_lose_context }).loseExt = ext;
    ext.loseContext();
  });
  await expect(page.getByRole('alert')).toContainText('graphics were reset');

  await page.evaluate(() =>
    (window as unknown as { loseExt: WEBGL_lose_context }).loseExt.restoreContext()
  );
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.locator('.loading')).toHaveClass(/loading--done/);
});

test('a missing post-processing chunk on boot falls back to Lite', async ({ page }) => {
  const blocked = await blockPostStack(page);
  const missing = page.waitForResponse(postChunkResponse(404));
  await page.goto('./');
  expect((await missing).status()).toBe(404);
  expect(blocked.hits()).toBeGreaterThan(0);
  await expectRoomKeptDrawing(page);
});

test('switching to High survives a missing post-processing chunk', async ({ page }) => {
  const blocked = await blockPostStack(page);
  await page.goto('./?quality=lite');
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'Lite' })).toBeVisible();

  const missing = page.waitForResponse(postChunkResponse(404));
  await switchQuality(page);
  expect((await missing).status()).toBe(404);
  expect(blocked.hits()).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Lite' })).toBeVisible();
  await expectRoomKeptDrawing(page);
});

test('a later switch to High retries the post-processing download', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const blocked = await blockPostStack(page);
  await page.goto('./?quality=lite');
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });

  const missingEffects = page.waitForResponse(
    (response) =>
      postChunkResponse(404)(response) && new URL(response.url()).pathname.includes('/Effects-')
  );
  const missingPost = page.waitForResponse(
    (response) =>
      postChunkResponse(404)(response) &&
      new URL(response.url()).pathname.includes('/postprocessing-')
  );
  await switchQuality(page);
  expect((await missingEffects).status()).toBe(404);
  expect((await missingPost).status()).toBe(404);
  await expect(page.getByRole('button', { name: 'Lite' })).toBeVisible();

  await blocked.unblock();
  const retried = (file: 'Effects' | 'postprocessing') => (response: Response) => {
    const url = new URL(response.url());
    return response.ok() && url.searchParams.has('retry') && url.pathname.includes(`/${file}-`);
  };
  const effects = page.waitForResponse(retried('Effects'));
  const post = page.waitForResponse(retried('postprocessing'));
  // The retried responses are the proof. On a slow GPU, PerformanceMonitor can drop back
  // to Lite once the post shaders compile, without another chunk error.
  const becameHigh = page
    .getByRole('button', { name: 'High quality' })
    .waitFor({ timeout: 15_000 });
  const consoleCount = consoleErrors.length;
  const pageErrorCount = pageErrors.length;
  await switchQuality(page);
  await becameHigh;
  expect((await effects).ok()).toBe(true);
  expect((await post).ok()).toBe(true);
  expect(pageErrors.slice(pageErrorCount)).toEqual([]);
  expect(consoleErrors.slice(consoleCount)).toEqual([]);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
