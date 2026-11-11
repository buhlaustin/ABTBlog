import { TUNING } from './Data.js';
import { derivePhase } from './GameState.js';
import { pushNews } from './GameState.js';
import { staffBonuses } from './Staff.js';

export const DEBATE_STYLES = [
  { id: 'wonky', label: 'Wonky & detailed', debateBonus: 2, gaffeRisk: 0.04, approval: [0, 2] },
  { id: 'balanced', label: 'Balanced & warm', debateBonus: 4, gaffeRisk: 0.06, approval: [1, 4] },
  { id: 'aggressive', label: 'Aggressive contrast', debateBonus: 5, gaffeRisk: 0.14, approval: [-1, 5] }
];

export function isDebateWeek(state) {
  const phase = derivePhase(state.week, state.candidate.party);
  if (TUNING.debateWeeksPrimary.includes(state.week) && (phase === 'primary' || phase === 'independent_primary')) {
    return true;
  }
  if (TUNING.debateWeeksGeneral.includes(state.week) && phase === 'general') return true;
  return false;
}

export function resolveDebatePerformance(state, styleId, rng) {
  const style = DEBATE_STYLES.find((s) => s.id === styleId) ?? DEBATE_STYLES[1];
  const staff = staffBonuses(state);
  const perf =
    (state.debateBuff ?? 0) +
    state.candidate.stats.debate / 8 +
    style.debateBonus +
    staff.debateInsight +
    rng.int(-2, 3);
  let delta = perf >= 12 ? 5 : perf >= 8 ? 2 : perf >= 5 ? 0 : -4;
  if (rng.chance(style.gaffeRisk + (state.resources.energy < TUNING.gaffeEnergyThreshold ? 0.08 : 0))) {
    delta -= 3;
    state.resources.scandal = Math.min(TUNING.scandalMax, (state.resources.scandal ?? 0) + 8);
    pushNews(state, 'Debate gaffe reel trends overnight.');
  } else {
    const appr = rng.int(style.approval[0], style.approval[1]);
    delta += appr;
  }
  state.resources.approval = Math.max(12, Math.min(72, (state.resources.approval ?? 44) + delta));
  state.resources.momentum = Math.max(0, Math.min(30, (state.resources.momentum ?? 0) + delta));
  state.debateBuff = Math.max(0, (state.debateBuff ?? 0) - 4);
  pushNews(state, `Debate (${style.label}): ${delta >= 2 ? 'strong closing' : delta < 0 ? 'tough reviews' : 'mixed spin'}.`, {
    approval: delta
  });
  state.debateResolvedWeek = state.week;
  return delta;
}
