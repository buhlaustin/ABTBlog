// @ts-check
import { test, expect } from '@playwright/test';

const SAVE_KEY = 'startup_sim_save_v1';

test.describe('Startup Simulator', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    // Full navigation — reload() can interrupt ES module init on slow CI runners.
    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await expect(page.locator('body[data-startup-sim-ready="true"]')).toBeVisible({ timeout: 60_000 });
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

    await expect(page.locator('#tab-board')).toBeHidden();

    await page.locator('#tab-growth').click();
    await expect(page.locator('#growth-stat-product-level')).toBeVisible();
    await expect(page.locator('#growth-stat-buzz')).toBeVisible();
    await expect(page.locator('#panel-growth')).toContainText('Product level');
    await expect(page.locator('#panel-growth')).toContainText('Buzz');
    await expect(page.locator('#panel-growth')).toContainText('Rival');
    await expect(page.locator('#panel-growth')).toContainText('Runway');

    await page.locator('#tab-news').click();
    await expect(page.locator('#btn-toggle-news-archive')).toBeVisible();

    await page.locator('#tab-ceo').click();
    await expect(page.locator('#panel-ceo')).toContainText('Personal debits');
    await expect(page.locator('#panel-ceo')).toContainText('Est. net worth');
    await expect(page.locator('#panel-ceo')).toContainText('Personal bank');
    await page.locator('[data-ceo-tab="comp"]').click();
    await expect(page.locator('#panel-ceo')).toContainText('CEO salary');
    await expect(page.locator('#panel-ceo')).toContainText('Personal bank ledger');

    await page.locator('#tab-finance').click();
    await expect(page.locator('#panel-finance')).toContainText('Cap table');
    await expect(page.locator('#panel-finance')).toContainText('Portfolio MRR');

    await page.locator('#tab-companies').click();
    await expect(page.locator('#panel-companies')).toContainText('Portfolio MRR');
    await expect(page.locator('#panel-companies')).toContainText('X Combinator batch');
    await expect(page.locator('[data-companies-tab="market"]')).toBeVisible();
    await expect(page.locator('#panel-companies')).toContainText('Synergy');
  });

  test('mobile viewport: tabs and people table scroll without horizontal page overflow', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await expect(page.locator('body[data-startup-sim-ready="true"]')).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('button', { name: 'New game' }).click();
    await page.locator('#company-name').fill('Mobile Co');
    await page.locator('#ceo-first-name').fill('Mo');
    await page.locator('#ceo-last-name').fill('Bile');
    await page.locator('#startup-category').selectOption('b2b-saas');
    await page.locator('#btn-start-game').click();
    await expect(page.locator('#screen-game')).toBeVisible();

    const offers = page.locator('[data-toggle-task-offer]');
    for (let i = 0; i < Math.min(4, await offers.count()); i += 1) {
      await offers.nth(i).click();
    }
    await page.locator('#btn-confirm-task-lineup').click();

    await page.locator('#tab-finance').click();
    await expect(page.locator('#panel-finance .data-table').first()).toBeVisible();
    await expect(page.locator('#tab-desk')).toHaveCSS('min-height', '44px');

    const tabIds = [
      'desk',
      'growth',
      'people',
      'ceo',
      'finance',
      'companies',
      'board',
      'news',
    ];
    for (const tab of tabIds) {
      const tabBtn = page.locator(`#tab-${tab}`);
      if (!(await tabBtn.isVisible())) continue;
      await tabBtn.click();
      const docWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `horizontal overflow on tab ${tab}`).toBeLessThanOrEqual(docWidth + 2);
    }

    await context.close();
  });

  test('mobile viewport: sandbox post-XC lineup and finance workspace controls', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.goto('/play/startup-sim/index.html', { waitUntil: 'load' });
    await expect(page.locator('body[data-startup-sim-ready="true"]')).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('button', { name: 'New game' }).click();
    await page.locator('input[value="sandbox"]').check();
    await page.locator('#sandbox-start-stage').selectOption('post_xc');
    await page.locator('#company-name').fill('Sandbox Mobile Co With A Long Name');
    await page.locator('#ceo-first-name').fill('Alex');
    await page.locator('#ceo-last-name').fill('Founder');
    await page.locator('#startup-category').selectOption('b2b-saas');
    await page.locator('#btn-start-game').click();
    await expect(page.locator('#screen-game')).toBeVisible();

    const lockBtn = page.locator('#btn-confirm-task-lineup');
    const offers = page.locator('[data-toggle-task-offer]');
    for (let guard = 0; guard < 12 && (await lockBtn.isDisabled()); guard += 1) {
      const count = await offers.count();
      if (count === 0) break;
      await offers.nth(guard % count).click();
    }
    await expect(lockBtn).toBeEnabled({ timeout: 10_000 });
    await lockBtn.click();

    await page.locator('#tab-finance').click();
    await expect(page.locator('#panel-finance')).toContainText('Worldwide hub');
    await expect(page.locator('#btn-add-satellite')).toBeVisible();
    await page.locator('#tab-news').click();
    await expect(page.locator('#btn-toggle-news-archive')).toHaveCSS('min-height', '44px');

    const docWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(docWidth + 2);

    await context.close();
  });
});
