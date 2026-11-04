// @ts-check
import { test, expect } from '@playwright/test';

const SAVE_KEY = 'startup_sim_save_v1';

test.describe('Startup Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    // Full navigation — reload() can interrupt ES module init on slow CI runners.
    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await expect(page.locator('body[data-startup-sim-ready="true"]')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  });

  test('new game → complete task → reload → continue saved game', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.locator('#screen-setup')).toBeVisible();

    await page.locator('#company-name').fill('Playwright Test Co');
    await page.locator('#ceo-first-name').fill('Alex');
    await page.locator('#ceo-last-name').fill('Founder');
    await page.locator('#startup-category').selectOption('b2b-saas');
    await page.locator('#btn-start-game').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const offers = page.locator('[data-toggle-task-offer]');
    await expect(offers.first()).toBeVisible();
    const offerCount = await offers.count();
    for (let i = 0; i < Math.min(4, offerCount); i += 1) {
      await offers.nth(i).click();
    }
    await page.locator('#btn-confirm-task-lineup').click();
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
    await page.locator('#ceo-first-name').fill('Sam');
    await page.locator('#ceo-last-name').fill('Tabler');
    await page.locator('#startup-category').selectOption('b2b-saas');
    await page.locator('#btn-start-game').click();
    await expect(page.locator('#screen-game')).toBeVisible();
    const offers = page.locator('[data-toggle-task-offer]');
    for (let i = 0; i < Math.min(4, await offers.count()); i += 1) {
      await offers.nth(i).click();
    }
    await page.locator('#btn-confirm-task-lineup').click();

    await page.locator('#tab-board').click();
    await expect(page.locator('#panel-board')).toContainText('optional');

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
