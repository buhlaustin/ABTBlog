import { clamp } from './utils.js';
import {
  THREAT_BAND_RADAR,
  formatThreatChange,
  getThreatBand
} from './threatBands.js';

/**
 * @param {import('./Contestant.js').Contestant} player
 */
export function describeThreatOffsetNote(player) {
  const off = player.threatOffset ?? 0;
  if (!off) return '';
  if (off < 0) {
    return `Lay-low cushion ${off} threat (fades ~50% each new week).`;
  }
  return `Campaign heat +${off} threat until week decay.`;
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
    if (off < 0 && player.threat < clamp(player.threat - off, 0, 100)) {
      const raw = clamp(player.threat - off, 0, 100);
      items.push({
        key: 'threat-raw',
        name: 'Without cushion',
        detail: `Base threat ~${raw} — Rest & Observe is masking ${Math.abs(off)} pts.`
      });
    }
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

  if (!off && player.threat >= THREAT_BAND_RADAR) {
    const band = getThreatBand(player.threat);
    items.push({
      key: 'rest-tip',
      name: 'Lay low tip',
      detail: `At ${player.threat} (${band.label}), Rest & Observe shaves 3–6 threat via a decaying offset.`
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
