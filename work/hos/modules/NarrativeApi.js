import { HOS_NARRATIVE_API_URL } from './hos-config.js';
import { PHASE_LABELS } from './GameState.js';

export function isNarrativeApiEnabled() {
  return typeof HOS_NARRATIVE_API_URL === 'string' && HOS_NARRATIVE_API_URL.length > 0;
}

/** Safe snapshot for the server — no hidden alliance rosters, no full relationship matrix. */
export function buildNarrativeContext(state) {
  const player = state.getPlayer();
  const active = state.getActiveContestants();
  const hoh = active.find((c) => c.isHOH);
  const nominees = state.nominees
    .map((id) => state.getContestant(id))
    .filter(Boolean)
    .map((c) => c.name);

  const recentEvents = state.storyLog
    .slice(-8)
    .map((e) => (typeof e.text === 'string' ? e.text.replace(/<[^>]+>/g, '') : ''))
    .filter(Boolean);

  const playerAlliance = player?.allianceId
    ? state.alliances.find((a) => a.id === player.allianceId)
    : null;

  return {
    week: state.week,
    weekday: state.getWeekdayName(),
    phase: PHASE_LABELS[state.phase] || state.phase,
    playerName: player?.name || 'You',
    houseguestCount: active.length,
    hohName: hoh?.name || null,
    nominees,
    playerIsNominated: Boolean(player?.isNominated),
    playerIsHOH: Boolean(player?.isHOH),
    playerAllianceSize: playerAlliance?.members?.length || 0,
    exposedAllianceCount: state.alliances.filter((a) => a.exposed).length,
    recentEvents
  };
}

/**
 * @param {'daily_beat' | 'host_line' | 'week_recap'} kind
 * @returns {Promise<{ text: string, type: string } | null>}
 */
export async function fetchNarrativeBeat(kind, state) {
  if (!isNarrativeApiEnabled()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);

  try {
    const res = await fetch(HOS_NARRATIVE_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind,
        context: buildNarrativeContext(state)
      }),
      signal: controller.signal,
      credentials: 'omit'
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.text) return null;
    return { text: data.text, type: data.type || 'narrative' };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
