import { clamp } from './utils.js';

/** @typedef {'under' | 'radar' | 'target'} ThreatBandId */

/**
 * @param {number} threat
 */
export function getThreatBand(threat) {
  const t = clamp(Math.round(threat), 0, 100);
  if (t < 32) {
    return {
      id: 'under',
      label: 'Under the radar',
      tone: 'low',
      advice: 'Float a little longer — comp wins and loud campaigns will put a target on your back.'
    };
  }
  if (t < 52) {
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
 * Mirrors `AI._playerNominationEase` for player-facing copy.
 */
export function describeNominationShield(state, player) {
  const baseProt = state.config.playerNominationProtection ?? 0;
  const baseFactor = state.config.playerNominationWeightFactor ?? 1;
  if (baseProt <= 0 && baseFactor >= 1) return null;

  const threatNorm = clamp(player.threat / 52, 0, 1);
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
 */
export function buildThreatBandOutlook(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) {
    return { visible: false };
  }

  const band = getThreatBand(player.threat);
  let advice = band.advice;

  if (player.isNominated) {
    advice = 'On the block — use social actions, deals, and veto hope to survive.';
  } else if (player.isHOH) {
    advice = 'Power position: your threat will spike after this reign — plan your shield.';
  } else if (player.hasVeto) {
    advice = 'Veto in hand: threat is up, but you hold endgame insurance.';
  }

  const shield = describeNominationShield(state, player);

  return {
    visible: true,
    label: band.label,
    tone: band.tone,
    threat: player.threat,
    advice,
    shield
  };
}
