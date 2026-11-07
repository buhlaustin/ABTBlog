import { getAllianceIds, sharesAllianceWith } from './allianceUtils.js';
import { randomInt } from './utils.js';

/** Short player-facing copy keyed by `personality.strategy`. */
export const HOH_NOM_PERSONA_HINTS = {
  manipulate: 'plays a backdoor game — often targets the biggest threats',
  ally: 'is a loyalist — shields allies and puts outsiders on the block',
  befriend: 'runs a social game — tends to nominate people outside their circle',
  attack: 'plays aggressively — likes putting fierce players on the block',
  chaos: 'is a wildcard — nominations can surprise the house',
  survive: 'floats strategically — often nominates quiet threats and floaters',
  win: 'plays physically — targets comp beasts',
  custom: 'picks targets based on the week'
};

/**
 * @param {import('./Contestant.js').Contestant} hoh
 * @param {import('./Contestant.js').Contestant} target
 * @param {number} baseScore
 */
export function applyHohPersonaNominationBias(hoh, target, baseScore) {
  const strat = hoh.personality?.strategy || 'survive';
  let score = baseScore;
  const targetAlliances = getAllianceIds(target).length;
  const isFloater = targetAlliances === 0 && target.threat >= 20 && target.threat <= 50;
  const rel = hoh.getRelationship(target.id);

  switch (strat) {
    case 'manipulate':
      score += target.threat * 0.4;
      if (target.threat >= 50) score += 14;
      if (target.competition >= 7) score += 10;
      if (sharesAllianceWith(hoh, target) && rel > 20) score += 8;
      break;
    case 'ally':
      if (!sharesAllianceWith(hoh, target) && getAllianceIds(hoh).length > 0) score += 16;
      if (targetAlliances > 0 && !sharesAllianceWith(hoh, target)) score += 12;
      if (rel < -5) score += 6;
      break;
    case 'befriend':
      if (rel < 5) score += 10;
      if (isFloater) score += 9;
      if (target.social >= 7 && rel < 15) score += 6;
      break;
    case 'attack':
      score += target.aggression * 2.2;
      if (target.threat >= 35) score += 12;
      if (target.aggression >= 7) score += 8;
      break;
    case 'chaos':
      score += randomInt(-14, 20);
      if (Math.random() < 0.22) score += 22;
      if (target.isPlayer && Math.random() < 0.15) score += 18;
      break;
    case 'survive':
      if (isFloater) score += 18;
      if (targetAlliances === 0) score += 8;
      if (target.competition <= 5 && target.threat >= 28) score += 10;
      break;
    case 'win':
      score += target.competition * 2.5;
      if (target.competition >= 8) score += 14;
      if (target.threat >= 45) score += 6;
      break;
    default:
      break;
  }

  return score;
}

/**
 * @param {import('./Contestant.js').Contestant} hoh
 */
export function getHohNominationStyleLine(hoh) {
  const archetype = hoh.personality?.name || 'Houseguest';
  const hint = HOH_NOM_PERSONA_HINTS[hoh.personality?.strategy] || HOH_NOM_PERSONA_HINTS.survive;
  return `<strong>${hoh.name}</strong> (${archetype}) ${hint}.`;
}

/**
 * @param {import('./Contestant.js').Contestant} hoh
 * @param {import('./Contestant.js').Contestant} target
 */
export function describeNominationReason(hoh, target) {
  const strat = hoh.personality?.strategy || 'survive';
  const rel = hoh.getRelationship(target.id);
  const targetAlliances = getAllianceIds(target).length;

  switch (strat) {
    case 'manipulate':
      if (target.threat >= 50) return 'calling them the biggest threat to backdoor';
      if (target.competition >= 8) return 'targeting their comp dominance';
      return 'framing the move as “best for their game”';
    case 'ally':
      if (!sharesAllianceWith(hoh, target) && targetAlliances > 0) return 'going after a rival alliance';
      if (rel < 0) return 'saying loyalty only goes so far';
      return 'putting the house agenda first';
    case 'befriend':
      if (rel < 10) return 'saying they never clicked socially';
      return 'calling them a game liability';
    case 'attack':
      if (target.aggression >= 7) return 'tired of their aggressive play';
      return 'making a statement to the house';
    case 'chaos':
      return pickChaosReason();
    case 'survive':
      if (targetAlliances === 0) return 'labeling them a dangerous floater';
      return 'playing it safe with a mid-threat target';
    case 'win':
      if (target.competition >= 8) return 'not letting another comp win slip away';
      return 'testing the field';
    default:
      return 'citing threat level';
  }
}

function pickChaosReason() {
  return randomInt(0, 1) === 0 ? 'offering no explanation at all' : 'claiming “the universe chose”';
}

/**
 * Tooltip text when an HOH is listed in the sidebar.
 * @param {import('./Contestant.js').Contestant} hoh
 */
export function getHohNomPersonaTooltip(hoh) {
  if (!hoh?.isHOH) return '';
  const hint = HOH_NOM_PERSONA_HINTS[hoh.personality?.strategy] || HOH_NOM_PERSONA_HINTS.survive;
  return `${hoh.name} as HOH: ${hint}`;
}
