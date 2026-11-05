import { getWorkspaceTier, WORKSPACE_TIER } from './Workspace.js';
import { progressionTier } from './ProgressionEconomy.js';

export function isHubUnlimitedSideTasks(state) {
  return getWorkspaceTier(state) === WORKSPACE_TIER.HUB;
}

/** Cash product/growth levers per month (shared counter). Unlimited at worldwide hub. */
export function sideTaskPlaysPerMonth(state) {
  if (isHubUnlimitedSideTasks(state)) return Infinity;
  return computeSideTaskPlays(state);
}

function computeSideTaskPlays(state) {
  const tier = progressionTier(state);
  let n = 2 + tier;

  const level = state.product?.level ?? 0;
  const buzz = state.product?.buzz ?? 0;
  n += Math.floor(level / 3);
  n += Math.floor(buzz / 12);

  const head = state.staff?.headcountByDept ?? {};
  n += Math.min(2, Math.floor((head.marketing ?? 0) / 8));
  n += Math.min(2, Math.floor((head.product ?? 0) / 8));
  n += Math.min(1, Math.floor((head.engineering ?? 0) / 12));

  const ws = getWorkspaceTier(state);
  if (ws === WORKSPACE_TIER.MEDIUM || ws === WORKSPACE_TIER.LARGE) n += 1;
  if (ws === WORKSPACE_TIER.CAMPUS) n += 2;

  return Math.max(2, n);
}

/** Paid growth campaigns per month. Unlimited at worldwide hub. */
export function growthCampaignSlots(state) {
  if (isHubUnlimitedSideTasks(state)) return Infinity;
  const tier = progressionTier(state);
  let slots = 1 + Math.max(0, tier - 1);
  if (tier >= 3) slots += 1;
  if (tier >= 5) slots += 1;
  if (tier >= 7) slots += 3;

  slots += Math.floor((state.product?.buzz ?? 0) / 20);

  const marketing = state.staff?.headcountByDept?.marketing ?? 0;
  slots += Math.min(4, Math.floor(marketing / 6));

  const ws = getWorkspaceTier(state);
  if (ws === WORKSPACE_TIER.LARGE) slots += 1;
  if (ws === WORKSPACE_TIER.CAMPUS) slots += 1;

  return Math.max(1, slots);
}

export function formatMonthlySideTaskLimit(limit) {
  if (limit === Infinity || !Number.isFinite(limit)) return 'Unlimited';
  return String(limit);
}

export function sideTaskCapacityRemaining(limit, used) {
  if (limit === Infinity || !Number.isFinite(limit)) return Infinity;
  return Math.max(0, limit - used);
}

/** Short hint for Product / Growth panels. */
export function sideTaskLimitHint(state) {
  if (isHubUnlimitedSideTasks(state)) {
    return 'Worldwide hub — unlimited side plays this month (still pay cash per play).';
  }
  const tier = progressionTier(state);
  const plays = sideTaskPlaysPerMonth(state);
  const campaigns = growthCampaignSlots(state);
  return `Limits scale with funding tier (${tier}), product level, buzz, HQ tier, and headcount — now ${plays} lever play${plays === 1 ? '' : 's'} and ${campaigns} paid campaign${campaigns === 1 ? '' : 's'} per month. Hub city removes the cap.`;
}
