import { progressionTier } from './ProgressionEconomy.js';

/** Paid growth launches per month — scales with stage and marketing headcount. */
export function growthCampaignSlots(state) {
  const tier = progressionTier(state);
  let slots = 1;
  if (tier >= 2) slots = 2;
  if (tier >= 4) slots = 3;
  if (tier >= 6) slots = 4;
  if (tier >= 7) slots = 5;

  const marketing = state.staff?.headcountByDept?.marketing ?? 0;
  slots += Math.min(2, Math.floor(marketing / 10));

  return slots;
}

export function growthCampaignsRemaining(state) {
  const used = state.growth?.campaignsThisMonth?.length ?? 0;
  return Math.max(0, growthCampaignSlots(state) - used);
}
