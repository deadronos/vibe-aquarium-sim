import { expect, test } from '@playwright/test';

// A desktop with a touchscreen, so the HUD can be driven by both mouse hover and taps.
test.use({ hasTouch: true });

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
  // step below fast-forwards on purpose. The target is a little ahead: the fake clock keeps
  // running until pauseAt lands, and pauseAt refuses a time in the past.
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

  // The idle steps fast-forward past the HUD's seven seconds instead of waiting them out.
  const hud = page.locator('.hud');
  const centre = async (name: RegExp) => {
    const box = await page.getByRole('radio', { name }).boundingBox();
    if (!box) throw new Error(`${name} viewpoint button has no box`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  // A mouse resting on a bar button keeps the bar awake, so the next click presses it.
  const room = page.getByRole('radio', { name: /Room/ });
  const roomAt = await centre(/Room/);
  await page.mouse.move(roomAt.x, roomAt.y);
  await page.clock.fastForward(8000);
  await expect(hud).toHaveAttribute('data-idle', 'false');
  await page.mouse.down();
  await page.mouse.up();
  await expect(room).toHaveAttribute('aria-checked', 'true');

  // Keyboard focus inside the bar keeps it awake too, with the mouse off the bar.
  await page.mouse.move(400, 300);
  await room.focus();
  await page.keyboard.press('Shift+Tab');
  await page.clock.fastForward(8000);
  await expect(hud).toHaveAttribute('data-idle', 'false');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.clock.fastForward(8000);
  await expect(hud).toHaveAttribute('data-idle', 'true');

  // Touch has no hover: the first tap on the faded bar only wakes it. It lands on the bar, not
  // the canvas, and does not press the control underneath.
  const close = page.getByRole('radio', { name: /Up close/ });
  const closeAt = await centre(/Up close/);
  const hitsBar = await page.evaluate(
    ([px, py]) => Boolean(document.elementFromPoint(px, py)?.closest('.hud__bar')),
    [closeAt.x, closeAt.y]
  );
  expect(hitsBar).toBe(true);
  await page.touchscreen.tap(closeAt.x, closeAt.y);
  await expect(hud).toHaveAttribute('data-idle', 'false');
  await expect(close).toHaveAttribute('aria-checked', 'false');

  // Awake again, the same control works.
  await page.touchscreen.tap(closeAt.x, closeAt.y);
  await expect(close).toHaveAttribute('aria-checked', 'true');

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
