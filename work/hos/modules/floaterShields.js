import { getAllianceIds } from './allianceUtils.js';
import { PHASES } from './GameState.js';
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
 * @param {import('./Contestant.js').Contestant} c
 * @param {import('./GameState.js').GameState} state
 */
export function pawnSuitabilityScore(c, state) {
  let score = 0;
  if (isShieldPawn(c)) score += 22;
  if (isNominationFloater(c, state)) score += 14;
  if (c.personality?.id === 'floater') score += 9;
  score += Math.max(0, 44 - c.threat);
  return score;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {number} [limit]
 */
export function listPawnShieldTargets(state, limit = 5) {
  return state
    .getActiveContestants()
    .filter((c) => !c.isPlayer)
    .map((c) => ({ contestant: c, score: pawnSuitabilityScore(c, state) }))
    .filter((row) => row.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} guest
 */
export function getHouseguestFloaterMarks(state, guest) {
  if (!state || !guest || guest.isPlayer || guest.evicted) return [];

  /** @type {{ key: string, label: string, title: string }[]} */
  const marks = [];

  if (guest.personality?.id === 'floater') {
    marks.push({
      key: 'floater',
      label: 'Floater',
      title: `${guest.name} plays a classic floater game — common pawn nom.`
    });
  }

  if (state.difficulty !== 'easy') return marks;

  if (isShieldPawn(guest)) {
    marks.push({
      key: 'pawn',
      label: 'Pawn',
      title: `Shield pawn (threat ${guest.threat}) — AI HOHs love this profile on Easy.`
    });
  } else if (isNominationFloater(guest, state)) {
    marks.push({
      key: 'pawn-radar',
      label: 'Pawn radar',
      title: `Floater radar · threat ${guest.threat}, no alliance.`
    });
  }

  return marks;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildFloaterShieldIntelSection(state) {
  if (state.difficulty !== 'easy') return null;
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const targets = listPawnShieldTargets(state, 6);
  if (!targets.length) return null;

  return {
    id: 'pawn-radar',
    title: 'Pawn radar (Easy)',
    tone: 'neutral',
    items: targets.map(({ contestant: c }) => ({
      key: `pawn-${c.id}`,
      name: c.name,
      detail: describePawnRadarDetail(c, state)
    }))
  };
}

/**
 * @param {import('./Contestant.js').Contestant} c
 * @param {import('./GameState.js').GameState} state
 */
export function describePawnRadarDetail(c, state) {
  if (isShieldPawn(c)) return `Threat ${c.threat} · shield pawn`;
  if (c.personality?.id === 'floater') return `Threat ${c.threat} · Floater archetype`;
  if (isNominationFloater(c, state)) return `Threat ${c.threat} · floater radar`;
  return `Threat ${c.threat} · low-profile nom`;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {(hoh: import('./Contestant.js').Contestant, limit: number) => { target: import('./Contestant.js').Contestant }[]} previewLeans
 */
export function getPawnShieldWatchBanner(state, previewLeans) {
  if (state.difficulty !== 'easy') return '';
  const hoh = state.getActiveContestants().find((c) => c.isHOH && !c.isPlayer);
  if (!hoh || state.houseEventComplete || state.inFinale) return '';
  if (state.phase !== PHASES.SOCIAL && state.phase !== PHASES.NOMINATION) return '';
  if (typeof previewLeans !== 'function') return '';

  const leans = previewLeans(hoh, 3);
  const pawnNames = leans
    .filter((row) => isNominationFloater(row.target, state) || isShieldPawn(row.target))
    .map((row) => row.target.name);

  if (pawnNames.length >= 2) {
    return `Pawn watch · ${hoh.name} leans ${pawnNames.join(', ')} — shield pair possible`;
  }

  const player = state.getPlayer();
  if (pawnNames.length === 1 && player && !player.isHOH && player.threat >= 32) {
    return `Pawn watch · ${pawnNames[0]} may absorb a nom so ${player.name} stays safe`;
  }

  return '';
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function describeLastPawnShield(state) {
  if (state.difficulty !== 'easy' || !state.lastPawnShieldWeek) return null;
  const names = state.lastPawnShieldNomineeNames;
  if (names?.length === 2) {
    return `Last pawn block: Week ${state.lastPawnShieldWeek} (${names.join(' & ')}).`;
  }
  return `Last pawn block: Week ${state.lastPawnShieldWeek}.`;
}

export function recordPawnShieldNominations(state, nominees) {
  if (state.difficulty !== 'easy' || !nominees || nominees.length < 2) return;
  state.lastPawnShieldWeek = state.week;
  state.lastPawnShieldNomineeNames = nominees.map((n) => n.name);
  state.lastPawnShieldNomineeIds = nominees.map((n) => n.id);
}

/**
 * @param {import('./Contestant.js').Contestant} hoh
 * @param {import('./GameState.js').GameState} state
 */
export function formatPawnShieldSpyIntel(hoh, state) {
  if (state.difficulty !== 'easy' || !hoh?.isHOH) return null;
  const targets = listPawnShieldTargets(state, 2).map((t) => t.contestant.name);
  if (targets.length < 2) return null;
  return `${hoh.name}'s allies floated pawn names: <strong>${targets.join('</strong> and <strong>')}</strong> — bigger threats may skate.`;
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

  recordPawnShieldNominations(state, nominees);

  const names = nominees.map((n) => n.name).join(' and ');
  return {
    type: 'narrative',
    text: `The HOH put up a classic pawn pair — <strong>${names}</strong> absorb the block while bigger threats watch.`
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
  if (!second) return null;
  recordPawnShieldNominations(state, [first, second]);
  return [first, second];
}
