import { expect, test } from '@playwright/test';

// A phone that asks for reduced motion. The HUD is DOM, so the room does not need to finish
// loading for this check.
test.use({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
});

test('the phone bar fits in two rows of 44px targets and skips the fade', async ({ page }) => {
  // The `reducedMotion` context option does not reach this Chromium; emulating the media does.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?quality=lite');
  const hud = page.locator('.hud');
  await expect(hud).toHaveAttribute('data-motion', 'reduced');

  const bar = page.locator('.hud__bar');
  await expect(bar).toBeVisible();
  const barBox = await bar.boundingBox();
  expect(barBox).not.toBeNull();
  expect(barBox!.x).toBeGreaterThanOrEqual(0);
  expect(barBox!.x + barBox!.width).toBeLessThanOrEqual(375);

  const controls = bar.locator('button, input');
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  const rows = new Set<number>();
  for (let i = 0; i < count; i++) {
    const control = controls.nth(i);
    const box = await control.boundingBox();
    if (!box) throw new Error(`control ${i} has no box`);
    const name = (await control.getAttribute('aria-label')) ?? (await control.textContent());
    expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44);
    expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44);
    rows.add(Math.round(box.y + box.height / 2));
  }
  // Controls in one row share a centre line; allow a few pixels for the clock's stacking.
  const centres = [...rows].sort((a, b) => a - b);
  const distinct = centres.filter((y, i) => i === 0 || y - centres[i - 1]! > 8);
  expect(distinct.length).toBeLessThanOrEqual(2);

  // The labels are still the accessible names, so the icon buttons stay reachable by name.
  await expect(page.getByRole('button', { name: 'Feed' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Follow a fish/ })).toBeVisible();

  // The idle fade is a cut: no transition on the bar.
  const transition = await bar.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(transition.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});
