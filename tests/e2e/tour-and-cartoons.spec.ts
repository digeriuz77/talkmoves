import { expect, test } from '@playwright/test';

for (const lang of ['en', 'ms'] as const) {
  test(`tour uses simple, schedule-free paragraphs in ${lang}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Take a Tour', exact: true }).click();
    const tour = page.getByRole('dialog');
    if (lang === 'ms') await tour.getByRole('button', { name: 'BM', exact: true }).click();

    for (let step = 0; step < 7; step += 1) {
      await expect(tour).toBeVisible();
      await expect(tour).not.toContainText(/sprint|\bweeks?\b|\bminggu\b/i);
      await expect(tour.locator('ul, ol, li')).toHaveCount(0);
      if (step === 1) {
        for (let strategy = 1; strategy <= 6; strategy += 1) {
          await expect(tour.getByText(new RegExp(`^S${strategy} ·`))).toBeVisible();
        }
        await expect(tour).toContainText(lang === 'en' ? 'Ask, then wait' : 'Tanya, kemudian tunggu');
      }
      await tour.getByRole('button', {
        name: step === 6
          ? (lang === 'en' ? 'Finish & Open Home' : 'Tamat & Buka Utama')
          : (lang === 'en' ? 'Next' : 'Seterusnya'),
        exact: true,
      }).click();
    }
    await expect(tour).toHaveCount(0);
  });
}

test('studio selects existing unit cartoons without API calls, including offline', async ({ page, context }) => {
  const apiCalls: string[] = [];
  await page.route('**/api/**', async (route) => {
    apiCalls.push(route.request().url());
    await route.abort();
  });
  await page.goto('/#/cartoon');

  await expect(page.getByRole('combobox', { name: 'KPM unit', exact: true })).toContainText('Unit 4: Plants');
  const selector = page.getByRole('combobox', { name: 'Cartoon', exact: true });
  await expect(selector.locator('option')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Which Way Do the Roots Grow?' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);

  await context.setOffline(true);
  await selector.selectOption('y4-u4-cc-plant-food');
  await expect(page.getByRole('heading', { name: 'Where Does a Plant Get Its Food?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Which Way Do the Roots Grow?' })).toHaveCount(0);

  const notes = page.locator('article details');
  await notes.locator('summary').click();
  await expect(notes).toContainText('soil provides water/minerals, not food');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Where Does a Plant Get Its Food?' })).toHaveCount(2);
  // The projected view contains the claims, not the diagnostic explanations.
  const presentation = page.locator('.fixed.inset-0.z-\\[200\\]');
  await expect(presentation).not.toContainText('soil provides water/minerals, not food');
  await page.keyboard.press('Escape');

  await page.emulateMedia({ media: 'print' });
  await expect(notes).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await selector.selectOption('y4-u4-cc-black-box');
  await expect(page.getByRole('heading', { name: 'Plant N Inside the Black Box' })).toBeVisible();
  expect(apiCalls).toEqual([]);
});

test('studio falls back safely when a saved unit no longer exists', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tmb.primer.unitId', JSON.stringify('removed-unit'));
  });
  await page.goto('/#/cartoon');
  await expect(page.getByRole('combobox', { name: 'KPM unit', exact: true })).toHaveValue('y4-science-u4-plants');
  await expect(page.getByRole('heading', { name: 'Which Way Do the Roots Grow?' })).toBeVisible();
});
