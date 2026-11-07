import { clamp } from './utils.js';
import {
  THREAT_BAND_RADAR,
  THREAT_BAND_TARGET,
  formatThreatChange,
  getThreatBand
} from './threatBands.js';

/** @param {number} offset */
export function projectOffsetAfterWeekDecay(offset) {
  if (!offset) return 0;
  const next = Math.round(offset * 0.5);
  return Math.abs(next) < 1 ? 0 : next;
}

/**
 * @param {import('./Contestant.js').Contestant} player
 */
export function describeThreatOffsetNote(player) {
  const off = player.threatOffset ?? 0;
  if (!off) return '';
  if (off < 0) {
    const next = projectOffsetAfterWeekDecay(off);
    const decayBit = next ? ` → ~${next} next week` : ' · clears next week';
    return `Lay-low cushion ${off} threat (decays 50% weekly${decayBit}).`;
  }
  return `Campaign heat +${off} threat until week decay.`;
}

/**
 * Dynamic Rest action blurb for the action picker.
 * @param {import('./Contestant.js').Contestant} player
 */
export function describeLayLowRestAction(player) {
  const off = player.threatOffset ?? 0;
  if (off <= -25) {
    return 'Lay low — cushion capped at −25; decay resets pressure over time.';
  }
  const band = getThreatBand(player.threat);
  const nextBand = player.threat >= THREAT_BAND_RADAR
    ? ''
    : ` Need ${THREAT_BAND_RADAR - player.threat} pts to hit On the radar.`;
  if (player.threat >= THREAT_BAND_TARGET) {
    return `Lay low — urgent: 3–6 drop from ${player.threat} (${band.label}).`;
  }
  if (player.threat >= THREAT_BAND_RADAR) {
    return `Lay low — 3–6 drop from ${player.threat} (${band.label}).${nextBand}`;
  }
  return `Lay low — 3–6 threat cushion (you are ${band.label}).`;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getLayLowBanner(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return '';

  const off = player.threatOffset ?? 0;
  if (off < -2) {
    const raw = clamp(player.threat - off, 0, 100);
    return `Lay-low · ${off} cushion (reads ${player.threat}, base ~${raw})`;
  }

  if (
    state.playerLayLowWeek === state.week &&
    typeof state.playerLayLowAfter === 'number'
  ) {
    const delta =
      typeof state.playerLayLowBefore === 'number'
        ? state.playerLayLowAfter - state.playerLayLowBefore
        : 0;
    if (delta < 0) {
      const band = getThreatBand(state.playerLayLowAfter);
      return `Rested today · threat ${state.playerLayLowAfter} (${band.label})`;
    }
  }

  return '';
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {number} before
 * @param {number} after
 */
export function recordLayLowRest(state, before, after) {
  state.playerLayLowWeek = state.week;
  state.playerLayLowBefore = before;
  state.playerLayLowAfter = after;

  if (state.playerLayLowRestsWeek !== state.week) {
    state.playerLayLowRestsWeek = state.week;
    state.playerLayLowRestsThisWeek = 0;
  }
  state.playerLayLowRestsThisWeek = (state.playerLayLowRestsThisWeek ?? 0) + 1;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildLayLowIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const off = player.threatOffset ?? 0;
  const items = [];
  const offsetNote = describeThreatOffsetNote(player);

  if (offsetNote) {
    items.push({
      key: 'threat-offset',
      name: off < 0 ? 'Lay-low cushion' : 'Campaign heat',
      detail: offsetNote
    });
    if (off < 0) {
      const raw = clamp(player.threat - off, 0, 100);
      items.push({
        key: 'threat-raw',
        name: 'Without cushion',
        detail: `House reads ~${player.threat}; base threat ~${raw} (${Math.abs(off)} masked).`
      });
      const projected = projectOffsetAfterWeekDecay(off);
      items.push({
        key: 'decay-forecast',
        name: 'Week decay',
        detail: projected
          ? `New week rolls cushion toward ~${projected} before stats recalc.`
          : 'Cushion mostly clears on the next week tick.'
      });
    }
  }

  const rests =
    state.playerLayLowRestsWeek === state.week
      ? state.playerLayLowRestsThisWeek ?? 0
      : 0;
  if (rests > 0) {
    items.push({
      key: 'rest-week',
      name: 'Rests this week',
      detail: `${rests} time${rests === 1 ? '' : 's'} — stacks on the same decaying offset.`
    });
  }

  if (
    state.playerLayLowWeek === state.week &&
    typeof state.playerLayLowBefore === 'number' &&
    typeof state.playerLayLowAfter === 'number'
  ) {
    items.push({
      key: 'rest-today',
      name: 'Rest today',
      detail: formatThreatChange(state.playerLayLowBefore, state.playerLayLowAfter)
    });
  }

  if (state.difficulty === 'easy' && off < 0 && player.threat < THREAT_BAND_TARGET) {
    items.push({
      key: 'easy-shield',
      name: 'Easy synergy',
      detail:
        'Lay-low keeps threat under Big target while Easy mode softens AI HOH weights.'
    });
  }

  if (!off && player.threat >= THREAT_BAND_RADAR) {
    const band = getThreatBand(player.threat);
    const pts = player.threat - THREAT_BAND_RADAR;
    items.push({
      key: 'rest-tip',
      name: 'Lay low tip',
      detail: `At ${player.threat} (${band.label}), Rest shaves 3–6 pts — ${pts} above radar band.`
    });
  }

  if (!items.length) return null;

  return {
    id: 'lay-low',
    title: 'Lay low',
    tone: off < 0 ? 'success' : off > 0 ? 'warning' : 'neutral',
    items
  };
}
