import { REVENUE_GATES, STAGES } from './GameState.js';
import { fixedCostsForStage } from './GameState.js';

/** Apply stage upgrades from revenue gates. */
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

/** @returns {string[]} log lines for the month feed */
export function onStageChange(state, fromStage, toStage) {
  const lines = [];
  if (fromStage === STAGES.GARAGE && toStage === STAGES.OFFICE) {
    state.finance.fixedCostsMonthly = fixedCostsForStage(STAGES.OFFICE);
    lines.push('Unlocked small office — higher fixed costs, more task slots next month.');
  }
  if (state.flags.xcUnlocked && !state.flags.xcUnlockedLogged) {
    lines.push('X Combinator unlocked — accept the SAFE on the Finance tab.');
    state.flags.xcUnlockedLogged = true;
  }
  return lines;
}

export function nextRevenueMilestone(state) {
  const r = state.finance?.lifetimeRevenue ?? 0;
  if (r < REVENUE_GATES.OFFICE) return { label: 'Small office', amount: REVENUE_GATES.OFFICE };
  if (r < REVENUE_GATES.XC) return { label: 'X Combinator', amount: REVENUE_GATES.XC };
  if (r < REVENUE_GATES.IPO) return { label: 'IPO eligibility', amount: REVENUE_GATES.IPO };
  return null;
}
