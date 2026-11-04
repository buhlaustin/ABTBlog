import { REVENUE_GATES, STAGES, fixedCostsForStage } from './constants.js';
import { getEffectiveIpoGate } from './SandboxTuning.js';

/** Apply stage upgrades from revenue gates. */
const STAGE_RANK = {
  [STAGES.GARAGE]: 0,
  [STAGES.OFFICE]: 1,
  [STAGES.XC]: 2,
  [STAGES.POST_XC]: 3,
  [STAGES.PUBLIC]: 4
};

export function syncStageFromProgress(state) {
  const r = state.finance?.lifetimeRevenue ?? 0;
  let stage = state.stage;
  const rank = STAGE_RANK[stage] ?? 0;

  if (rank <= STAGE_RANK[STAGES.GARAGE] && r >= REVENUE_GATES.OFFICE) {
    stage = STAGES.OFFICE;
  }
  if (r >= REVENUE_GATES.XC) {
    state.flags.xcUnlocked = true;
  }
  if (r >= getEffectiveIpoGate(state)) {
    state.flags.ipoUnlocked = true;
  }
  if (state.flags?.ipoFiled) {
    stage = STAGES.PUBLIC;
  }

  if ((STAGE_RANK[stage] ?? 0) < STAGE_RANK[STAGES.XC] && state.flags?.xcAccepted) {
    stage = STAGES.XC;
  }
  if (state.offices?.hubId && (STAGE_RANK[stage] ?? 0) < STAGE_RANK[STAGES.POST_XC]) {
    stage = STAGES.POST_XC;
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
    lines.push('X Combinator unlocked — apply on the Finance tab.');
    state.flags.xcUnlockedLogged = true;
  }
  if (toStage === STAGES.PUBLIC && fromStage !== STAGES.PUBLIC) {
    lines.push('You are now a public company — watch the stock price each month on Finance.');
  }
  return lines;
}

export function onIpoUnlocked(state) {
  const lines = [];
  if (state.flags?.ipoUnlocked && !state.flags?.ipoUnlockedLogged) {
    lines.push('IPO window unlocked — file on the Finance tab when ready.');
    state.flags.ipoUnlockedLogged = true;
  }
  return lines;
}

export function nextRevenueMilestone(state) {
  const r = state.finance?.lifetimeRevenue ?? 0;
  if (r < REVENUE_GATES.OFFICE) return { label: 'Small office', amount: REVENUE_GATES.OFFICE };
  if (r < REVENUE_GATES.XC) return { label: 'X Combinator', amount: REVENUE_GATES.XC };
  const ipoGate = getEffectiveIpoGate(state);
  if (r < ipoGate) return { label: 'IPO eligibility', amount: ipoGate };
  if (!state.flags?.ipoFiled) return { label: 'File IPO', amount: ipoGate };
  return { label: 'Grow stock / cash out', amount: null };
}
