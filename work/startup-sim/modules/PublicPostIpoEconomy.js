import { formatMoney } from './constants.js';
import { isPublicCompany, marketCap } from './IPO.js';

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
  const blended = monthsRamp * 0.52 + capRamp * 0.48;
  return Math.min(1, Math.max(0, Math.round(blended * 1000) / 1000));
}

/** Scale instant stock moves (desk, IR, board) — floor 15% of catalog pct at IPO. */
export function scalePublicStockPctMove(state, pct) {
  if (!pct || !isPublicCompany(state)) return pct;
  const heat = publicWealthHeat(state);
  const floor = 0.15;
  const scale = floor + (1 - floor) * heat;
  return Number(pct) * scale;
}

/** Monthly tick magnitude scale (fundamentals still drift; tape is calmer early). */
export function scalePublicMonthlyDelta(state, deltaPct) {
  if (!isPublicCompany(state)) return deltaPct;
  const heat = publicWealthHeat(state);
  const floor = 0.22;
  const scale = floor + (1 - floor) * heat;
  return deltaPct * scale;
}

/** Model P/S ceiling eases up with heat (IPO starts capped). */
export function publicFundamentalPsCap(state) {
  const heat = publicWealthHeat(state);
  return 9 + heat * 17;
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
  return `${tier} · cap ${formatMoney(cap)} · public wealth heat ${pct}% (desk payouts and stock moves scale with heat).`;
}
