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
