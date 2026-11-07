/** Shared utilities for randomization, math, and text helpers. */

export const SAVE_VERSION = 2;

/** Jury begins when 10 houseguests remain; seven jurors are seated by Final 3 (16-person cast). */
export const JURY_START_HOUSE_COUNT = 10;

export const CAST_PRESETS = {
  legacy: {
    id: 'legacy',
    label: 'Legacy (11 HGs)',
    aiCount: 10,
    blurb: 'Shorter season — same jury rules as classic BB.',
    doubleEvictionAt: 7,
    defaultTwists: { doubleEviction: true, battleBack: false, mvpTwist: false }
  },
  quick: {
    id: 'quick',
    label: 'Quick (12 HGs)',
    aiCount: 11,
    blurb: 'Faster jury path with a 12-person cast.',
    defaultTwists: { doubleEviction: true, battleBack: false, mvpTwist: false }
  },
  standard: {
    id: 'standard',
    label: 'Standard (16 HGs)',
    aiCount: 15,
    default: true,
    blurb: 'Full 16-houseguest season — default twists below.',
    doubleEvictionAt: 8,
    defaultTwists: { doubleEviction: true, battleBack: false, mvpTwist: false }
  },
  brains: {
    id: 'brains',
    label: 'Brains (16 schemers)',
    aiCount: 15,
    blurb: 'Cast leans Strategist; AI gets +1 Intelligence. MVP week suggested.',
    personalityWeights: {
      strategist: 5,
      competitor: 1,
      loyalist: 1,
      social: 1,
      wildcard: 1
    },
    aiIntelligenceBonus: 1,
    defaultTwists: { doubleEviction: true, battleBack: false, mvpTwist: true }
  },
  supersized: {
    id: 'supersized',
    label: 'Supersized (20 HGs)',
    aiCount: 19,
    blurb: 'Biggest modern cast — jury begins at 12. Double eviction on.',
    juryStartHouseCount: 12,
    doubleEvictionAt: 10,
    defaultTwists: { doubleEviction: true, battleBack: false, mvpTwist: true }
  },
  megacast: {
    id: 'megacast',
    label: 'Mega cast (24 HGs)',
    aiCount: 23,
    blurb: 'Chaos volume — 24 houseguests, one winner; jury at 14.',
    juryStartHouseCount: 14,
    doubleEvictionAt: 12,
    defaultTwists: { doubleEviction: true, battleBack: true, mvpTwist: true }
  },
  all_stars: {
    id: 'all_stars',
    label: 'All-Stars + rookies (18)',
    aiCount: 17,
    blurb: 'Six returning legends vs twelve fresh faces — only one can win.',
    veteranCount: 6,
    juryStartHouseCount: 11,
    doubleEvictionAt: 9,
    veteranPersonalityWeights: {
      strategist: 3,
      competitor: 3,
      aggressor: 1,
      social: 1
    },
    rookiePersonalityWeights: {
      social: 2,
      floater: 2,
      wildcard: 2,
      loyalist: 1,
      strategist: 1
    },
    defaultTwists: { doubleEviction: true, battleBack: true, mvpTwist: true }
  },
  jury_sprint: {
    id: 'jury_sprint',
    label: 'Jury sprint (12, jury @8)',
    aiCount: 11,
    blurb: '12 HGs; jury starts when 8 remain (not 10). Double eviction off by default.',
    juryStartHouseCount: 8,
    doubleEvictionAt: 7,
    defaultTwists: { doubleEviction: false, battleBack: false, mvpTwist: false }
  }
};

/** Classic BB double-eviction trigger for a 16-person cast. */
export const DEFAULT_DOUBLE_EVICTION_AT = 8;

export const FIRST_NAMES = [
  'Jordan', 'Alex', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Blake', 'Cameron', 'Dakota', 'Emery', 'Finley', 'Harper', 'Jamie', 'Kai',
  'Logan', 'Marley', 'Noah', 'Parker', 'Reese', 'Sage', 'Skyler', 'Tatum',
  'Violet', 'Wren', 'Zion', 'Brooke', 'Chase', 'Drew', 'Ellis', 'Frankie',
  'Grey', 'Hayden', 'Indigo', 'Jules', 'Kit', 'Lane', 'Micah', 'Nico',
  'Oakley', 'Phoenix', 'River', 'Shiloh', 'Tristan', 'Urban', 'Val', 'Winter'
];

export const PERSONALITY_TYPES = [
  { id: 'social', name: 'Social Butterfly', strategy: 'befriend', socialBonus: 2, aggressionMod: -1 },
  { id: 'competitor', name: 'Competitor', strategy: 'win', competitionBonus: 2, aggressionMod: 0 },
  { id: 'strategist', name: 'Strategist', strategy: 'manipulate', intelligenceBonus: 2, aggressionMod: 0 },
  { id: 'loyalist', name: 'Loyalist', strategy: 'ally', loyaltyBonus: 2, aggressionMod: -1 },
  { id: 'wildcard', name: 'Wildcard', strategy: 'chaos', variance: 3, aggressionMod: 1 },
  { id: 'aggressor', name: 'Aggressor', strategy: 'attack', aggressionBonus: 3, socialMod: -1 },
  { id: 'floater', name: 'Floater', strategy: 'survive', socialMod: 0, competitionMod: -1 }
];

export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    aiStatBonus: 0,
    playerSocialBonus: 1,
    competitionPlayerBonus: 2,
    aiAggressionMod: -1,
    startingTrust: 15,
    actionsPerDay: 3,
    /** Flat reduction to AI HOH nomination score for the human player. */
    playerNominationProtection: 14,
    /** Baseline multiplier on nomination weight; rises toward 1 as player threat rises. */
    playerNominationWeightFactor: 0.58
  },
  normal: {
    label: 'Normal',
    aiStatBonus: 1,
    playerSocialBonus: 0,
    competitionPlayerBonus: 0,
    aiAggressionMod: 0,
    startingTrust: 5,
    actionsPerDay: 2,
    playerNominationProtection: 6,
    playerNominationWeightFactor: 0.9
  },
  hard: {
    label: 'Hard',
    aiStatBonus: 2,
    playerSocialBonus: -1,
    competitionPlayerBonus: -1,
    aiAggressionMod: 1,
    startingTrust: 0,
    actionsPerDay: 2,
    playerNominationProtection: 0,
    playerNominationWeightFactor: 1.12
  }
};

let idCounter = 0;

/** Generate a unique ID for game entities. */
export function uid(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

/** Reset ID counter when loading saved games. */
export function resetIdCounter(value = 0) {
  idCounter = value;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pickRandom(array) {
  return array[randomInt(0, array.length - 1)];
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickN(array, n) {
  return shuffle(array).slice(0, n);
}

export function weightedPick(items, weightFn) {
  const total = items.reduce((sum, item) => sum + weightFn(item), 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= weightFn(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/** Roll a stat check: base stat + d10 vs difficulty. */
export function statCheck(stat, difficulty = 5, bonus = 0) {
  const roll = randomInt(1, 10);
  return stat + roll + bonus >= difficulty + randomInt(3, 7);
}

/** Compare contestants by a stat with small variance. */
export function compareStats(a, statA, b, statB) {
  const scoreA = a[statA] + randomInt(-1, 2);
  const scoreB = b[statB] + randomInt(-1, 2);
  if (scoreA > scoreB) return a;
  if (scoreB > scoreA) return b;
  return Math.random() < 0.5 ? a : b;
}

export function formatRelationship(score) {
  if (score >= 60) return 'Close Ally';
  if (score >= 30) return 'Friendly';
  if (score >= 10) return 'Warm';
  if (score > -10) return 'Neutral';
  if (score > -30) return 'Cold';
  if (score > -60) return 'Hostile';
  return 'Enemy';
}

export function relationshipClass(score) {
  if (score > 10) return 'rel-positive';
  if (score < -10) return 'rel-negative';
  return 'rel-neutral';
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Escape HTML entities for safe insertion into innerHTML. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Pick unique names for AI contestants. */
export function generateAINames(count) {
  return pickN(FIRST_NAMES, count);
}

export function aiCountForCast(castPreset) {
  const preset = CAST_PRESETS[castPreset] || CAST_PRESETS.standard;
  return preset.aiCount;
}

export function totalCastSize(aiCount) {
  return aiCount + 1;
}
