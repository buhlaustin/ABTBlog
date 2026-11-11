import { formatMoney } from './constants.js';
import { isPublicCompany, marketCap } from './IPO.js';
import { macroCapPressureRatio } from './PublicMarketRealism.js';
import { getArr } from './Workspace.js';

/** Paid growth rev× cap after listing (desk tasks can still use full career/sandbox cap). */
export const PUBLIC_GROWTH_REV_MULT_CAP_CAREER = 42;
export const PUBLIC_GROWTH_REV_MULT_CAP_SANDBOX = 88;

export function publicGrowthRevenueMultCap(state) {
  return state.mode === 'sandbox' ? PUBLIC_GROWTH_REV_MULT_CAP_SANDBOX : PUBLIC_GROWTH_REV_MULT_CAP_CAREER;
}

/** One campaign payout ceiling — fraction of spot MRR, ramps with wealth heat. */
export function publicGrowthPerCampaignRevenueCap(state) {
  const mrr = Math.max(state.finance?.mrr ?? 0, 1);
  const heat = publicWealthHeat(state);
  const frac = 0.035 + heat * 0.1;
  return Math.round(Math.max(mrr * 0.02, mrr * frac));
}

/** Total paid growth revenue allowed in a single month while public. */
export function publicGrowthMonthlyRevenueCap(state) {
  const mrr = Math.max(state.finance?.mrr ?? 0, 1);
  const arr = Math.max(getArr(state), mrr * 12);
  const heat = publicWealthHeat(state);
  const macroDrag = macroCapPressureRatio(marketCap(state)) * 0.5;
  const monthlyFrac = (0.1 + heat * 0.16) * (1 - macroDrag);
  return Math.round(Math.max(mrr * 0.06, (arr * monthlyFrac) / 12));
}

export function capPublicGrowthCampaignRevenue(state, rawRevenue) {
  if (!isPublicCompany(state)) return rawRevenue;
  const used = state.growth?.monthCampaignRevenue ?? 0;
  const monthlyCap = publicGrowthMonthlyRevenueCap(state);
  const perCap = publicGrowthPerCampaignRevenueCap(state);
  const room = Math.max(0, monthlyCap - used);
  return Math.max(0, Math.min(rawRevenue, perCap, room));
}

/** Post-IPO marketing bandwidth — never unlimited even at worldwide hub. */
export function publicGrowthCampaignSlotCap(state) {
  const heat = publicWealthHeat(state);
  return Math.min(8, Math.max(4, 4 + Math.round(heat * 4)));
}

/** Market-cap bands after listing — gates desk tasks and wealth heat. */
export const PUBLIC_CAP_TIER_LABELS = [
  'Recent lister',
  'Mid-cap',
  'Large-cap',
  'Upper large-cap',
  'Mega-cap',
  'Global mega-cap'
];

const PUBLIC_CAP_TIER_FLOORS = [
  0,
  500_000_000,
  2_000_000_000,
  10_000_000_000,
  50_000_000_000,
  200_000_000_000
];

export function publicCapTier(state) {
  if (!isPublicCompany(state)) return 0;
  const cap = Math.max(0, marketCap(state));
  let tier = 0;
  for (let i = 1; i < PUBLIC_CAP_TIER_FLOORS.length; i += 1) {
    if (cap >= PUBLIC_CAP_TIER_FLOORS[i]) tier = i;
  }
  return tier;
}

export function publicCapTierLabel(state) {
  return PUBLIC_CAP_TIER_LABELS[publicCapTier(state)] ?? PUBLIC_CAP_TIER_LABELS[0];
}

/**
 * 0 → 1 “wealth heat” — how much of full public-market payout / stock sensitivity is active.
 * Ramps with months public and market-cap tier so IPO does not instantly mint trillionaires.
 */
export function publicWealthHeat(state) {
  if (!isPublicCompany(state)) return 0;
  const months = Math.max(0, state.publicMarket?.monthsPublic ?? 0);
  const monthsRamp = 1 - Math.exp(-months / 20);
  const tier = publicCapTier(state);
  const capRamp = (tier + 1) / PUBLIC_CAP_TIER_LABELS.length;
  const macroDrag = macroCapPressureRatio(marketCap(state)) * 0.35;
  const blended = monthsRamp * 0.52 + capRamp * 0.48;
  return Math.min(1, Math.max(0, Math.round((blended * (1 - macroDrag)) * 1000) / 1000));
}

/** Monthly tick magnitude scale (fundamentals still drift; tape is calmer early). */
export function scalePublicMonthlyDelta(state, deltaPct) {
  if (!isPublicCompany(state)) return deltaPct;
  const heat = publicWealthHeat(state);
  const months = state.publicMarket?.monthsPublic ?? 0;
  const early = months <= 3 ? 0.45 : months <= 6 ? 0.62 : 0.78;
  const scale = early * (0.1 + 0.9 * heat);
  return deltaPct * scale;
}

/** Model P/S ceiling eases up with heat (IPO starts capped). */
export function publicFundamentalPsCap(state) {
  const heat = publicWealthHeat(state);
  return 6.5 + heat * 14;
}

/** Max founder block sold per trade (%), ramping with heat. */
export function publicFounderSellPctCap(state) {
  const heat = publicWealthHeat(state);
  return Math.max(2, Math.min(28, Math.round(2 + heat * 26)));
}

export function postIpoDeskEngineNote(state) {
  if (!isPublicCompany(state)) return null;
  const heat = publicWealthHeat(state);
  const tier = publicCapTierLabel(state);
  const cap = marketCap(state);
  const pct = Math.round(heat * 100);
  return `${tier} · cap ${formatMoney(cap)} · wealth heat ${pct}% (desk revenue ramps; stock sales face float depth at low heat).`;
}
