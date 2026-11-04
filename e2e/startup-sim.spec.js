// @ts-check
import { test, expect } from '@playwright/test';

const SAVE_KEY = 'startup_sim_save_v1';

test.describe('Startup Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/startup-sim/index.html');
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();
    await expect(page.locator('body[data-startup-sim-ready="true"]')).toBeVisible({ timeout: 15_000 });
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

  test('all company tabs render live panels', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: 'New game' }).click();
    await page.locator('#company-name').fill('Tab Audit Co');
    await page.locator('#startup-category').selectOption('b2b-saas');
    await page.locator('#btn-start-game').click();
    await expect(page.locator('#screen-game')).toBeVisible();

    await page.locator('#tab-growth').click();
    await expect(page.locator('#panel-growth')).toContainText('Rival');
    await expect(page.locator('#panel-growth')).toContainText('Board');

    await page.locator('#tab-social').click();
    await expect(page.locator('[data-social-tab="archive"]')).toBeVisible();

    await page.locator('#tab-news').click();
    await expect(page.locator('#btn-toggle-news-archive')).toBeVisible();

    await page.locator('#tab-finance').click();
    await expect(page.locator('#panel-finance')).toContainText('Cap table');
    await expect(page.locator('#panel-finance')).toContainText('Board sentiment');
  });
});
