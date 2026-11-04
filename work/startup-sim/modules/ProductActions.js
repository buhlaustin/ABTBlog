import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import { setGameFeedback } from './GameFeedback.js';

export const PRODUCT_ACTIONS = [
  {
    id: 'influencer_micro',
    label: 'Micro-influencer campaign',
    cost: 4_500,
    buzz: 2,
    product: 0,
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
    description: 'Risky but loud — great for buzz if you can afford the cringe.'
  }
];

export function runProductAction(state, actionId) {
  const def = PRODUCT_ACTIONS.find((a) => a.id === actionId);
  if (!def) return { ok: false, reason: 'Unknown action.' };

  const cash = state.finance?.cash ?? 0;
  if (cash < def.cost) {
    return { ok: false, reason: `Need ${formatMoney(def.cost)} cash on hand.` };
  }

  state.finance.cash -= def.cost;
  recordCashOutflow(state, def.cost, 'product');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + def.cost;
  state.product.level = (state.product.level ?? 0) + (def.product ?? 0);
  state.product.buzz = (state.product.buzz ?? 0) + (def.buzz ?? 0);

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
  const rows = PRODUCT_ACTIONS.map(
    (a) => `<div class="finance-action product-action">
      <p><strong>${escapeHtml(a.label)}</strong> — ${formatMoney(a.cost)}</p>
      <p class="fine-print">${escapeHtml(a.description)} Buzz +${a.buzz}${a.product ? ` · Product +${a.product}` : ''}.</p>
      <button type="button" class="btn btn-primary btn-small" data-product-action="${escapeHtml(a.id)}">Run campaign</button>
    </div>`
  ).join('');

  container.innerHTML = `
    <h3 class="log-head">Growth levers</h3>
    <p class="fine-print">Spend cash here to move buzz and product outside desk tasks.</p>
    ${rows}
    <p id="product-action-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showProductActionFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
