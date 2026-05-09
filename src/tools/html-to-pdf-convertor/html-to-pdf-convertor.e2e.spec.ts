import { expect, test } from '@playwright/test';

test.describe('Tool - HTML to PDF convertor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/html-to-pdf-convertor');
  });

  test('Has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('HTML to PDF convertor - IT Tools');
  });
});
