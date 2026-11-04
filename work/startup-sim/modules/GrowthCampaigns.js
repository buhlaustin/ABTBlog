import bundled from '../data/growth-campaigns.json' with { type: 'json' };
import { fetchGameJson } from './utils.js';
import { formatMoney } from './constants.js';
import { progressionTier } from './ProgressionEconomy.js';
import { recordCashOutflow, getCoreTaskRevenueMult, applySandboxRevenueTuning } from './Finance.js';

let catalog = bundled;

export async function loadGrowthCampaigns() {
  try {
    const data = await fetchGameJson('data/growth-campaigns.json');
    if (Array.isArray(data?.campaigns) && data.campaigns.length) catalog = data;
  } catch {
    /* bundled */
  }
  return catalog;
}

export function getGrowthCampaigns() {
  return catalog.campaigns ?? [];
}

function campaignRevenueMult(state) {
  return applySandboxRevenueTuning(state, getCoreTaskRevenueMult(state));
}

export function availableCampaigns(state) {
  const tier = progressionTier(state);
  const used = new Set(state.growth?.campaignsThisMonth ?? []);
  return getGrowthCampaigns().filter(
    (c) =>
      tier >= (c.tierMin ?? 0) &&
      tier <= (c.tierMax ?? 99) &&
      !used.has(c.id)
  );
}

export function runGrowthCampaign(state, campaignId) {
  const def = getGrowthCampaigns().find((c) => c.id === campaignId);
  if (!def) return { ok: false, reason: 'Unknown campaign.' };
  const tier = progressionTier(state);
  if (tier < (def.tierMin ?? 0) || tier > (def.tierMax ?? 99)) {
    return { ok: false, reason: 'Campaign not unlocked at your current stage.' };
  }
  if (!state.growth) state.growth = { campaignsThisMonth: [] };
  if (state.growth.campaignsThisMonth.includes(def.id)) {
    return { ok: false, reason: 'Already ran that campaign this month.' };
  }
  const cost = def.cost ?? 0;
  if ((state.finance.cash ?? 0) < cost) {
    return { ok: false, reason: `Need ${formatMoney(cost)} cash.` };
  }
  const [rMin, rMax] = def.revenue ?? [0, 0];
  const base = rMin + Math.random() * Math.max(0, rMax - rMin);
  const revenue = Math.round(base * campaignRevenueMult(state));

  state.finance.cash -= cost;
  state.finance.cash += revenue;
  state.finance.lifetimeRevenue += revenue;
  recordCashOutflow(state, cost, 'growth');
  state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + revenue;
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;
  state.product.buzz = (state.product.buzz ?? 0) + (def.buzz ?? 0);
  state.growth.campaignsThisMonth.push(def.id);

  return { ok: true, def, cost, revenue };
}

export function resetGrowthCampaignsMonth(state) {
  if (!state.growth) state.growth = { campaignsThisMonth: [] };
  state.growth.campaignsThisMonth = [];
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderGrowthCampaignsBlock(state) {
  const campaigns = availableCampaigns(state);
  if (!campaigns.length) {
    return '<p class="fine-print">No paid growth plays unlocked yet — close seed and scale ARR for billboards and beyond.</p>';
  }
  const cards = campaigns
    .map(
      (c) => `<div class="finance-action">
        <p><strong>${escapeHtml(c.title)}</strong> — ${escapeHtml(c.description)}</p>
        <p class="fine-print">Cost ${formatMoney(c.cost)} · optional · does not use desk slots · buzz +${c.buzz ?? 0}</p>
        <button type="button" class="btn btn-ghost btn-small" data-run-growth="${escapeHtml(c.id)}">Launch</button>
      </div>`
    )
    .join('');
  return `<h3 class="log-head">Paid growth (Growth tab)</h3>${cards}`;
}
