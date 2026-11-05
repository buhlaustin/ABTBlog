import bundled from '../data/growth-campaigns.json' with { type: 'json' };
import bundledExtra from '../data/growth-campaigns-extra.json' with { type: 'json' };
import bundledExtra2 from '../data/growth-campaigns-extra2.json' with { type: 'json' };
import bundledExtra3 from '../data/growth-campaigns-extra3.json' with { type: 'json' };
import bundledSpaceGrowth from '../data/space-exploration-growth.json' with { type: 'json' };
import bundledSpaceGrowthExtra from '../data/space-exploration-growth-extra.json' with { type: 'json' };
import { fetchGameJson } from './utils.js';
import { progressionTier } from './ProgressionEconomy.js';
import { recordCashOutflow, getTaskRevenueMultiplierPreview } from './Finance.js';
import { formatMoney } from './constants.js';
import { growthCampaignSlots, growthCampaignsRemaining } from './GrowthBudget.js';
import { formatMonthlySideTaskLimit } from './SideTaskProgression.js';
import { applyCampaignRivalEffects } from './WorldDynamics.js';

function mergeCampaignCatalog(base, ...extras) {
  const campaigns = [...(base?.campaigns ?? [])];
  const ids = new Set(campaigns.map((c) => c.id));
  for (const extra of extras) {
    for (const c of extra?.campaigns ?? []) {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        campaigns.push(c);
      }
    }
  }
  return { ...base, campaigns };
}

const bundledExtras = [bundledExtra, bundledExtra2, bundledExtra3, bundledSpaceGrowth, bundledSpaceGrowthExtra];

let catalog = mergeCampaignCatalog(bundled, ...bundledExtras);

export async function loadGrowthCampaigns() {
  try {
    const data = await fetchGameJson('data/growth-campaigns.json');
    if (Array.isArray(data?.campaigns) && data.campaigns.length) {
      catalog = mergeCampaignCatalog(data, ...bundledExtras);
    }
  } catch {
    /* bundled */
  }
  return catalog;
}

export function getGrowthCampaigns() {
  return catalog.campaigns ?? [];
}

export function growthCampaignCatalogSize() {
  return getGrowthCampaigns().length;
}

function campaignRevenueMult(state) {
  return getTaskRevenueMultiplierPreview(state);
}

function campaignCategoryAllowed(def, state) {
  const cats = def?.categories;
  if (!cats?.length) return true;
  return cats.includes(state.company?.categoryId);
}

export function availableCampaigns(state) {
  const tier = progressionTier(state);
  const used = new Set(state.growth?.campaignsThisMonth ?? []);
  return getGrowthCampaigns().filter(
    (c) =>
      campaignCategoryAllowed(c, state) &&
      tier >= (c.tierMin ?? 0) &&
      tier <= (c.tierMax ?? 99) &&
      !used.has(c.id)
  );
}

export function runGrowthCampaign(state, campaignId) {
  const def = getGrowthCampaigns().find((c) => c.id === campaignId);
  if (!def) return { ok: false, reason: 'Unknown campaign.' };
  const tier = progressionTier(state);
  if (!campaignCategoryAllowed(def, state)) {
    return { ok: false, reason: 'Campaign not available for your industry.' };
  }
  if (tier < (def.tierMin ?? 0) || tier > (def.tierMax ?? 99)) {
    return { ok: false, reason: 'Campaign not unlocked at your current stage.' };
  }
  if (!state.growth) state.growth = { campaignsThisMonth: [] };
  if (state.growth.campaignsThisMonth.includes(def.id)) {
    return { ok: false, reason: 'Already ran that campaign this month.' };
  }
  const slots = growthCampaignSlots(state);
  if (Number.isFinite(slots) && state.growth.campaignsThisMonth.length >= slots) {
    return {
      ok: false,
      reason: `Marketing bandwidth full (${formatMonthlySideTaskLimit(slots)} campaign${slots === 1 ? '' : 's'} per month).`
    };
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
  applyCampaignRivalEffects(state, def);

  return { ok: true, def, cost, revenue };
}

/** Launch affordable paid campaigns until monthly slots or unlocked plays run out. */
export function runAllRemainingGrowthCampaigns(state) {
  const launched = [];
  let totalCost = 0;
  let totalRevenue = 0;
  let totalBuzz = 0;

  for (let guard = 0; guard < 512; guard += 1) {
    const remaining = growthCampaignsRemaining(state);
    if (remaining !== Infinity && remaining <= 0) break;

    const campaigns = availableCampaigns(state);
    if (!campaigns.length) break;

    const cash = state.finance.cash ?? 0;
    const affordable = campaigns
      .filter((c) => cash >= (c.cost ?? 0))
      .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
    if (!affordable.length) break;

    const result = runGrowthCampaign(state, affordable[0].id);
    if (!result.ok) break;

    launched.push(result);
    totalCost += result.cost;
    totalRevenue += result.revenue;
    totalBuzz += result.def.buzz ?? 0;
  }

  if (!launched.length) {
    const remaining = growthCampaignsRemaining(state);
    if (remaining !== Infinity && remaining <= 0) {
      return { ok: false, reason: 'No campaign slots left this month.' };
    }
    const campaigns = availableCampaigns(state);
    if (!campaigns.length) {
      return { ok: false, reason: 'No paid growth plays unlocked at your stage.' };
    }
    return { ok: false, reason: 'Not enough cash for any remaining growth play.' };
  }

  return {
    ok: true,
    launched,
    count: launched.length,
    totalCost,
    totalRevenue,
    totalBuzz
  };
}

export function canBuyAllRemainingGrowthCampaigns(state) {
  const remaining = growthCampaignsRemaining(state);
  if (remaining !== Infinity && remaining <= 0) return false;
  const cash = state.finance.cash ?? 0;
  return availableCampaigns(state).some((c) => cash >= (c.cost ?? 0));
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
    return '<p class="fine-print">No paid growth plays unlocked at your current stage — keep scaling funding tier to unlock more of the campaign bank.</p>';
  }
  const bankSize = growthCampaignCatalogSize();
  const mult = getTaskRevenueMultiplierPreview(state);
  const slots = growthCampaignSlots(state);
  const remaining = growthCampaignsRemaining(state);
  const slotLabel =
    remaining === Infinity
      ? 'Unlimited'
      : `${remaining}/${formatMonthlySideTaskLimit(slots)}`;
  const buyAllDisabled = canBuyAllRemainingGrowthCampaigns(state) ? '' : ' disabled';
  const slotNote = `<p class="fine-print">Campaign slots this month: <strong>${slotLabel}</strong> remaining · <strong>${campaigns.length}</strong> plays unlocked (${bankSize} in bank — does not use desk tasks).</p>
    <p class="finance-action"><button type="button" class="btn btn-primary btn-small" data-buy-all-growth${buyAllDisabled}>Buy all remaining</button> <span class="fine-print">Runs every affordable unlocked play until slots or cash run out.</span></p>`;
  const cards = campaigns
    .map((c) => {
      const r0 = Math.round((c.revenue?.[0] ?? 0) * mult * 0.5);
      const r1 = Math.round((c.revenue?.[1] ?? 0) * mult);
      return `<div class="finance-action">
        <p><strong>${escapeHtml(c.title)}</strong> — ${escapeHtml(c.description)}</p>
        <p class="fine-print">Cost ${formatMoney(c.cost)} · typical book ${formatMoney(r0)}–${formatMoney(r1)} at ${mult.toFixed(2)}× · buzz +${c.buzz ?? 0} · no desk slot</p>
        <button type="button" class="btn btn-ghost btn-small" data-run-growth="${escapeHtml(c.id)}">Launch</button>
      </div>`;
    })
    .join('');
  return `${slotNote}<h3 class="log-head">Paid growth (Growth tab)</h3>${cards}`;
}
