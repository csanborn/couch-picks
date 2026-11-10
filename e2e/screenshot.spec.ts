import { expect, test } from '@playwright/test';

// Not part of the regular suite: `npm run screenshot` refreshes the README image.
test('README screenshot', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('cozy rainy Sunday');
  await page.keyboard.press('Enter');
  const rows = page.locator('section.row');
  await expect(rows.first().locator('.card').first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(rows.first().locator('.card').nth(1)).toBeFocused();
  // Let the scroll and focus transitions settle.
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screenshot.png' });
});
