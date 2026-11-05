import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import { setGameFeedback } from './GameFeedback.js';
import { easeCompetitorPressure } from './Competitor.js';
import { progressionTier } from './ProgressionEconomy.js';

export const PRODUCT_ACTIONS = [
  {
    id: 'founder_reddit_ama',
    label: 'Founder Reddit AMA',
    cost: 250,
    buzz: 1,
    product: 0,
    rivalEase: 1,
    tierMax: 2,
    description: 'Cheap attention — good when you have more time than budget.'
  },
  {
    id: 'community_beta',
    label: 'Invite-only beta list',
    cost: 900,
    buzz: 1,
    product: 2,
    tierMax: 3,
    description: 'Hand-pick early users; product depth over hype.'
  },
  {
    id: 'influencer_micro',
    label: 'Micro-influencer campaign',
    cost: 4_500,
    buzz: 2,
    product: 0,
    rivalEase: 1,
    description: 'Pay creators to talk up your launch — bumps buzz, not product depth.'
  },
  {
    id: 'influencer_mid',
    label: 'Mid-tier influencer tour',
    cost: 18_000,
    buzz: 5,
    product: 1,
    description: 'Heavier spend for a coordinated week of sponsored posts.'
  },
  {
    id: 'product_hackathon',
    label: 'Customer hackathon',
    cost: 12_000,
    buzz: 2,
    product: 3,
    description: 'Invite power users to build on your API — product level over hype.'
  },
  {
    id: 'brand_stunt',
    label: 'Publicity stunt',
    cost: 8_000,
    buzz: 4,
    product: 0,
    rivalEase: 2,
    description: 'Risky but loud — great for buzz if you can afford the cringe.'
  }
];

const ACTIONS_PER_MONTH = 2;

export function productActionsRemaining(state) {
  const used = state.product?.actionsThisMonth ?? 0;
  return Math.max(0, ACTIONS_PER_MONTH - used);
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
  const def = PRODUCT_ACTIONS.find((a) => a.id === actionId);
  if (!def) return { ok: false, reason: 'Unknown action.' };
  if (!actionUnlocked(def, state)) {
    return { ok: false, reason: 'Not unlocked at your current stage.' };
  }
  if (productActionsRemaining(state) <= 0) {
    return { ok: false, reason: `Only ${ACTIONS_PER_MONTH} product plays per month.` };
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

export function renderProductActionsPanel(container, state) {
  if (!container) return;
  const left = productActionsRemaining(state);
  const rows = PRODUCT_ACTIONS.filter((a) => actionUnlocked(a, state))
    .map((a) => {
      const rival = a.rivalEase ? ` · rival heat −${a.rivalEase}` : '';
      return `<div class="finance-action product-action">
      <p><strong>${escapeHtml(a.label)}</strong> — ${formatMoney(a.cost)}</p>
      <p class="fine-print">${escapeHtml(a.description)} Buzz +${a.buzz}${a.product ? ` · Product +${a.product}` : ''}${rival}.</p>
      <button type="button" class="btn btn-primary btn-small" data-product-action="${escapeHtml(a.id)}" ${left <= 0 ? 'disabled title="No product plays left this month"' : ''}>Run campaign</button>
    </div>`;
    })
    .join('');

  container.innerHTML = `
    <h3 class="log-head">Growth levers</h3>
    <p class="fine-print">Spend cash outside desk tasks — <strong>${left}/${ACTIONS_PER_MONTH}</strong> plays left this month. Early options unlock before paid Growth campaigns.</p>
    ${rows || '<p class="fine-print">More levers unlock as you scale funding stage.</p>'}
    <p id="product-action-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showProductActionFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
