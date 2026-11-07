import { getAllianceIds } from './allianceUtils.js';
import { PERSONALITY_TYPES, shuffle, weightedPick } from './utils.js';

export const FLOATER_THREAT_MIN = 20;
export const FLOATER_THREAT_MAX = 50;
export const SHIELD_PAWN_THREAT_MIN = 28;
export const SHIELD_PAWN_THREAT_MAX = 42;

const EASY_FLOATER_CAST_FRACTION = 0.28;
const EASY_FLOATER_CAST_MIN = 3;

/**
 * @param {import('./Contestant.js').Contestant} target
 * @param {import('./GameState.js').GameState} [house]
 */
export function isNominationFloater(target, house = null) {
  if (!target || target.isPlayer) return false;
  if (getAllianceIds(target).length > 0) return false;
  const t = target.threat;
  if (t < FLOATER_THREAT_MIN || t > FLOATER_THREAT_MAX) return false;
  if (target.personality?.id === 'floater') return true;
  if (target.personality?.strategy === 'survive' && t <= 45) return true;
  return t <= 38;
}

/**
 * Mid-threat alliance-free pawn AI HOHs use to shield the human on Easy.
 * @param {import('./Contestant.js').Contestant} target
 */
export function isShieldPawn(target) {
  if (!target || target.isPlayer) return false;
  if (getAllianceIds(target).length > 0) return false;
  const t = target.threat;
  return t >= SHIELD_PAWN_THREAT_MIN && t <= SHIELD_PAWN_THREAT_MAX;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} target
 */
export function easyFloaterNominationBonus(state, target) {
  if (state.difficulty !== 'easy' || target.isPlayer) return 0;
  let bonus = 0;
  if (isNominationFloater(target, state)) bonus += 10;
  if (isShieldPawn(target)) bonus += 9;
  if (target.personality?.id === 'floater') bonus += 5;
  if (target.threat >= SHIELD_PAWN_THREAT_MIN && target.threat <= SHIELD_PAWN_THREAT_MAX) {
    bonus += 4;
  }
  return bonus;
}

/**
 * @param {import('./GameState.js').GameState | { contestants: import('./Contestant.js').Contestant[] }} state
 */
export function countCastFloaters(state) {
  return state.contestants.filter(
    (c) => !c.isPlayer && c.personality?.id === 'floater'
  ).length;
}

/**
 * Skew Easy casts toward Floaters so shield pairs are available.
 * @param {import('./Contestant.js').Contestant[]} contestants
 * @param {string} difficulty
 */
export function ensureEasyCastFloaters(contestants, difficulty) {
  if (difficulty !== 'easy') return 0;
  const floaterType = PERSONALITY_TYPES.find((p) => p.id === 'floater');
  if (!floaterType) return 0;

  const ais = contestants.filter((c) => !c.isPlayer);
  const targetCount = Math.max(EASY_FLOATER_CAST_MIN, Math.round(ais.length * EASY_FLOATER_CAST_FRACTION));
  const current = countCastFloaters({ contestants });
  const need = targetCount - current;
  if (need <= 0) return 0;

  const candidates = shuffle(ais.filter((c) => c.personality?.id !== 'floater'));
  let swapped = 0;
  for (const c of candidates.slice(0, need)) {
    c.personality = { ...floaterType };
    c.competition = Math.max(1, c.competition - 1);
    swapped += 1;
  }
  return swapped;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function describeEasyFloaterShield(state) {
  if (state.difficulty !== 'easy') return null;
  const n = countCastFloaters(state);
  if (n < 2) return null;
  return `Easy mode: ${n} Floaters in the cast — AI HOHs often nominate pawn pairs instead of you.`;
}

/**
 * When AI HOH nominates two floaters/shield pawns on Easy.
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant[]} nominees
 */
export function getFloaterShieldCeremonyNote(state, nominees) {
  if (state.difficulty !== 'easy' || !nominees || nominees.length < 2) return null;
  if (nominees.some((n) => n.isPlayer)) return null;

  const bothShieldy = nominees.every(
    (n) => isNominationFloater(n, state) || isShieldPawn(n) || n.threat < 40
  );
  if (!bothShieldy) return null;

  const player = state.getPlayer();
  if (!player || player.isHOH) return null;

  return {
    type: 'narrative',
    text: 'The HOH put up a classic pawn pair — floaters absorbing the block while bigger threats watch.'
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} hoh
 * @param {import('./Contestant.js').Contestant[]} others
 * @param {(target: import('./Contestant.js').Contestant) => number} nominationPickWeight
 * @returns {import('./Contestant.js').Contestant[] | null}
 */
export function tryEasyFloaterShieldNominations(state, hoh, others, nominationPickWeight) {
  if (state.difficulty !== 'easy' || hoh.isPlayer) return null;

  const player = state.getPlayer();
  if (!player) return null;

  const pool = others.filter(
    (c) => !c.isPlayer && (isNominationFloater(c, state) || isShieldPawn(c) || c.threat < 36)
  );
  if (pool.length < 2) return null;

  const playerWeight = nominationPickWeight(player);
  const playerVisible = player.threat >= 30 || playerWeight >= 12;
  const chance = playerVisible ? 0.52 : 0.34;
  if (Math.random() > chance) return null;

  const pawnWeight = (t) => {
    let w = 8;
    if (isShieldPawn(t)) w += 14;
    if (isNominationFloater(t, state)) w += 10;
    if (t.personality?.id === 'floater') w += 8;
    w += Math.max(0, 44 - t.threat);
    return w;
  };

  const first = weightedPick(pool, pawnWeight);
  const rest = pool.filter((c) => c.id !== first.id);
  if (rest.length === 0) return null;
  const second = weightedPick(rest, pawnWeight);
  return second ? [first, second] : null;
}
