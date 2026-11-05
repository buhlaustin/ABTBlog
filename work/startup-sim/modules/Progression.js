import { STAGES } from './constants.js';
import { getEffectiveIpoGate } from './SandboxTuning.js';
import { ARR_GATES, getArr, syncProgressFlagsFromArr, getTaskStage } from './Workspace.js';

/** Apply narrative stage flags from ARR — no auto office upgrades. */
const STAGE_RANK = {
  [STAGES.GARAGE]: 0,
  [STAGES.OFFICE]: 1,
  [STAGES.XC]: 2,
  [STAGES.POST_XC]: 3,
  [STAGES.PUBLIC]: 4
};

export function syncStageFromProgress(state) {
  syncProgressFlagsFromArr(state);
  const arr = getArr(state);

  if (arr >= getEffectiveIpoGate(state)) {
    state.flags.ipoUnlocked = true;
  }

  let stage = getTaskStage(state);
  if (state.flags?.ipoFiled) {
    stage = STAGES.PUBLIC;
  }

  state.stage = stage;
  return state;
}

/** @returns {string[]} log lines for the month feed */
export function onStageChange(state, fromStage, toStage) {
  const lines = [];
  if (state.flags.xcUnlocked && !state.flags.xcUnlockedLogged) {
    lines.push('X Combinator unlocked — apply on the Finance tab at $100k ARR.');
    state.flags.xcUnlockedLogged = true;
  }
  if (toStage === STAGES.PUBLIC && fromStage !== STAGES.PUBLIC) {
    lines.push('You are now a public company — watch the stock price each month on Finance.');
  }
  if (fromStage === STAGES.XC && toStage === STAGES.POST_XC) {
    lines.push('Back from the batch — small office lease restored. Upgrade space on Finance when ARR allows.');
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
  const arr = getArr(state);
  const tier = state.workspace?.tier ?? 'garage';
  if (tier === 'garage' && arr < ARR_GATES.SMALL_OFFICE) {
    return { label: 'Small office lease', amount: ARR_GATES.SMALL_OFFICE, metric: 'ARR' };
  }
  if (!state.flags?.xcUnlocked && arr < ARR_GATES.XC) {
    return { label: 'X Combinator', amount: ARR_GATES.XC, metric: 'ARR' };
  }
  if (tier !== 'medium' && arr < ARR_GATES.MEDIUM_OFFICE) {
    return { label: 'Medium office', amount: ARR_GATES.MEDIUM_OFFICE, metric: 'ARR' };
  }
  if (tier !== 'campus' && arr < ARR_GATES.CAMPUS_HQ && state.flags?.seedRoundClosed) {
    return { label: 'Company HQ (100 seats)', amount: ARR_GATES.CAMPUS_HQ, metric: 'ARR' };
  }
  const ipoGate = getEffectiveIpoGate(state);
  if (arr < ipoGate) return { label: 'IPO eligibility', amount: ipoGate, metric: 'ARR' };
  if (!state.flags?.ipoFiled) return { label: 'File IPO', amount: ipoGate, metric: 'ARR' };
  return { label: 'Grow stock / cash out', amount: null, metric: 'ARR' };
}
