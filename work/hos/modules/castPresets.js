import {
  CAST_PRESETS,
  JURY_START_HOUSE_COUNT,
  PERSONALITY_TYPES,
  clamp,
  escapeHtml,
  shuffle,
  weightedPick
} from './utils.js';

export { CAST_PRESETS };

/** @typedef {{ doubleEviction?: boolean, battleBack?: boolean, mvpTwist?: boolean }} TwistDefaults */

/**
 * @param {string} castPreset
 */
export function getCastPreset(castPreset) {
  return CAST_PRESETS[castPreset] || CAST_PRESETS.standard;
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
 * @param {{ difficulty?: string }} options
 * @returns {object | null}
 */
export function pickPersonalityForCast(castPreset, { difficulty = 'normal' } = {}) {
  const preset = getCastPreset(castPreset);
  const floaterType = PERSONALITY_TYPES.find((p) => p.id === 'floater');

  if (preset.personalityWeights) {
    const pool = PERSONALITY_TYPES.filter((p) => (preset.personalityWeights[p.id] || 0) > 0);
    if (pool.length) {
      return weightedPick(pool, (p) => preset.personalityWeights[p.id] || 0);
    }
  }

  if (difficulty === 'easy' && floaterType && Math.random() < 0.22 && castPreset !== 'brains') {
    return { ...floaterType };
  }
  return null;
}

/**
 * Duo pairs, intelligence bumps, and other cast shaping after relationships init.
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

  if (preset.seedDuos) {
    seedDuoAlliances(state, preset);
  }
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {object} preset
 */
function seedDuoAlliances(state, preset) {
  const ais = shuffle(state.getActiveContestants().filter((c) => !c.isPlayer));
  const bond = preset.duoBond ?? 58;
  let pairNum = 1;
  for (let i = 0; i + 1 < ais.length; i += 2) {
    const a = ais[i];
    const b = ais[i + 1];
    state.createAlliance(a.id, [b.id], `Duo ${pairNum}`);
    a.modifyRelationship(b.id, bond + Math.floor(Math.random() * 8));
    b.modifyRelationship(a.id, bond + Math.floor(Math.random() * 8));
    pairNum += 1;
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
 * @returns {{ type: string, text: string }[]}
 */
export function buildCastPresetPremiereLines(state) {
  const preset = getCastPreset(state.castPreset);
  const lines = [];
  const twistBits = [];
  if (state.doubleEvictionEnabled) twistBits.push('double eviction');
  if (state.battleBackEnabled) twistBits.push('Battle Back');
  if (state.mvpTwistEnabled) twistBits.push('MVP week');

  if (preset.id && preset.id !== 'standard') {
    lines.push({
      type: 'system',
      text: `<strong>${escapeHtml(preset.label)}</strong> — ${escapeHtml(preset.blurb || '')}`
    });
  }

  if (preset.id === 'duo' && state.alliances.length) {
    lines.push({
      type: 'narrative',
      text: `Move-in pairs are set: <strong>${state.alliances.length} duos</strong> entered with pre-linked alliances (house still sees them as separate deals).`
    });
  }

  if (preset.id === 'brains') {
    const stratCount = state.contestants.filter((c) => c.personality?.id === 'strategist').length;
    lines.push({
      type: 'narrative',
      text: `The house skews cerebral — <strong>${stratCount} Strategists</strong> among the cast, all with sharper game reads.`
    });
  }

  if (preset.juryStartHouseCount && preset.juryStartHouseCount < JURY_START_HOUSE_COUNT) {
    lines.push({
      type: 'system',
      text: `Jury sprint: jurors begin seating when <strong>${preset.juryStartHouseCount} houseguests</strong> remain (not ${JURY_START_HOUSE_COUNT}).`
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
  const items = [
    {
      key: 'cast-preset',
      name: preset.label,
      detail: preset.blurb || 'Standard season'
    },
    {
      key: 'cast-jury',
      name: 'Jury begins',
      detail: `When ${juryAt} houseguests remain`
    }
  ];

  if (preset.id === 'duo') {
    items.push({
      key: 'cast-duos',
      name: 'Duo alliances',
      detail: `${state.alliances.filter((a) => /^Duo /.test(a.name)).length} pre-linked pairs`
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
