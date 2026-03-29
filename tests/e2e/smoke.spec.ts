import { expect, test } from '@playwright/test';

test.describe('app smoke', () => {
  test('landing loads and entering reaches mode select', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Talk Moves|Langkah Perbincangan/i })).toBeVisible();

    await page.getByRole('button', { name: /^(Enter|Masuk)$/ }).click();

    await expect(page.getByRole('heading', { name: /Dialogic Classroom|Bilik Kelas Dialogik/i })).toBeVisible();
  });
});
