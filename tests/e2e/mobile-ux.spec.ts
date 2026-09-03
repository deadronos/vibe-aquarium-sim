import { expect, test } from '@playwright/test';

test.describe('mobile aquarium composition', () => {
  test.setTimeout(60_000);

  test('keeps primary actions reachable and immediate on a phone viewport', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./', { waitUntil: 'networkidle' });

    const rail = page.getByRole('navigation', { name: 'Primary aquarium actions' });
    await expect(rail).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.hud-panel')).toBeHidden();

    const actionButtons = rail.getByRole('button');
    await expect(actionButtons).toHaveCount(3);
    for (let index = 0; index < (await actionButtons.count()); index += 1) {
      const box = await actionButtons.nth(index).boundingBox();
      expect(box, `action button ${index} should have a touch-sized box`).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const lastFed = page
      .locator('.hud-stat')
      .filter({ hasText: 'Last Fed' })
      .locator('.hud-stat-value');

    const decorButton = rail.getByRole('button', { name: 'Place decoration' });
    const settingsButton = rail.getByRole('button', { name: 'Open settings' });
    const dialog = page.getByRole('dialog', { name: 'Settings' });

    await expect(lastFed).toHaveText('Never');
    await settingsButton.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('f');
    await page.keyboard.press('1');
    await expect(lastFed).toHaveText('Never');
    await expect(decorButton).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(settingsButton).toBeFocused();
    await expect(page.locator('#vibe-app-shell')).not.toHaveJSProperty('inert', true);

    const feedButton = rail.getByRole('button', { name: 'Feed fish' });
    const feedBox = await feedButton.boundingBox();
    expect(feedBox).not.toBeNull();
    await page.mouse.click(feedBox!.x + feedBox!.width / 2, feedBox!.y + feedBox!.height / 2);
    await expect(lastFed).toHaveText('Just now');

    const firstFeedTimestamp = await lastFed.getAttribute('datetime');
    expect(firstFeedTimestamp).not.toBeNull();
    await page.waitForTimeout(20);
    await page.keyboard.press('f');
    await expect(lastFed).toHaveText('Just now');
    await expect.poll(() => lastFed.getAttribute('datetime')).not.toBe(firstFeedTimestamp);

    await decorButton.click();
    await expect(decorButton).toHaveAttribute('aria-pressed', 'true');
    await expect(rail).toContainText('Click tank floor to place');

    await page.keyboard.press('Escape');
    await expect(decorButton).toHaveAttribute('aria-pressed', 'false');

    await settingsButton.click();
    await expect(dialog).toBeVisible();
    const closeButton = dialog.getByRole('button', { name: 'Close' });
    const debugCheckbox = dialog.getByRole('checkbox', { name: 'Show debug panel' });
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(debugCheckbox).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(settingsButton).toBeFocused();

    await settingsButton.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(dialog).toBeHidden();
    await expect(settingsButton).toBeFocused();

    expect(pageErrors).toEqual([]);
  });

  test('keeps the rail within a short landscape viewport with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('./', { waitUntil: 'networkidle' });

    const rail = page.getByRole('navigation', { name: 'Primary aquarium actions' });
    await expect(rail).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });

    const railBox = await rail.boundingBox();
    expect(railBox).not.toBeNull();
    expect(railBox!.x + railBox!.width).toBeLessThanOrEqual(844);
    expect(railBox!.y).toBeGreaterThanOrEqual(0);
    expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(390);

    const actionButtons = rail.getByRole('button');
    await expect(actionButtons).toHaveCount(3);
    for (let index = 0; index < (await actionButtons.count()); index += 1) {
      const box = await actionButtons.nth(index).boundingBox();
      expect(box, `landscape action button ${index} should have a touch-sized box`).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const railDisplay = await rail.evaluate((element) => getComputedStyle(element).flexDirection);
    expect(railDisplay).toBe('column');

    await rail.getByRole('button', { name: 'Place decoration' }).click();
    await expect(rail).toContainText('Click tank floor to place');
    await expect
      .poll(() =>
        rail
          .getByRole('button', { name: 'Place decoration' })
          .evaluate((element) => getComputedStyle(element).transitionDuration)
      )
      .toBe('0s');
  });
});
