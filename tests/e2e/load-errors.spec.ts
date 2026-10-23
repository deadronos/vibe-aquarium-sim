import { expect, test } from '@playwright/test';

// Failure paths stay out of smoke.spec.ts, which gates the Pages deploy and should stay quick.

test('a failed fish download shows an error with a working Retry', async ({ page }) => {
  let blocked = true;
  await page.route('**/*.glb', (route) => (blocked ? route.abort() : route.continue()));
  await page.goto('./?quality=lite');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('The fish did not arrive', { timeout: 30_000 });
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
