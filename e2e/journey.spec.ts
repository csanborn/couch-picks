import { expect, test, type Page } from '@playwright/test';

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('data-focus-id') ?? null);

test('a remote-only journey through picks and details', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  const input = page.getByLabel('What are you in the mood for?');
  await expect(input).toBeFocused();
  await page.keyboard.type('cozy rainy Sunday with tea');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Demo data')).toBeVisible();
  const rows = page.locator('section.row');
  await expect(rows).toHaveCount(4);
  await expect(rows.first().getByRole('heading')).toHaveText('Blanket and tea comfort');

  // Results take focus on the first pick of the first row.
  const firstRowCards = rows.nth(0).locator('.card');
  await expect(firstRowCards.first()).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(firstRowCards.nth(2)).toBeFocused();

  // Row 0 has scrolled by one card, so straight down lands on row 1's second card.
  const secondRowCards = rows.nth(1).locator('.card');
  await page.keyboard.press('ArrowDown');
  await expect(secondRowCards.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  // Each row remembers its column.
  await page.keyboard.press('ArrowUp');
  await expect(firstRowCards.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(secondRowCards.nth(2)).toBeFocused();

  // Enter opens the detail, Backspace closes it and focus comes back.
  const opened = await focusedId(page);
  const title = await secondRowCards.nth(2).locator('.card-title').textContent();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(title ?? '');
  await expect(dialog.getByRole('button', { name: 'Back to picks' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('button', { name: 'Back to picks' })).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(dialog).toBeHidden();
  expect(await focusedId(page)).toBe(opened);

  // Escape works as Back too.
  await page.keyboard.press('ArrowLeft');
  const second = await focusedId(page);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await focusedId(page)).toBe(second);

  // Focus never escapes the edges.
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowLeft');
  await expect(secondRowCards.first()).toBeFocused();

  // Up through the rows reaches the preset chips and the prompt again.
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.chip:focus')).toHaveCount(1);
  await page.keyboard.press('ArrowUp');
  await expect(input).toBeFocused();

  expect(errors).toEqual([]);
});

test('a preset chip searches without typing', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');
  await page.keyboard.press('ArrowDown');
  const chip = page.locator('.chip:focus');
  await expect(chip).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('section.row').first().locator('.card').first()).toBeFocused();
  expect(errors).toEqual([]);
});
