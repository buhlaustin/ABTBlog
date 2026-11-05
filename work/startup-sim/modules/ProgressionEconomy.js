import { getArr, getWorkspaceTier, WORKSPACE_TIER } from './Workspace.js';
import { isPublicCompany } from './IPO.js';

/** 0=pre-scale … 7=public — gates task `tier` bands in tasks.json. */
export function progressionTier(state) {
  if (state.flags?.ipoFiled) return 7;
  if (state.offices?.hubId) return 6;
  if (getWorkspaceTier(state) === WORKSPACE_TIER.CAMPUS) return 5;
  if (state.flags?.seriesFClosed) return 6;
  if (state.flags?.seriesEClosed) return 6;
  if (state.flags?.seriesDClosed) return 5;
  if (state.flags?.seriesCClosed) return 5;
  if (state.flags?.seriesBClosed) return 4;
  if (state.flags?.seriesAClosed) return 3;
  if (state.flags?.seedRoundClosed) return 2;
  if (state.flags?.xcResidencyComplete) return 1;
  return 0;
}

const TIER_LABELS = [
  'Early startup',
  'Post-batch scaling',
  'Seed stage',
  'Series A scale',
  'Series B growth',
  'Company HQ era',
  'Global hub sprint',
  'Public company'
];

export function progressionTierLabel(state) {
  return TIER_LABELS[progressionTier(state)] ?? 'Scaling';
}

export function progressionTierLabelAt(tier) {
  return TIER_LABELS[tier] ?? 'Scaling';
}

/**
 * Canonical base revenue bands (before rev×) and booking headroom by progression tier.
 * Desk/growth catalog tasks are authored against these ranges.
 * @type {Array<{
 *   deskBase: [number, number];
 *   deskWhale?: [number, number];
 *   growthBase: [number, number];
 *   arrGuide: string;
 *   singleActionMrrShare: number | null;
 *   monthlyBookMrrShare: number | null;
 * }>}
 */
export const TIER_REVENUE_PROFILE = [
  {
    deskBase: [500, 18_000],
    growthBase: [400, 24_000],
    arrGuide: 'Garage · pre-$100k ARR',
    singleActionMrrShare: null,
    monthlyBookMrrShare: null
  },
  {
    deskBase: [4_000, 27_000],
    growthBase: [2_500, 72_000],
    arrGuide: 'Post-XC batch · ~$100k+ ARR',
    singleActionMrrShare: null,
    monthlyBookMrrShare: null
  },
  {
    deskBase: [8_000, 58_000],
    growthBase: [9_000, 185_000],
    arrGuide: 'Seed closed · priced round + small office',
    singleActionMrrShare: null,
    monthlyBookMrrShare: null
  },
  {
    deskBase: [20_000, 185_000],
    growthBase: [35_000, 420_000],
    arrGuide: 'Series A · national deals unlock',
    singleActionMrrShare: null,
    monthlyBookMrrShare: null
  },
  {
    deskBase: [35_000, 360_000],
    growthBase: [65_000, 1_800_000],
    arrGuide: 'Series B · brand-scale campaigns',
    singleActionMrrShare: null,
    monthlyBookMrrShare: null
  },
  {
    deskBase: [80_000, 520_000],
    growthBase: [120_000, 5_800_000],
    arrGuide: 'Campus HQ · $12M+ ARR footprint',
    singleActionMrrShare: 0.11,
    monthlyBookMrrShare: 0.5
  },
  {
    deskBase: [200_000, 530_000],
    growthBase: [380_000, 12_000_000],
    arrGuide: 'Global hub · $500M+ ARR gate',
    singleActionMrrShare: 0.085,
    monthlyBookMrrShare: 0.42
  },
  {
    deskBase: [85_000, 1_200_000],
    deskWhale: [8_000_000, 35_000_000],
    growthBase: [380_000, 12_000_000],
    arrGuide: 'Public · IPO desk + institutional growth',
    singleActionMrrShare: 0.035,
    monthlyBookMrrShare: 0.28
  }
];

export function getTierRevenueProfile(tier) {
  const t = Math.max(0, Math.min(7, Math.round(Number(tier) || 0)));
  return TIER_REVENUE_PROFILE[t];
}

/** Multiplier stack for desk tasks + growth campaigns — path to $1B ARR. */
export function progressionRevenueMult(state) {
  let m = 1;
  if (state.flags?.xcResidencyComplete) m *= 1.35;
  if (state.flags?.seedRoundClosed) m *= 2.2;
  if (state.flags?.seriesAClosed) m *= 5;
  if (state.flags?.seriesBClosed) m *= 3.5;
  if (state.flags?.seriesCClosed) m *= 2.2;
  if (state.flags?.seriesDClosed) m *= 1.8;
  if (state.flags?.seriesEClosed) m *= 1.5;
  if (state.flags?.seriesFClosed) m *= 1.35;

  const tier = getWorkspaceTier(state);
  if (tier === WORKSPACE_TIER.CAMPUS) m *= 2.5;
  if (tier === WORKSPACE_TIER.HUB) m *= 4;

  if (isPublicCompany(state)) m *= 6;

  /** Flat ARR milestones — no continuous feedback from monthly desk revenue. */
  const arr = getArr(state);
  if (arr >= 1_000_000) m *= 1.05;
  if (arr >= 10_000_000) m *= 1.08;
  if (arr >= 100_000_000) m *= 1.1;

  return Math.round(m * 100) / 100;
}
