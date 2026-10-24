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
  // step below fast-forwards on purpose. pauseAt jumps the clock to its target, firing any
  // timers due on the way, and refuses a time in the past, so the target is a little ahead.
  // While paused, requestAnimationFrame is frozen too: nothing renders until resume below.
  const pausedAt = (await page.evaluate(() => Date.now())) + 3000;
  await page.clock.pauseAt(pausedAt);

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

  // Let the scene render again so render-path errors from Feed, the viewpoints and the clock
  // modes surface before the error check. In Day cycle mode the hour moves a few minutes per
  // real second, and it is published from the frame loop, so a change proves frames are drawn.
  await page.clock.resume();
  const hour = page.locator('.hud__hour');
  const hourBefore = await hour.textContent();
  await expect(hour).not.toHaveText(hourBefore ?? '', { timeout: 30_000 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 0;
        const tick = () => (++frames >= 10 ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      })
  );

  // Lite never mounts the post stack, so those chunks must stay unrequested for the whole visit.
  expect(
    scriptPaths.filter((pathname) => /\/(postprocessing|Effects)-[^/]+\.js$/.test(pathname))
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test('high quality loads the post stack and keeps the room', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const chunk = (name: 'postprocessing' | 'Effects') =>
    page.waitForResponse((response) =>
      new RegExp(`/${name}-[^/]+\\.js$`).test(new URL(response.url()).pathname)
    );
  const post = chunk('postprocessing');
  const effects = chunk('Effects');
  await page.goto('./');
  expect((await post).ok()).toBe(true);
  expect((await effects).ok()).toBe(true);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'High quality' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.hud__notice')).toHaveCount(0);
  expect(errors).toEqual([]);
});
