import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import { setGameFeedback } from './GameFeedback.js';
import { easeCompetitorPressure } from './Competitor.js';
import { progressionTier } from './ProgressionEconomy.js';
import {
  sideTaskPlaysPerMonth,
  formatMonthlySideTaskLimit,
  sideTaskCapacityRemaining,
  sideTaskLimitHint
} from './SideTaskProgression.js';

export { sideTaskPlaysPerMonth, formatMonthlySideTaskLimit, sideTaskLimitHint };
import { fetchGameJson } from './utils.js';
import bundledLevers from '../data/growth-levers.json' with { type: 'json' };
import bundledLeversExtra from '../data/growth-levers-extra.json' with { type: 'json' };
import bundledLeversExtra2 from '../data/growth-levers-extra2.json' with { type: 'json' };
import bundledLeversExtra3 from '../data/growth-levers-extra3.json' with { type: 'json' };
import bundledSpaceGrowth from '../data/space-exploration-growth.json' with { type: 'json' };
import bundledSpaceGrowthExtra from '../data/space-exploration-growth-extra.json' with { type: 'json' };

function mergeLeverCatalog(base, ...extras) {
  const actions = [...(base?.actions ?? [])];
  const ids = new Set(actions.map((a) => a.id));
  for (const extra of extras) {
    for (const a of extra?.actions ?? []) {
      if (!ids.has(a.id)) {
        ids.add(a.id);
        actions.push(a);
      }
    }
  }
  return actions;
}

const bundledLeverExtras = [
  bundledLeversExtra,
  bundledLeversExtra2,
  bundledLeversExtra3,
  bundledSpaceGrowth,
  bundledSpaceGrowthExtra
];

let leverCatalog = mergeLeverCatalog(bundledLevers, ...bundledLeverExtras);

export async function loadGrowthLevers() {
  try {
    const data = await fetchGameJson('data/growth-levers.json');
    if (Array.isArray(data?.actions) && data.actions.length) {
      leverCatalog = mergeLeverCatalog({ actions: data.actions }, ...bundledLeverExtras);
    }
  } catch {
    /* bundled */
  }
  return leverCatalog;
}

export function getProductActions() {
  return leverCatalog;
}

export function sideTaskFocus(def) {
  return def?.focus ?? 'both';
}

export function filterSideTasksByFocus(actions, focusFilter) {
  if (!focusFilter?.length) return actions;
  const allowed = new Set(focusFilter);
  return actions.filter((a) => allowed.has(sideTaskFocus(a)));
}

export function sideTaskBankSize(focusFilter) {
  return filterSideTasksByFocus(getProductActions(), focusFilter).length;
}

/** @deprecated use getProductActions() */
export const PRODUCT_ACTIONS = leverCatalog;

export function productActionsRemaining(state) {
  const used = state.product?.actionsThisMonth ?? 0;
  return sideTaskCapacityRemaining(sideTaskPlaysPerMonth(state), used);
}

export function resetProductActionsMonth(state) {
  if (!state.product) state.product = { level: 0, buzz: 0 };
  state.product.actionsThisMonth = 0;
}

function actionUnlocked(def, state) {
  const tier = progressionTier(state);
  if ((def.tierMin ?? 0) > tier) return false;
  if ((def.tierMax ?? 99) < tier) return false;
  const cats = def.categories;
  if (cats?.length && !cats.includes(state.company?.categoryId)) return false;
  return true;
}

export function runProductAction(state, actionId) {
  const def = getProductActions().find((a) => a.id === actionId);
  if (!def) return { ok: false, reason: 'Unknown action.' };
  if (!actionUnlocked(def, state)) {
    return { ok: false, reason: 'Not unlocked at your current stage.' };
  }
  const limit = sideTaskPlaysPerMonth(state);
  if (Number.isFinite(limit) && productActionsRemaining(state) <= 0) {
    return {
      ok: false,
      reason: `Only ${formatMonthlySideTaskLimit(limit)} side play${limit === 1 ? '' : 's'} per month at your current stage.`
    };
  }

  const cash = state.finance?.cash ?? 0;
  if (cash < def.cost) {
    return { ok: false, reason: `Need ${formatMoney(def.cost)} cash on hand.` };
  }

  state.finance.cash -= def.cost;
  recordCashOutflow(state, def.cost, 'product');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + def.cost;
  state.product.level = (state.product.level ?? 0) + (def.product ?? 0);
  state.product.buzz = (state.product.buzz ?? 0) + (def.buzz ?? 0);
  state.product.actionsThisMonth = (state.product.actionsThisMonth ?? 0) + 1;
  if (def.rivalEase) easeCompetitorPressure(state, def.rivalEase);

  return { ok: true, action: def };
}

function availableSideTasks(state, focusFilter) {
  return filterSideTasksByFocus(getProductActions(), focusFilter).filter((a) =>
    actionUnlocked(a, state)
  );
}

export function canBuyAllRemainingSideTasks(state, focusFilter) {
  const left = productActionsRemaining(state);
  if (Number.isFinite(sideTaskPlaysPerMonth(state)) && left <= 0) return false;
  const cash = state.finance.cash ?? 0;
  return availableSideTasks(state, focusFilter).some((a) => cash >= (a.cost ?? 0));
}

/** Run affordable side levers until monthly slots or unlocked plays run out. */
export function runAllRemainingSideTasks(state, focusFilter) {
  const launched = [];
  let totalCost = 0;
  let totalBuzz = 0;
  let totalProduct = 0;

  for (let guard = 0; guard < 512; guard += 1) {
    if (Number.isFinite(sideTaskPlaysPerMonth(state)) && productActionsRemaining(state) <= 0) {
      break;
    }

    const tasks = availableSideTasks(state, focusFilter);
    if (!tasks.length) break;

    const cash = state.finance.cash ?? 0;
    const impactScore = (d) => (d.buzz ?? 0) + (d.product ?? 0) * 2;
    const affordable = tasks
      .filter((a) => cash >= (a.cost ?? 0))
      .sort((a, b) => {
        const diff = impactScore(b) - impactScore(a);
        return diff !== 0 ? diff : (a.cost ?? 0) - (b.cost ?? 0);
      });
    if (!affordable.length) break;

    const result = runProductAction(state, affordable[0].id);
    if (!result.ok) break;

    launched.push(result);
    totalCost += result.action.cost ?? 0;
    totalBuzz += result.action.buzz ?? 0;
    totalProduct += result.action.product ?? 0;
  }

  if (!launched.length) {
    const left = productActionsRemaining(state);
    if (Number.isFinite(sideTaskPlaysPerMonth(state)) && left <= 0) {
      return { ok: false, reason: 'No side play slots left this month.' };
    }
    const tasks = availableSideTasks(state, focusFilter);
    if (!tasks.length) {
      return { ok: false, reason: 'No side growth plays unlocked at your stage.' };
    }
    return { ok: false, reason: 'Not enough cash for any remaining side play.' };
  }

  return {
    ok: true,
    launched,
    count: launched.length,
    totalCost,
    totalBuzz,
    totalProduct
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderProductActionsPanel(container, state, options = {}) {
  if (!container) return;
  const limit = sideTaskPlaysPerMonth(state);
  const left = productActionsRemaining(state);
  const leftLabel =
    left === Infinity
      ? 'Unlimited'
      : `${left}/${formatMonthlySideTaskLimit(limit)}`;
  const atCap = Number.isFinite(limit) && left <= 0;
  const heading = options.heading ?? 'Growth levers';
  const focusFilter = options.focusFilter;
  const bankSize = sideTaskBankSize(focusFilter);
  const hint = options.showLimitHint !== false ? `<p class="fine-print">${sideTaskLimitHint(state)}</p>` : '';
  const lede =
    options.lede ??
    `Cash plays outside desk tasks — <strong>${leftLabel}</strong> left this month (${bankSize} in this bank · ${getProductActions().length} total side plays).`;
  const rows = filterSideTasksByFocus(getProductActions(), focusFilter)
    .filter((a) => actionUnlocked(a, state))
    .map((a) => {
      const rival = a.rivalEase ? ` · rival heat −${a.rivalEase}` : '';
      const focusTag =
        sideTaskFocus(a) !== 'both'
          ? ` <span class="task-tag">${escapeHtml(sideTaskFocus(a))}</span>`
          : '';
      return `<div class="finance-action product-action">
      <p><strong>${escapeHtml(a.label)}</strong>${focusTag} — ${formatMoney(a.cost)}</p>
      <p class="fine-print">${escapeHtml(a.description)} Buzz +${a.buzz ?? 0}${a.product ? ` · Product +${a.product}` : ''}${rival}.</p>
      <button type="button" class="btn btn-primary btn-small" data-product-action="${escapeHtml(a.id)}" ${atCap ? 'disabled title="No side plays left this month"' : ''}>Run play</button>
    </div>`;
    })
    .join('');

  container.innerHTML = `
    <h3 class="log-head">${escapeHtml(heading)}</h3>
    <p class="fine-print">${lede}</p>
    ${hint}
    ${rows || '<p class="fine-print">More levers unlock as you scale funding stage.</p>'}
    <p id="product-action-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showProductActionFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
