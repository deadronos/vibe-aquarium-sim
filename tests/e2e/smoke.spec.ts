import { expect, test } from '@playwright/test';

test('the living room boots, renders and feeds the fish', async ({ page }) => {
  const errors: string[] = [];
  const scriptPaths: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('.js')) scriptPaths.push(pathname);
  });
  page.on('console', (message) => {
    // Surface browser warnings in the CI log so a stalled boot is diagnosable.
    if (message.type() === 'warning' || message.type() === 'error') {
      console.log(`[browser ${message.type()}] ${message.text()}`);
    }
    if (message.type() === 'error') errors.push(message.text());
  });

  // A controllable clock lets the HUD idle timer be skipped instead of waited out.
  await page.clock.install();
  // Lite skips the post-processing shaders, which software GL on CI compiles very slowly.
  await page.goto('./?quality=lite');
  await expect(page.locator('canvas')).toBeVisible();
  // The loading veil lifts once the fish models are in and the first frames have compiled.
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });
  await expect(page.getByText(/\d+ fish/)).toBeVisible();

  // Boot on software GL is longer than the HUD's 7s idle timer, and the click actionability
  // check can be too. Once the bar is idle its controls ignore hits, so Playwright reports the
  // bar itself as intercepting. Freeze the clock so the bar cannot fade again until the idle
  // step below fast-forwards on purpose. `Date.now` here is the fake clock.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()));

  await page.mouse.move(400, 300);
  await page.getByRole('button', { name: 'Feed' }).click();
  await page.getByRole('radio', { name: /Tank/ }).click();
  await expect(page.getByRole('radio', { name: /Tank/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: /Day cycle/ }).click();
  await expect(page.getByRole('radio', { name: /Day cycle/ })).toHaveAttribute(
    'aria-checked',
    'true'
  );

  // Let the HUD go idle without waiting the real seven seconds. The pointer is parked on the
  // Room button first so the tap below arrives without a pointermove, like a finger on glass.
  const hud = page.locator('.hud');
  const room = page.getByRole('radio', { name: /Room/ });
  const box = await room.boundingBox();
  if (!box) throw new Error('Room viewpoint button has no box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.clock.fastForward(8000);
  await expect(hud).toHaveAttribute('data-idle', 'true');

  // The first tap on the faded bar only wakes it: it lands on the bar, not the canvas, and does
  // not press the control underneath.
  const hitsBar = await page.evaluate(
    ([px, py]) => Boolean(document.elementFromPoint(px, py)?.closest('.hud__bar')),
    [x, y]
  );
  expect(hitsBar).toBe(true);
  await page.mouse.down();
  await page.mouse.up();
  await expect(hud).toHaveAttribute('data-idle', 'false');
  await expect(room).toHaveAttribute('aria-checked', 'false');

  // Awake again, the same control works.
  await room.click();
  await expect(room).toHaveAttribute('aria-checked', 'true');

  // Lite never mounts the post stack, so those chunks must stay unrequested for the whole visit.
  expect(
    scriptPaths.filter((pathname) => /\/(postprocessing|Effects)-[^/]+\.js$/.test(pathname))
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test('high quality loads the post stack and keeps the room', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const postStack = page.waitForResponse((response) =>
    /\/(postprocessing|Effects)-[^/]+\.js$/.test(new URL(response.url()).pathname)
  );
  await page.goto('./');
  expect((await postStack).ok()).toBe(true);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'High quality' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});
