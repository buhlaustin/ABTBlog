import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import { setGameFeedback } from './GameFeedback.js';
import { easeCompetitorPressure } from './Competitor.js';
import { progressionTier } from './ProgressionEconomy.js';
import { fetchGameJson } from './utils.js';
import bundledLevers from '../data/growth-levers.json' with { type: 'json' };
import bundledLeversExtra from '../data/growth-levers-extra.json' with { type: 'json' };
import bundledLeversExtra2 from '../data/growth-levers-extra2.json' with { type: 'json' };
import bundledLeversExtra3 from '../data/growth-levers-extra3.json' with { type: 'json' };

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

const bundledLeverExtras = [bundledLeversExtra, bundledLeversExtra2, bundledLeversExtra3];

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

function actionsPerMonth(state) {
  const tier = progressionTier(state);
  if (tier >= 5) return 4;
  if (tier >= 3) return 3;
  return 2;
}

export function productActionsRemaining(state) {
  const used = state.product?.actionsThisMonth ?? 0;
  return Math.max(0, actionsPerMonth(state) - used);
}

export function resetProductActionsMonth(state) {
  if (!state.product) state.product = { level: 0, buzz: 0 };
  state.product.actionsThisMonth = 0;
}

function actionUnlocked(def, state) {
  const tier = progressionTier(state);
  if ((def.tierMin ?? 0) > tier) return false;
  if ((def.tierMax ?? 99) < tier) return false;
  return true;
}

export function runProductAction(state, actionId) {
  const def = getProductActions().find((a) => a.id === actionId);
  if (!def) return { ok: false, reason: 'Unknown action.' };
  if (!actionUnlocked(def, state)) {
    return { ok: false, reason: 'Not unlocked at your current stage.' };
  }
  const limit = actionsPerMonth(state);
  if (productActionsRemaining(state) <= 0) {
    return { ok: false, reason: `Only ${limit} growth lever play${limit === 1 ? '' : 's'} per month.` };
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderProductActionsPanel(container, state, options = {}) {
  if (!container) return;
  const left = productActionsRemaining(state);
  const limit = actionsPerMonth(state);
  const heading = options.heading ?? 'Growth levers';
  const focusFilter = options.focusFilter;
  const bankSize = sideTaskBankSize(focusFilter);
  const lede =
    options.lede ??
    `Cash plays outside desk tasks — <strong>${left}/${limit}</strong> left this month (${bankSize} in this bank · ${getProductActions().length} total side plays).`;
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
      <button type="button" class="btn btn-primary btn-small" data-product-action="${escapeHtml(a.id)}" ${left <= 0 ? 'disabled title="No growth lever plays left this month"' : ''}>Run play</button>
    </div>`;
    })
    .join('');

  container.innerHTML = `
    <h3 class="log-head">${escapeHtml(heading)}</h3>
    <p class="fine-print">${lede}</p>
    ${rows || '<p class="fine-print">More levers unlock as you scale funding stage.</p>'}
    <p id="product-action-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showProductActionFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
