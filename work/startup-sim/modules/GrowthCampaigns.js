import bundled from '../data/growth-campaigns.json' with { type: 'json' };
import bundledExtra from '../data/growth-campaigns-extra.json' with { type: 'json' };
import bundledExtra2 from '../data/growth-campaigns-extra2.json' with { type: 'json' };
import bundledExtra3 from '../data/growth-campaigns-extra3.json' with { type: 'json' };
import bundledSpaceGrowth from '../data/space-exploration-growth.json' with { type: 'json' };
import bundledSpaceGrowthExtra from '../data/space-exploration-growth-extra.json' with { type: 'json' };
import bundledPublicLate from '../data/growth-campaigns-public-late.json' with { type: 'json' };
import bundledPublicWhale from '../data/growth-campaigns-public-whale.json' with { type: 'json' };
import bundledPublicMegawhale from '../data/growth-campaigns-public-megawhale.json' with { type: 'json' };
import { isMegawhalePlay } from './WhaleScale.js';
import { fetchGameJson } from './utils.js';
import { progressionTier, progressionTierForUnlocks } from './ProgressionEconomy.js';
import { recordCashOutflow, getTaskRevenueMultiplierPreview } from './Finance.js';
import { accrueFiscalRevenue } from './CorporateTax.js';
import { eraBaseRevenueScaleForCampaign } from './ProgressionEconomy.js';
import { formatMoney } from './constants.js';
import { growthCampaignSlots, growthCampaignsRemaining } from './GrowthBudget.js';
import { formatMonthlySideTaskLimit } from './SideTaskProgression.js';
import { applyCampaignRivalEffects } from './WorldDynamics.js';
import { applyStockPctMove, isPublicCompany } from './IPO.js';

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

const bundledExtras = [
  bundledExtra,
  bundledExtra2,
  bundledExtra3,
  bundledSpaceGrowth,
  bundledSpaceGrowthExtra,
  bundledPublicLate,
  bundledPublicWhale,
  bundledPublicMegawhale
];

/** Months before the same paid growth play can appear in the monthly roster again. */
export const GROWTH_CAMPAIGN_COOLDOWN_MONTHS = 12;

/** Paid growth plays offered on the Growth tab each month (from the full bank). */
export const GROWTH_MONTHLY_OFFER_COUNT = 22;

export function growthMonthlyOfferCount(state) {
  return progressionTier(state) >= 7 ? 28 : GROWTH_MONTHLY_OFFER_COUNT;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickMonthlyCampaignDefs(pool, offerCount, recentCampaignIds = []) {
  if (!pool.length || offerCount <= 0) return [];
  const cap = Math.min(offerCount, pool.length);
  const cooldownLen = cap * GROWTH_CAMPAIGN_COOLDOWN_MONTHS;
  const recent = new Set((recentCampaignIds ?? []).slice(-cooldownLen));
  const fresh = pool.filter((c) => !recent.has(c.id));
  const stale = pool.filter((c) => recent.has(c.id));

  const picked = [];
  const used = new Set();

  function takeUnique(source) {
    for (const def of shuffle(source)) {
      if (picked.length >= cap) break;
      if (used.has(def.id)) continue;
      used.add(def.id);
      picked.push(def);
    }
  }

  takeUnique(fresh.length ? fresh : pool);
  if (picked.length < cap) takeUnique(stale);
  if (picked.length < cap) takeUnique(pool);
  return picked.slice(0, cap);
}

function mergeUniqueCampaignOffers(offered, def, offerCount) {
  if (!def) return offered;
  const rest = offered.filter((c) => c.id !== def.id);
  const next = [def, ...rest];
  const seen = new Set();
  const unique = [];
  for (const c of next) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    unique.push(c);
  }
  return unique.slice(0, Math.min(offerCount, unique.length));
}

function eligibleCampaignPool(state) {
  const tier = progressionTierForUnlocks(state);
  return getGrowthCampaigns().filter(
    (c) =>
      campaignCategoryAllowed(c, state) &&
      tier >= (c.tierMin ?? 0) &&
      tier <= (c.tierMax ?? 99)
  );
}

export function refreshGrowthCampaignOffers(state) {
  if (!state.growth) state.growth = { campaignsThisMonth: [] };
  const pool = eligibleCampaignPool(state);
  const recent = state.growth.recentCampaignIds ?? [];
  const offerCount = growthMonthlyOfferCount(state);
  let offers = pickMonthlyCampaignDefs(pool, offerCount, recent);

  if (isPublicCompany(state)) {
    const whalePool = pool.filter((c) => c.whale === true);
    const whaleTarget = whalePool.length >= 2 ? 2 : whalePool.length ? 1 : 0;
    let whalesOnRoster = offers.filter((c) => c.whale).length;
    const cooldownLen = offerCount * GROWTH_CAMPAIGN_COOLDOWN_MONTHS;
    const recentSet = new Set((recent ?? []).slice(-cooldownLen));
    while (whalesOnRoster < whaleTarget && whalePool.length) {
      const candidates = whalePool.filter((c) => !offers.some((o) => o.id === c.id));
      if (!candidates.length) break;
      const fresh = candidates.filter((c) => !recentSet.has(c.id));
      const pickFrom = fresh.length ? fresh : candidates;
      const pick = shuffle(pickFrom)[0];
      offers = mergeUniqueCampaignOffers(offers, pick, offerCount);
      whalesOnRoster += 1;
    }

    const megaPool = pool.filter((c) => isMegawhalePlay(c));
    let megasOnRoster = offers.filter((c) => isMegawhalePlay(c)).length;
    while (megasOnRoster < 1 && megaPool.length) {
      const candidates = megaPool.filter((c) => !offers.some((o) => o.id === c.id));
      if (!candidates.length) break;
      const fresh = candidates.filter((c) => !recentSet.has(c.id));
      const pickFrom = fresh.length ? fresh : candidates;
      const pick = shuffle(pickFrom)[0];
      offers = mergeUniqueCampaignOffers(offers, pick, offerCount);
      megasOnRoster += 1;
    }
  }

  state.growth.monthCampaignOffers = offers.map((c) => c.id);
  state.growth.lastRosterWhaleCount = offers.filter((c) => c.whale === true).length;
  state.growth.lastRosterMegawhaleCount = offers.filter((c) => isMegawhalePlay(c)).length;
  return offers;
}

/** One-line log when the monthly growth roster refreshes. */
export function growthRosterRefreshLine(state) {
  const ids = state.growth?.monthCampaignOffers ?? [];
  const whales = state.growth?.lastRosterWhaleCount ?? 0;
  const megas = state.growth?.lastRosterMegawhaleCount ?? 0;
  if (!ids.length) return 'Growth roster: no paid plays unlocked this month.';
  const scale =
    megas > 0
      ? ` (${megas} megawhale${megas === 1 ? '' : 's'}${whales > megas ? `, ${whales} whale-scale` : ''})`
      : whales
        ? ` (${whales} whale-scale)`
        : '';
  return `Growth roster: ${ids.length} paid play${ids.length === 1 ? '' : 's'} available${scale}.`;
}

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
  if (!state.growth?.monthCampaignOffers?.length) {
    refreshGrowthCampaignOffers(state);
  }
  const used = new Set(state.growth?.campaignsThisMonth ?? []);
  const offerIds = new Set(state.growth.monthCampaignOffers ?? []);
  return getGrowthCampaigns().filter((c) => offerIds.has(c.id) && !used.has(c.id));
}

export function runGrowthCampaign(state, campaignId) {
  const def = getGrowthCampaigns().find((c) => c.id === campaignId);
  if (!def) return { ok: false, reason: 'Unknown campaign.' };
  const tier = progressionTierForUnlocks(state);
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
  if (!state.growth.monthCampaignOffers?.length) {
    refreshGrowthCampaignOffers(state);
  }
  if (!state.growth.monthCampaignOffers?.includes(def.id)) {
    return { ok: false, reason: 'That play is not on this month\'s growth roster.' };
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
  const era = eraBaseRevenueScaleForCampaign(def, state);
  const revenue = Math.round(base * era * campaignRevenueMult(state));

  state.finance.cash -= cost;
  state.finance.cash += revenue;
  state.finance.lifetimeRevenue += revenue;
  if (revenue > 0) accrueFiscalRevenue(state, revenue);
  recordCashOutflow(state, cost, 'growth');
  state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + revenue;
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;
  state.product.buzz = (state.product.buzz ?? 0) + (def.buzz ?? 0);
  state.growth.campaignsThisMonth.push(def.id);
  const recent = state.growth.recentCampaignIds ?? [];
  state.growth.recentCampaignIds = [...recent, def.id].slice(
    -GROWTH_MONTHLY_OFFER_COUNT * GROWTH_CAMPAIGN_COOLDOWN_MONTHS
  );
  applyCampaignRivalEffects(state, def);
  if (isPublicCompany(state) && def.stockPct) {
    applyStockPctMove(state, def.stockPct);
  }

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
      .sort((a, b) => (b.revenue?.[1] ?? 0) - (a.revenue?.[1] ?? 0));
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
  refreshGrowthCampaignOffers(state);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderGrowthCampaignsBlock(state, options = {}) {
  const campaigns = availableCampaigns(state);
  const bankSize = growthCampaignCatalogSize();
  const mult = getTaskRevenueMultiplierPreview(state);
  const slots = growthCampaignSlots(state);
  const remaining = growthCampaignsRemaining(state);
  const slotLabel =
    options.slotLabel ??
    (remaining === Infinity ? 'Unlimited' : `${remaining}/${formatMonthlySideTaskLimit(slots)}`);
  const rosterSize = state.growth?.monthCampaignOffers?.length ?? campaigns.length;
  const launched = options.launchedThisMonth ?? state.growth?.campaignsThisMonth?.length ?? 0;

  if (!campaigns.length) {
    return `<section class="finance-section growth-channel-section growth-channel-section--paid">
      <div class="finance-section-head growth-section-head">
        <h3 class="finance-section-title">Paid campaigns</h3>
        <span class="growth-channel-badge growth-channel-badge--inline growth-channel-badge--paid">Campaign meter · ${escapeHtml(slotLabel)}</span>
      </div>
      <p class="fine-print">No paid campaigns unlocked yet — keep scaling funding tier (${bankSize} in bank).</p>
    </section>`;
  }

  const sorted = [...campaigns].sort((a, b) => (b.revenue?.[1] ?? 0) - (a.revenue?.[1] ?? 0));
  const cards = sorted
    .map((c) => {
      const r0 = Math.round((c.revenue?.[0] ?? 0) * mult * 0.5);
      const r1 = Math.round((c.revenue?.[1] ?? 0) * mult);
      const whaleTag = isMegawhalePlay(c)
        ? ' <span class="task-tag">Megawhale</span>'
        : c.whale || (c.revenue?.[1] ?? 0) >= 500_000_000
          ? ' <span class="task-tag">Whale</span>'
          : '';
      const stockHint =
        c.stockPct && isPublicCompany(state)
          ? ` · stock ${c.stockPct > 0 ? '+' : ''}${Math.round(Number(c.stockPct) * 100)}%`
          : '';
      return `<div class="finance-action growth-play-card growth-play-card--paid">
        <p><strong>${escapeHtml(c.title)}</strong>${whaleTag} — ${escapeHtml(c.description)}</p>
        <p class="fine-print">Cost ${formatMoney(c.cost)} · typical book ${formatMoney(r0)}–${formatMoney(r1)} at ${mult.toFixed(2)}× · buzz +${c.buzz ?? 0}${stockHint}</p>
        <button type="button" class="btn btn-primary btn-small" data-run-growth="${escapeHtml(c.id)}">Launch campaign</button>
      </div>`;
    })
    .join('');

  return `<section class="finance-section growth-channel-section growth-channel-section--paid" aria-labelledby="growth-paid-campaigns-heading">
    <div class="finance-section-head growth-section-head">
      <h3 class="finance-section-title" id="growth-paid-campaigns-heading">Paid campaigns</h3>
      <span class="growth-channel-badge growth-channel-badge--inline growth-channel-badge--paid">Campaign meter · ${escapeHtml(slotLabel)}</span>
    </div>
    <p class="fine-print">${launched ? `${launched} launched this month · ` : ''}${campaigns.length} on roster (${rosterSize} offered · ${bankSize} in bank · ${GROWTH_CAMPAIGN_COOLDOWN_MONTHS}-mo cooldown).</p>
    <div class="growth-play-list">${cards}</div>
  </section>`;
}
