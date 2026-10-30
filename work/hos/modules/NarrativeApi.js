import { HOS_NARRATIVE_API_URL } from './hos-config.js';
import { PHASE_LABELS } from './GameState.js';

/** Resolved at runtime from inline script, module, or narrative-api.json. */
let resolvedUrl = null;

/** Same-origin proxy (/api/hos/narrative) avoids ad blockers on *.lambda-url.* */
export function resolveNarrativeApiUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host === 'austinbuhltech.com' || host.endsWith('.austinbuhltech.com')) {
      return `${window.location.origin}/play/hos/narrate`;
    }
    if (window.location.pathname.startsWith('/play/hos')) {
      return `${window.location.origin}/play/hos/narrate`;
    }
  }
  return getNarrativeApiUrl();
}

export function getNarrativeApiUrl() {
  if (resolvedUrl) return resolvedUrl;
  if (typeof window !== 'undefined' && window.__HOS_NARRATIVE_API_URL) {
    const w = String(window.__HOS_NARRATIVE_API_URL).trim();
    if (w) {
      resolvedUrl = w.replace(/\/$/, '');
      return resolvedUrl;
    }
  }
  if (typeof HOS_NARRATIVE_API_URL === 'string' && HOS_NARRATIVE_API_URL.length > 0) {
    resolvedUrl = HOS_NARRATIVE_API_URL.replace(/\/$/, '');
    return resolvedUrl;
  }
  return null;
}

/** Load URL from narrative-api.json when build inject missed the module bundle. */
export async function initNarrativeApiUrl() {
  if (getNarrativeApiUrl()) return getNarrativeApiUrl();
  if (typeof document === 'undefined') return null;

  try {
    const script = document.querySelector('script[src*="game.js"]');
    const base = script?.src ? script.src.replace(/game\.js(\?.*)?$/, '') : '/play/hos/';
    const res = await fetch(`${base}narrative-api.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.url && typeof data.url === 'string') {
      resolvedUrl = data.url.replace(/\/$/, '');
    }
  } catch {
    /* offline or missing file */
  }
  return getNarrativeApiUrl();
}

export function isNarrativeApiEnabled() {
  return Boolean(resolveNarrativeApiUrl() || getNarrativeApiUrl());
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
async function fetchNarrativeBeatDirect(kind, state, apiUrl) {
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, context: buildNarrativeContext(state) }),
      credentials: 'omit'
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.text) return null;
    return { text: data.text, type: data.type || 'narrative' };
  } catch {
    return null;
  }
}

export async function fetchNarrativeBeat(kind, state) {
  const apiUrl = resolveNarrativeApiUrl() || getNarrativeApiUrl();
  if (!apiUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind,
        context: buildNarrativeContext(state)
      }),
      signal: controller.signal,
      credentials: 'omit'
    });

    if (!res.ok) {
      const direct = getNarrativeApiUrl();
      if (direct && direct.includes('lambda-url') && apiUrl !== direct) {
        return fetchNarrativeBeatDirect(kind, state, direct);
      }
      return null;
    }
    const data = await res.json();
    if (!data?.text) return null;
    return { text: data.text, type: data.type || 'narrative' };
  } catch {
    const direct = getNarrativeApiUrl();
    if (direct && direct.includes('lambda-url')) {
      return fetchNarrativeBeatDirect(kind, state, direct);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
