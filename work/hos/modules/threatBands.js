import { clamp } from './utils.js';
import { PHASES } from './GameState.js';
import { describeEasyFloaterShield } from './floaterShields.js';

export const THREAT_BAND_RADAR = 32;
export const THREAT_BAND_TARGET = 52;

/** @typedef {'under' | 'radar' | 'target'} ThreatBandId */

/**
 * @param {number} threat
 */
export function getThreatBand(threat) {
  const t = clamp(Math.round(threat), 0, 100);
  if (t < THREAT_BAND_RADAR) {
    return {
      id: 'under',
      label: 'Under the radar',
      tone: 'low',
      advice: 'Float a little longer — comp wins and loud campaigns will put a target on your back.'
    };
  }
  if (t < THREAT_BAND_TARGET) {
    return {
      id: 'radar',
      label: 'On the radar',
      tone: 'mid',
      advice: 'The house is clocking you. Mix social cover with selective comp wins.'
    };
  }
  return {
    id: 'target',
    label: 'Big target',
    tone: 'high',
    advice: 'HOHs are likely to name you. Rest, soften relationships, or win POV/HOH.'
  };
}

/**
 * @param {number} before
 * @param {number} after
 */
export function formatThreatChange(before, after) {
  const band = getThreatBand(after);
  const delta = after - before;
  if (delta === 0) {
    return `Threat unchanged at ${after} (${band.label}).`;
  }
  const mag = Math.abs(delta);
  const sign = delta > 0 ? '+' : '−';
  return `Threat ${sign}${mag} (now ${after} — ${band.label}).`;
}

/**
 * @param {import('./Contestant.js').Contestant} player
 * @param {import('./GameState.js').GameState} house
 */
export function computeThreatDrivers(player, house) {
  /** @type {{ label: string, pts: number }[]} */
  const drivers = [];

  if (player.isHOH) drivers.push({ label: 'HOH', pts: 15 });
  if (player.hasVeto) drivers.push({ label: 'Veto', pts: 10 });

  const compPts = player.competition * 2;
  if (compPts > 0) drivers.push({ label: 'Comp wins', pts: compPts });

  const repPts = Math.round(Math.max(0, (player.reputation - 50) / 5));
  if (repPts > 0) drivers.push({ label: 'Reputation', pts: repPts });

  if (player.aggression > 0) drivers.push({ label: 'Aggression', pts: player.aggression });

  const ids = player.allianceIds?.length
    ? player.allianceIds
    : player.allianceId
      ? [player.allianceId]
      : [];
  let allyPts = 0;
  for (const aid of ids) {
    const alliance = house.alliances.find((a) => a.id === aid);
    if (alliance && alliance.members.length >= 3) allyPts += 6;
  }
  if (allyPts > 0) drivers.push({ label: 'Big alliances', pts: allyPts });

  const active = house.getActiveContestants().filter((c) => c.id !== player.id);
  let avgRel = 0;
  if (active.length > 0) {
    const sum = active.reduce((acc, c) => acc + player.getRelationship(c.id), 0);
    avgRel = sum / active.length;
  }
  if (avgRel > 30) drivers.push({ label: 'Well liked', pts: 10 });
  if (avgRel < -20) drivers.push({ label: 'Unpopular', pts: -5 });

  return drivers
    .sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts))
    .slice(0, 3);
}

/**
 * @param {import('./GameState.js').GameState} house
 * @param {import('./Contestant.js').Contestant} player
 */
export function getThreatHouseRank(house, player) {
  const threats = house.getActiveContestants().map((c) => c.threat);
  const rank = threats.filter((t) => t > player.threat).length + 1;
  return { rank, total: threats.length };
}

/**
 * @param {number} threat
 */
export function getNextThreatBandHint(threat) {
  const t = clamp(Math.round(threat), 0, 100);
  if (t < THREAT_BAND_RADAR) {
    return `${THREAT_BAND_RADAR - t} pts until On the radar`;
  }
  if (t < THREAT_BAND_TARGET) {
    return `${THREAT_BAND_TARGET - t} pts until Big target`;
  }
  return 'Highest visibility band';
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function ensureThreatWeekSnapshot(state) {
  if (state.playerThreatWeekSnapshotWeek === state.week) return;
  state.updateThreatLevels();
  const player = state.getPlayer();
  state.playerThreatWeekStart = player?.threat ?? null;
  state.playerThreatWeekSnapshotWeek = state.week;
}

/**
 * Mirrors `AI._playerNominationEase` for player-facing copy.
 */
export function describeNominationShield(state, player) {
  const baseProt = state.config.playerNominationProtection ?? 0;
  const baseFactor = state.config.playerNominationWeightFactor ?? 1;
  if (baseProt <= 0 && baseFactor >= 1) return null;

  const threatNorm = clamp(player.threat / THREAT_BAND_TARGET, 0, 1);
  const protection = Math.round(baseProt * (1 - threatNorm * 0.75));
  const weightPct = Math.round(baseFactor * 100 + (1 - baseFactor) * threatNorm * 100);

  if (state.difficulty === 'easy') {
    if (threatNorm < 0.35) {
      return `Easy mode: AI HOH noms are heavily softened (~${protection} score shaved) while you stay quiet.`;
    }
    if (threatNorm < 0.7) {
      return `Easy mode: Protection is fading (~${protection} off nom score; weight ~${weightPct}% of normal).`;
    }
    return `Easy mode: At this threat, AI treats you almost like a normal target (minimal nom shield).`;
  }

  if (state.difficulty === 'normal' && protection > 0) {
    return `Normal: modest HOH nom cushion (~${protection} score) — vanishes as threat climbs.`;
  }

  if (state.difficulty === 'hard' && baseFactor > 1) {
    return `Hard: AI HOHs weight you ~${weightPct}% on the block — playing big is dangerous.`;
  }

  return null;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {(hoh: import('./Contestant.js').Contestant, limit: number) => { target: import('./Contestant.js').Contestant }[]} [previewLeans]
 */
export function getThreatNominationAlert(state, previewLeans) {
  if (state.phase !== PHASES.NOMINATION) return '';
  const player = state.getPlayer();
  if (!player || player.evicted || player.isHOH) return '';

  const hoh = state.getActiveContestants().find((c) => c.isHOH && !c.isPlayer);
  if (!hoh) return '';

  const band = getThreatBand(player.threat);
  let onLean = false;
  if (typeof previewLeans === 'function') {
    const leans = previewLeans(hoh, 3);
    onLean = leans.some((row) => row.target?.isPlayer || row.target?.id === player.id);
  }

  if (onLean) {
    return `Threat alert · ${hoh.name}'s lean list includes you`;
  }
  if (band.id === 'target') {
    return `Threat alert · ${band.label} on nomination night`;
  }
  return '';
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {(hoh: import('./Contestant.js').Contestant, limit: number) => unknown[]} [previewLeans]
 */
export function buildThreatBandOutlook(state, previewLeans) {
  const player = state.getPlayer();
  if (!player || player.evicted) {
    return { visible: false };
  }

  ensureThreatWeekSnapshot(state);

  const band = getThreatBand(player.threat);
  let advice = band.advice;

  if (player.isNominated) {
    advice = 'On the block — use social actions, deals, and veto hope to survive.';
  } else if (player.isHOH) {
    advice = 'Power position: your threat will spike after this reign — plan your shield.';
  } else if (player.hasVeto) {
    advice = 'Veto in hand: threat is up, but you hold endgame insurance.';
  }

  let shield = describeNominationShield(state, player);
  const floaterShield = describeEasyFloaterShield(state);
  if (floaterShield) {
    shield = shield ? `${shield} ${floaterShield}` : floaterShield;
  }
  const drivers = computeThreatDrivers(player, state);
  const { rank, total } = getThreatHouseRank(state, player);
  const nextBand = getNextThreatBandHint(player.threat);

  let weekDelta = null;
  if (typeof state.playerThreatWeekStart === 'number') {
    weekDelta = player.threat - state.playerThreatWeekStart;
  }

  const nominationAlert = getThreatNominationAlert(state, previewLeans);

  return {
    visible: true,
    label: band.label,
    tone: band.tone,
    threat: player.threat,
    advice,
    shield,
    drivers,
    houseRank: rank,
    houseTotal: total,
    weekDelta,
    nextBand,
    nominationAlert,
    radarAt: THREAT_BAND_RADAR,
    targetAt: THREAT_BAND_TARGET
  };
}
