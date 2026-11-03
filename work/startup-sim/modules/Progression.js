import { REVENUE_GATES, STAGES } from './GameState.js';

export function stageFromRevenue(lifetimeRevenue) {
  const r = Number(lifetimeRevenue) || 0;
  if (r >= REVENUE_GATES.IPO) return STAGES.PUBLIC;
  return null;
}

/** Apply stage upgrades from revenue gates (Phase 1+). */
export function syncStageFromProgress(state) {
  const r = state.finance?.lifetimeRevenue ?? 0;
  let stage = state.stage;

  if (stage === STAGES.GARAGE && r >= REVENUE_GATES.OFFICE) {
    stage = STAGES.OFFICE;
  }
  if ((stage === STAGES.GARAGE || stage === STAGES.OFFICE) && r >= REVENUE_GATES.XC) {
    state.flags.xcUnlocked = true;
  }
  if (r >= REVENUE_GATES.IPO) {
    state.flags.ipoUnlocked = true;
  }

  state.stage = stage;
  return state;
}

export function nextRevenueMilestone(state) {
  const r = state.finance?.lifetimeRevenue ?? 0;
  if (r < REVENUE_GATES.OFFICE) return { label: 'Small office', amount: REVENUE_GATES.OFFICE };
  if (r < REVENUE_GATES.XC) return { label: 'X Combinator', amount: REVENUE_GATES.XC };
  if (r < REVENUE_GATES.IPO) return { label: 'IPO eligibility', amount: REVENUE_GATES.IPO };
  return null;
}
