import { PHASES } from './GameState.js';
import { isNominationFloater, isShieldPawn } from './floaterShields.js';
import { getAllianceIds } from './allianceUtils.js';

export const THROW_COMP_SCORE_PENALTY = 16;

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} player
 */
export function canThrowCompetition(state, player) {
  if (!player || player.evicted || player.isNominated) return false;
  const phase = state.phase;
  if (phase !== PHASES.COMPETITION && phase !== PHASES.VETO_COMP) return false;
  if (state.playerThrowCompetition) return false;
  return true;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} player
 */
export function canSetBackdoorPlan(state, player) {
  if (!player?.isHOH || player.evicted) return false;
  const phase = state.phase;
  if (phase === PHASES.NOMINATION && !state.houseEventComplete) return true;
  if (phase === PHASES.SOCIAL) return true;
  if (
    (phase === PHASES.VETO_CEREMONY || phase === PHASES.VETO)
    && state.nominees?.length >= 1
  ) {
    return true;
  }
  return false;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} target
 */
export function getBackdoorNomLens(state, target) {
  if (!state?.backdoorTargetId) return '';
  if (target.id === state.backdoorTargetId) return 'Backdoor target';
  if (getAllianceIds(target).length > 0) return '';
  if (isShieldPawn(target) || isNominationFloater(target, state) || target.threat < 38) {
    return 'Pawn shield';
  }
  return '';
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getBackdoorPlanBanner(state, { html = false } = {}) {
  if (!state.backdoorTargetId) return '';
  const target = state.getContestant(state.backdoorTargetId);
  if (!target) return '';
  const name = html ? `<strong>${target.name}</strong>` : target.name;
  return `Backdoor plan · true target ${name} — nominate pawns, veto, replace.`;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {string} replacementId
 */
export function buildBackdoorCompletionLine(state, replacementId) {
  if (!state.backdoorTargetId || replacementId !== state.backdoorTargetId) return null;
  const target = state.getContestant(replacementId);
  if (!target) return null;
  return {
    type: 'drama',
    text: `Backdoor complete — <strong>${target.name}</strong> hits the block with no chance to play for HOH or Veto this week.`
  };
}

export function clearThrowCompetitionIntent(state) {
  state.playerThrowCompetition = false;
}
