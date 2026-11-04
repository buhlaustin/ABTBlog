// @ts-check
import { test, expect } from '@playwright/test';

const SAVE_KEY = 'startup_sim_save_v1';

test.describe('Startup Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/startup-sim/index.html');
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();
    await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  });

  test('new game → complete task → reload → continue saved game', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.locator('#screen-setup')).toBeVisible();

    await page.locator('#company-name').fill('Playwright Test Co');
    await page.locator('#startup-category').selectOption('b2b-saas');
    await page.locator('#btn-start-game').click();

    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#hud-company')).toHaveText('Playwright Test Co');

    const complete = page.locator('[data-complete-task]').first();
    await expect(complete).toBeVisible({ timeout: 15_000 });
    await complete.click();

    await expect
      .poll(async () =>
        page.evaluate((key) => localStorage.getItem(key) !== null, SAVE_KEY)
      )
      .toBe(true);

    await page.goto('/play/startup-sim/index.html');
    const continueBtn = page.getByRole('button', { name: 'Continue saved game' });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    await expect(page.locator('#screen-game')).toBeVisible();
    await expect(page.locator('#hud-company')).toHaveText('Playwright Test Co');
  });
});
