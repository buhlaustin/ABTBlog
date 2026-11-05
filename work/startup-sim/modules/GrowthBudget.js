import {
  growthCampaignSlots,
  sideTaskCapacityRemaining
} from './SideTaskProgression.js';

export { growthCampaignSlots };

export function growthCampaignsRemaining(state) {
  const used = state.growth?.campaignsThisMonth?.length ?? 0;
  return sideTaskCapacityRemaining(growthCampaignSlots(state), used);
}
