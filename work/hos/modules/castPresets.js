import {
  CAST_PRESETS,
  JURY_START_HOUSE_COUNT,
  PERSONALITY_TYPES,
  clamp,
  escapeHtml,
  pickN,
  randomInt,
  shuffle,
  weightedPick
} from './utils.js';

export { CAST_PRESETS };

/** @deprecated preset removed — old saves map here */
const LEGACY_CAST_PRESET_IDS = {
  duo: 'standard'
};

const VETERAN_SEASON_TAGS = ['S8', 'S11', 'S14', 'S17', 'S19', 'S22', 'BBCAN3', 'S25'];

/** @typedef {{ doubleEviction?: boolean, battleBack?: boolean, mvpTwist?: boolean }} TwistDefaults */

/**
 * @param {string} castPreset
 */
export function getCastPreset(castPreset) {
  const key = LEGACY_CAST_PRESET_IDS[castPreset] || castPreset;
  return CAST_PRESETS[key] || CAST_PRESETS.standard;
}

/**
 * @param {string} castPreset
 * @returns {TwistDefaults & { doubleEviction: boolean, battleBack: boolean, mvpTwist: boolean }}
 */
export function getCastPresetTwistDefaults(castPreset) {
  const preset = getCastPreset(castPreset);
  const twists = preset.defaultTwists || {};
  return {
    doubleEviction: twists.doubleEviction ?? true,
    battleBack: twists.battleBack ?? false,
    mvpTwist: twists.mvpTwist ?? false
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function resolveJuryStartHouseCount(state) {
  if (state.juryStartHouseCount != null) return state.juryStartHouseCount;
  const preset = getCastPreset(state.castPreset);
  return preset.juryStartHouseCount ?? JURY_START_HOUSE_COUNT;
}

/**
 * @param {string} castPreset
 * @param {{ difficulty?: string, veteran?: boolean, rookie?: boolean }} options
 * @returns {object | null}
 */
export function pickPersonalityForCast(castPreset, { difficulty = 'normal', veteran = false, rookie = false } = {}) {
  const preset = getCastPreset(castPreset);
  const floaterType = PERSONALITY_TYPES.find((p) => p.id === 'floater');

  let weights = preset.personalityWeights;
  if (veteran && preset.veteranPersonalityWeights) {
    weights = preset.veteranPersonalityWeights;
  } else if (rookie && preset.rookiePersonalityWeights) {
    weights = preset.rookiePersonalityWeights;
  }

  if (weights) {
    const pool = PERSONALITY_TYPES.filter((p) => (weights[p.id] || 0) > 0);
    if (pool.length) {
      return weightedPick(pool, (p) => weights[p.id] || 0);
    }
  }

  if (difficulty === 'easy' && floaterType && Math.random() < 0.22 && castPreset !== 'brains') {
    return { ...floaterType };
  }
  return null;
}

/**
 * Stat bumps, all-star mix, jury threshold after relationships init.
 * @param {import('./GameState.js').GameState} state
 */
export function applyCastPresetPostInit(state) {
  const preset = getCastPreset(state.castPreset);
  state.juryStartHouseCount =
    preset.juryStartHouseCount ?? state.juryStartHouseCount ?? JURY_START_HOUSE_COUNT;

  if (preset.aiIntelligenceBonus) {
    for (const c of state.contestants) {
      if (c.isPlayer) continue;
      c.intelligence = clamp(c.intelligence + preset.aiIntelligenceBonus, 1, 10);
    }
  }

  if (preset.id === 'all_stars') {
    applyAllStarsMix(state, preset);
  }
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {object} preset
 */
function applyAllStarsMix(state, preset) {
  const veteranCount = preset.veteranCount ?? 6;
  const ais = shuffle(state.contestants.filter((c) => !c.isPlayer));
  const veterans = ais.slice(0, veteranCount);
  const rookies = ais.slice(veteranCount);
  const seasonTags = pickN(VETERAN_SEASON_TAGS, veteranCount);

  veterans.forEach((c, idx) => {
    c.isVeteran = true;
    c.isRookie = false;
    c.veteranSeason = seasonTags[idx] || `S${randomInt(9, 24)}`;
    const personality = pickPersonalityForCast('all_stars', { veteran: true });
    if (personality) c.personality = { ...personality };
    c.competition = clamp(c.competition + 1, 1, 10);
    c.intelligence = clamp(c.intelligence + 1, 1, 10);
    c.social = clamp(c.social + 1, 1, 10);
    c.threat = clamp(c.threat + 10, 1, 100);
    c.reputation = clamp(c.reputation + 12, 1, 100);
  });

  for (const c of rookies) {
    c.isRookie = true;
    c.isVeteran = false;
    const personality = pickPersonalityForCast('all_stars', { rookie: true });
    if (personality) c.personality = { ...personality };
    c.threat = clamp(c.threat - 2, 1, 100);
  }

  const player = state.getPlayer();
  if (player) {
    player.isRookie = true;
    player.isVeteran = false;
  }
}

/**
 * @param {string} castPreset
 * @returns {string}
 */
export function getCastPresetBlurb(castPreset) {
  const preset = getCastPreset(castPreset);
  return preset.blurb || 'Classic mixed cast — tweak season twists below.';
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} c
 * @returns {{ key: string, label: string, title: string }[]}
 */
export function getHouseguestCastMarks(c) {
  const marks = [];
  if (c.isVeteran) {
    const tag = c.veteranSeason ? `Returnee · ${c.veteranSeason}` : 'All-Star returnee';
    marks.push({ key: 'veteran', label: '★', title: tag });
  } else if (c.isRookie && !c.isPlayer) {
    marks.push({ key: 'rookie', label: 'R', title: 'Rookie — first time in the house' });
  } else if (c.isRookie && c.isPlayer) {
    marks.push({ key: 'rookie-you', label: 'R', title: 'You are the rookie the legends are hunting' });
  }
  return marks;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @returns {{ type: string, text: string }[]}
 */
export function buildCastPresetPremiereLines(state) {
  const preset = getCastPreset(state.castPreset);
  const lines = [];
  const twistBits = [];
  if (state.doubleEvictionEnabled) twistBits.push('double eviction');
  if (state.battleBackEnabled) twistBits.push('Battle Back');
  if (state.mvpTwistEnabled) twistBits.push('MVP week');

  const castN = state.getActiveContestants().length;
  const juryAt = resolveJuryStartHouseCount(state);

  if (preset.id && preset.id !== 'standard') {
    lines.push({
      type: 'system',
      text: `<strong>${escapeHtml(preset.label)}</strong> — ${escapeHtml(preset.blurb || '')}`
    });
  }

  if (preset.id === 'supersized' || preset.id === 'megacast') {
    lines.push({
      type: 'narrative',
      text: `<strong>${castN} houseguests</strong> entered — only <strong>one</strong> walks away with the title. Jury starts at <strong>${juryAt}</strong> remaining.`
    });
  }

  if (preset.id === 'all_stars') {
    const vets = state.contestants.filter((c) => c.isVeteran);
    const rookies = state.contestants.filter((c) => c.isRookie);
    const vetNames = vets.slice(0, 4).map((c) => escapeHtml(c.name)).join(', ');
    const more = vets.length > 4 ? ` +${vets.length - 4} more` : '';
    lines.push({
      type: 'narrative',
      text: `All-Star twist: <strong>${vets.length} returnees</strong> (${vetNames}${more}) vs <strong>${rookies.length} rookies</strong> — past fame does not split the prize; one winner.`
    });
  }

  if (preset.id === 'brains') {
    const stratCount = state.contestants.filter((c) => c.personality?.id === 'strategist').length;
    lines.push({
      type: 'narrative',
      text: `The house skews cerebral — <strong>${stratCount} Strategists</strong> among the cast, all with sharper game reads.`
    });
  }

  if (preset.juryStartHouseCount && preset.juryStartHouseCount !== JURY_START_HOUSE_COUNT) {
    lines.push({
      type: 'system',
      text: `Jury seating: begins when <strong>${juryAt} houseguests</strong> remain (standard seasons use ${JURY_START_HOUSE_COUNT}).`
    });
  }

  if (twistBits.length) {
    lines.push({
      type: 'system',
      text: `Season twists enabled: ${escapeHtml(twistBits.join(' · '))}.`
    });
  }

  return lines;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildCastPresetIntelSection(state) {
  const preset = getCastPreset(state.castPreset);
  const juryAt = resolveJuryStartHouseCount(state);
  const active = state.getActiveContestants().length;
  const items = [
    {
      key: 'cast-preset',
      name: preset.label,
      detail: preset.blurb || 'Standard season'
    },
    {
      key: 'cast-size',
      name: 'Houseguests',
      detail: `${active} active · one winner`
    },
    {
      key: 'cast-jury',
      name: 'Jury begins',
      detail: `When ${juryAt} houseguests remain`
    }
  ];

  if (preset.id === 'all_stars') {
    const vets = state.contestants.filter((c) => c.isVeteran);
    const rookies = state.contestants.filter((c) => c.isRookie);
    items.push({
      key: 'cast-vets',
      name: 'Returnees',
      detail: `${vets.length} all-stars (★ in list)`
    });
    items.push({
      key: 'cast-rookies',
      name: 'Rookies',
      detail: `${rookies.length} first-timers (R tag)`
    });
  }

  if (preset.id === 'brains') {
    const n = state.contestants.filter((c) => !c.isPlayer && c.personality?.id === 'strategist').length;
    items.push({
      key: 'cast-brains',
      name: 'Strategist count',
      detail: `${n} AI strategists (+INT bump)`
    });
  }

  const twists = [];
  if (state.doubleEvictionEnabled) twists.push('DE');
  if (state.battleBackEnabled) twists.push('BB');
  if (state.mvpTwistEnabled) twists.push('MVP');
  items.push({
    key: 'cast-twists',
    name: 'Twists',
    detail: twists.length ? twists.join(' · ') : 'None'
  });

  return {
    title: 'Cast & twists',
    tone: 'neutral',
    items
  };
}
