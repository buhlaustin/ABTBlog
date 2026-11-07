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

const INFERRED_PERSONA_LABELS = {
  manipulate: 'Strategist',
  ally: 'Loyalist',
  befriend: 'Social Butterfly',
  attack: 'Aggressor',
  chaos: 'Wildcard',
  survive: 'Floater',
  win: 'Competitor'
};

/**
 * Guess how the human player tends to nominate from current stats.
 */
export function inferPlayerNomPersona(player) {
  const scores = [
    { strategy: 'manipulate', score: player.intelligence * 1.25 + player.threat * 0.35 },
    { strategy: 'ally', score: player.loyalty * 1.35 + player.trust * 0.25 },
    { strategy: 'befriend', score: player.social * 1.45 + player.reputation * 0.2 },
    { strategy: 'attack', score: player.aggression * 1.55 },
    { strategy: 'win', score: player.competition * 1.4 },
    { strategy: 'survive', score: (10 - player.aggression) * 0.8 + player.social * 0.35 },
    { strategy: 'chaos', score: player.aggression * 0.6 + randomInt(6, 14) }
  ];
  scores.sort((a, b) => b.score - a.score);
  const strategy = scores[0].strategy;
  return {
    strategy,
    label: INFERRED_PERSONA_LABELS[strategy] || 'Houseguest',
    hint: HOH_NOM_PERSONA_HINTS[strategy] || HOH_NOM_PERSONA_HINTS.survive
  };
}

/** Contestant-shaped lens for applying persona bias to the human HOH. */
export function buildPlayerHohLens(player) {
  const inferred = inferPlayerNomPersona(player);
  const lens = Object.create(Object.getPrototypeOf(player));
  Object.assign(lens, player, {
    personality: {
      ...(player.personality || {}),
      strategy: inferred.strategy,
      name: inferred.label
    }
  });
  return lens;
}

export function getNomTargetLensLabel(hoh, target) {
  let score = target.threat + Math.max(0, -hoh.getRelationship(target.id) / 3);
  score = applyHohPersonaNominationBias(hoh, target, score);
  if (sharesAllianceWith(hoh, target)) return 'Ally — risky';
  if (score >= 44) return 'Strong fit';
  if (score >= 32) return 'On-brand';
  if (target.threat >= 52) return 'Big threat';
  if (getAllianceIds(target).length === 0 && target.threat >= 22) return 'Floater radar';
  return '';
}

export function getPlayerHohPickerIntro(player) {
  const inferred = inferPlayerNomPersona(player);
  return `Your stats read like a <strong>${inferred.label}</strong> HOH — you ${inferred.hint}. Tags below show who fits that style.`;
}

/**
 * @param {import('./Contestant.js').Contestant} hoh
 * @param {import('./Contestant.js').Contestant[]} nominees
 */
export function getLocalNominationHostBeat(hoh, nominees) {
  if (!hoh || nominees.length < 2) return null;
  const a = nominees[0].name;
  const b = nominees[1].name;
  const strat = hoh.personality?.strategy || 'survive';
  const hostLines = {
    manipulate: `${hoh.name} just backdoored ${a} and ${b}. The house knows it was calculated.`,
    ally: `${hoh.name} keeps the alliance safe and puts ${a} and ${b} on blast.`,
    befriend: `Social lines are drawn — ${a} and ${b} are on the block after ${hoh.name}'s picks.`,
    attack: `${hoh.name} swings hard: ${a} and ${b} are in the line of fire.`,
    chaos: `Nobody saw this pair coming — ${a} and ${b}, courtesy of ${hoh.name}.`,
    survive: `${hoh.name} floats to safety and tosses ${a} and ${b} on the block.`,
    win: `${hoh.name} targets the threats: ${a} and ${b} have to fight for their lives.`,
    custom: `The block is set: ${a} and ${b}, chosen by ${hoh.name}.`
  };
  const line = hostLines[strat] || hostLines.survive;
  return {
    type: 'ai-host',
    text: `<strong>Host:</strong> ${line}`
  };
}

export function formatHohNomIntelLine(hoh) {
  const hint = HOH_NOM_PERSONA_HINTS[hoh.personality?.strategy] || HOH_NOM_PERSONA_HINTS.survive;
  return `As HOH, ${hoh.name} ${hint}.`;
}
