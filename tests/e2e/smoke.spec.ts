import { expect, test } from '@playwright/test';

test('the living room boots, renders and feeds the fish', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Surface browser warnings in the CI log so a stalled boot is diagnosable.
    if (message.type() === 'warning' || message.type() === 'error') {
      console.log(`[browser ${message.type()}] ${message.text()}`);
    }
    if (message.type() === 'error') errors.push(message.text());
  });

  // Lite skips the post-processing shaders, which software GL on CI compiles very slowly.
  await page.goto('./?quality=lite');
  await expect(page.locator('canvas')).toBeVisible();
  // The loading veil lifts once the fish models are in and the first frames have compiled.
  await expect(page.locator('.loading')).toHaveClass(/loading--done/, { timeout: 90_000 });
  await expect(page.getByText(/\d+ fish/)).toBeVisible();

  await page.mouse.move(400, 300);
  await page.getByRole('button', { name: 'Feed' }).click();
  await page.getByRole('radio', { name: /Tank/ }).click();
  await expect(page.getByRole('radio', { name: /Tank/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: /Day cycle/ }).click();
  await expect(page.getByRole('radio', { name: /Day cycle/ })).toHaveAttribute(
    'aria-checked',
    'true'
  );

  expect(errors).toEqual([]);
});
