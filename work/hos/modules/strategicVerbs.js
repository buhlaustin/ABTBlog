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
  const progress = getBackdoorProgressLabel(state);
  const progressBit = progress ? ` · ${progress}` : '';
  return `Backdoor plan · true target ${name}${progressBit}`;
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

export function canCancelThrowCompetition(state, player) {
  if (!state.playerThrowCompetition) return false;
  const phase = state.phase;
  return phase === PHASES.COMPETITION || phase === PHASES.VETO_COMP;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} player
 */
export function canClearBackdoorPlan(state, player) {
  return Boolean(state.backdoorTargetId && player?.isHOH && canSetBackdoorPlan(state, player));
}

/**
 * @param {import('./Contestant.js').Contestant} target
 * @param {import('./GameState.js').GameState} state
 */
export function isPawnLikeNominee(target, state) {
  if (!target || target.id === state.backdoorTargetId) return false;
  return isShieldPawn(target) || isNominationFloater(target, state) || target.threat < 36;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant[]} nominees
 */
export function validateBackdoorNominations(state, nominees) {
  if (!state.backdoorTargetId || nominees.length < 2) {
    return { ok: true, feedLine: null };
  }

  const trueTarget = state.getContestant(state.backdoorTargetId);
  if (nominees.some((n) => n.id === state.backdoorTargetId)) {
    return {
      ok: false,
      feedLine: {
        type: 'warning',
        text: `Backdoor blown — <strong>${trueTarget?.name ?? 'your target'}</strong> is on the initial block.`
      }
    };
  }

  const pawnCount = nominees.filter((n) => isPawnLikeNominee(n, state)).length;
  if (pawnCount < 2) {
    return {
      ok: true,
      feedLine: {
        type: 'warning',
        text: 'Backdoor tip: ideal path is two pawn noms, veto one, then name your true target as replacement.'
      }
    };
  }

  state.backdoorPawnsLocked = true;
  return {
    ok: true,
    feedLine: {
      type: 'narrative',
      text: 'Pawn pair locked — veto ceremony opens the backdoor lane.'
    }
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getBackdoorStep(state) {
  if (!state.backdoorTargetId) return 0;
  const trueTargetOnBlock = state.nominees.includes(state.backdoorTargetId);
  if (trueTargetOnBlock) return 4;
  if (state.vetoUsed) return 3;
  if (state.backdoorPawnsLocked || state.nominees.length >= 2) return 2;
  return 1;
}

const BACKDOOR_STEP_LABELS = {
  1: 'mark true target',
  2: 'nominate pawn pair',
  3: 'veto a pawn',
  4: 'replace with target'
};

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getBackdoorProgressLabel(state) {
  const step = getBackdoorStep(state);
  if (step === 0) return '';
  const label = BACKDOOR_STEP_LABELS[step] || '';
  return `Backdoor step ${step}/4 · ${label}`;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getThrowCompBanner(state) {
  if (!state.playerThrowCompetition) return '';
  const label = state.phase === PHASES.VETO_COMP ? 'POV' : 'HOH';
  return `Throw comp armed · tanking ${label} on purpose`;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} vetoHolder
 */
export function getBackdoorVetoCeremonyHint(state, vetoHolder) {
  if (!state.backdoorTargetId || !vetoHolder) return '';
  const player = state.getPlayer();
  if (!player?.isHOH) return '';
  const trueTarget = state.getContestant(state.backdoorTargetId);
  const nominees = state.nominees
    .map((id) => state.getContestant(id))
    .filter(Boolean);
  const pawn = nominees.find((n) => isPawnLikeNominee(n, state));

  if (!pawn || !trueTarget) return '';

  if (vetoHolder.id === player.id) {
    return `Backdoor: veto <strong>${pawn.name}</strong>, then nominate <strong>${trueTarget.name}</strong>.`;
  }
  return `Backdoor: if <strong>${vetoHolder.name}</strong> vetoes <strong>${pawn.name}</strong>, name <strong>${trueTarget.name}</strong> as replacement.`;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function describeStrategicVerbThreatNote(state) {
  const parts = [];
  if (state.playerThrowCompetition) {
    parts.push('Throw comp armed — expect a weaker score.');
  }
  const step = getBackdoorStep(state);
  if (step > 0 && step < 4) {
    parts.push(getBackdoorProgressLabel(state));
  }
  return parts.length ? parts.join(' ') : null;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildStrategicVerbsIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  /** @type {{ key: string, name: string, detail: string }[]} */
  const items = [];

  if (state.playerThrowCompetition) {
    const label = state.phase === PHASES.VETO_COMP ? 'POV comp' : 'HOH comp';
    items.push({
      key: 'throw-armed',
      name: 'Throw comp',
      detail: `${label} — intentional tank (penalty ~${THROW_COMP_SCORE_PENALTY} score)`
    });
  }

  if (state.backdoorTargetId) {
    const target = state.getContestant(state.backdoorTargetId);
    items.push({
      key: 'backdoor',
      name: 'Backdoor plan',
      detail: target
        ? `${getBackdoorProgressLabel(state)} · target ${target.name}`
        : getBackdoorProgressLabel(state)
    });
  }

  if (!items.length) return null;

  return {
    id: 'strategic-verbs',
    title: 'Strategic moves',
    tone: 'neutral',
    items
  };
}
