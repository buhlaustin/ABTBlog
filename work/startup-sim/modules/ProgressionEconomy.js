import { getArr, getWorkspaceTier, WORKSPACE_TIER } from './Workspace.js';
import { isPublicCompany } from './IPO.js';
import { publicWealthHeat } from './PublicPostIpoEconomy.js';

/** True when the company listed after Series A without closing Series B. */
export function skippedSeriesBToIpo(state) {
  return Boolean(
    state.flags?.seriesAClosed &&
      !state.flags?.seriesBClosed &&
      (state.flags?.ipoFiled || isPublicCompany(state))
  );
}

/**
 * Tier for catalog unlock gates (desk, growth, perks).
 * IPO on the Series A → public path satisfies "Series B or later" (tierMin ≥ 4) even without a B round.
 */
export function progressionTierForUnlocks(state) {
  const tier = progressionTier(state);
  if (skippedSeriesBToIpo(state) && tier < 4) return 7;
  return tier;
}

export function meetsProgressionTierMin(state, tierMin = 0) {
  const required = tierMin ?? 0;
  if (required <= 0) return true;
  return progressionTierForUnlocks(state) >= required;
}

/** 0=pre-scale … 7=public — gates task `tier` bands in tasks.json. */
export function progressionTier(state) {
  if (state.flags?.ipoFiled || isPublicCompany(state)) return 7;
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
 * Era scale for catalog base $ — same task id pays more as you progress (garage → IPO).
 * Applied to rolled desk/growth base before rev×.
 */
export const TIER_ERA_BASE_REVENUE_MULT = [
  1,
  2.5,
  6,
  18,
  55,
  160,
  420,
  1_200
];

/**
 * Illustrative native base bands per era (tier-native tasks, before era scale & rev×).
 * @type {Array<{ deskBase: [number, number]; deskWhale?: [number, number]; growthBase: [number, number]; arrGuide: string }>}
 */
export const TIER_REVENUE_PROFILE = [
  {
    deskBase: [500, 18_000],
    growthBase: [400, 24_000],
    arrGuide: 'Garage · pre-$100k ARR'
  },
  {
    deskBase: [4_000, 27_000],
    growthBase: [2_500, 72_000],
    arrGuide: 'Post-XC batch · ~$100k+ ARR'
  },
  {
    deskBase: [8_000, 58_000],
    growthBase: [9_000, 185_000],
    arrGuide: 'Seed closed · priced round + small office'
  },
  {
    deskBase: [20_000, 185_000],
    growthBase: [35_000, 420_000],
    arrGuide: 'Series A · national deals unlock'
  },
  {
    deskBase: [35_000, 360_000],
    growthBase: [65_000, 1_800_000],
    arrGuide: 'Series B · brand-scale campaigns'
  },
  {
    deskBase: [80_000, 520_000],
    growthBase: [120_000, 5_800_000],
    arrGuide: 'Campus HQ · $12M+ ARR footprint'
  },
  {
    deskBase: [200_000, 530_000],
    growthBase: [380_000, 12_000_000],
    arrGuide: 'Global hub · $500M+ ARR gate'
  },
  {
    deskBase: [25_000_000, 450_000_000],
    deskWhale: [500_000_000, 2_500_000_000],
    growthBase: [50_000_000, 800_000_000],
    arrGuide: 'Public · enterprise + institutional scale (billions/quarter path)'
  }
];

/** Which progression tier a task’s JSON base $ was written for (shared tasks scale up from here). */
export function taskCatalogAnchorTier(taskDef) {
  if (Number.isFinite(taskDef?.tierMin)) {
    return Math.max(0, Math.min(7, Math.round(taskDef.tierMin)));
  }
  const stages = taskDef?.stages ?? [];
  if (stages.length === 1 && stages[0] === 'public') return 7;
  if (stages.includes('public')) return 2;
  if (stages.includes('post_xc')) return 2;
  if (stages.includes('xc')) return 1;
  if (stages.includes('office')) return 1;
  return 0;
}

export function campaignCatalogAnchorTier(def) {
  if (Number.isFinite(def?.tierMin)) {
    return Math.max(0, Math.min(7, Math.round(def.tierMin)));
  }
  return 0;
}

/** Multiply rolled catalog base revenue so late-game repeats of early tasks pay like late-game. */
export function eraBaseRevenueScaleForTask(taskDef, state) {
  const tier = progressionTier(state);
  const anchor = taskCatalogAnchorTier(taskDef);
  const cur = TIER_ERA_BASE_REVENUE_MULT[tier] ?? 1;
  const anch = TIER_ERA_BASE_REVENUE_MULT[anchor] ?? 1;
  let scale = cur / anch;
  if (tier === 7 && isPublicCompany(state)) {
    const heat = publicWealthHeat(state);
    scale *= 0.2 + 0.8 * heat;
  }
  return scale;
}

export function eraBaseRevenueScaleForCampaign(def, state) {
  const tier = progressionTier(state);
  const anchor = campaignCatalogAnchorTier(def);
  const cur = TIER_ERA_BASE_REVENUE_MULT[tier] ?? 1;
  const anch = TIER_ERA_BASE_REVENUE_MULT[anchor] ?? 1;
  let scale = cur / anch;
  if (tier === 7 && isPublicCompany(state)) {
    const heat = publicWealthHeat(state);
    scale *= 0.15 + 0.55 * heat;
  }
  return scale;
}

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

  if (isPublicCompany(state)) {
    const heat = publicWealthHeat(state);
    m *= 1 + 0.75 * heat;
  }

  /** Flat ARR milestones — no continuous feedback from monthly desk revenue. */
  const arr = getArr(state);
  if (arr >= 1_000_000) m *= 1.05;
  if (arr >= 10_000_000) m *= 1.08;
  if (arr >= 100_000_000) m *= 1.1;

  return Math.round(m * 100) / 100;
}
