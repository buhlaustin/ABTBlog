import { EER_NARRATIVE_API_URL } from './eer-config.js';
import { METER_LABELS } from './GameState.js';

let resolvedUrl = null;

export function resolveNarrativeApiUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host === 'austinbuhltech.com' || host.endsWith('.austinbuhltech.com')) {
      return `${window.location.origin}/play/hos/narrate`;
    }
    if (window.location.pathname.startsWith('/play/eer') || window.location.pathname.startsWith('/play/hos')) {
      return `${window.location.origin}/play/hos/narrate`;
    }
  }
  return getNarrativeApiUrl();
}

export function getNarrativeApiUrl() {
  if (resolvedUrl) return resolvedUrl;
  if (typeof window !== 'undefined' && window.__EER_NARRATIVE_API_URL) {
    const w = String(window.__EER_NARRATIVE_API_URL).trim();
    if (w) {
      resolvedUrl = w.replace(/\/$/, '');
      return resolvedUrl;
    }
  }
  if (typeof EER_NARRATIVE_API_URL === 'string' && EER_NARRATIVE_API_URL.length > 0) {
    resolvedUrl = EER_NARRATIVE_API_URL.replace(/\/$/, '');
    return resolvedUrl;
  }
  return null;
}

export async function initNarrativeApiUrl() {
  if (getNarrativeApiUrl()) return getNarrativeApiUrl();
  if (typeof document === 'undefined') return null;

  try {
    const script = document.querySelector('script[src*="game.js"]');
    const base = script?.src ? script.src.replace(/game\.js(\?.*)?$/, '') : '/play/eer/';
    const res = await fetch(`${base}narrative-api.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.url && typeof data.url === 'string') {
      resolvedUrl = data.url.replace(/\/$/, '');
    }
  } catch {
    /* offline */
  }
  return getNarrativeApiUrl();
}

export function isNarrativeApiEnabled() {
  return Boolean(resolveNarrativeApiUrl() || getNarrativeApiUrl());
}

export function buildInboxContext(state) {
  return {
    game: 'eer',
    ceoName: state.ceoName,
    day: state.day,
    meters: state.meters,
    meterLabels: METER_LABELS,
    recentSubjects: state.recentSubjects.slice(-8)
  };
}

async function postJson(apiUrl, body) {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit'
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAiDailyInbox(state) {
  const primary = resolveNarrativeApiUrl() || getNarrativeApiUrl();
  if (!primary) return null;

  const payload = {
    kind: 'eer_daily_inbox',
    context: buildInboxContext(state)
  };

  let data = await postJson(primary, payload);
  if (!data?.emails?.length && primary.includes('/play/hos/narrate')) {
    const fallback = getNarrativeApiUrl();
    if (fallback && fallback !== primary) {
      data = await postJson(fallback, payload);
    }
  }

  if (!data?.emails?.length) return null;
  return data.emails.slice(0, 5);
}

export async function fetchOusterLine(state) {
  const apiUrl = resolveNarrativeApiUrl() || getNarrativeApiUrl();
  if (!apiUrl) return null;

  const data = await postJson(apiUrl, {
    kind: 'eer_ouster_line',
    context: {
      game: 'eer',
      ceoName: state.ceoName,
      day: state.day,
      failedMeter: state.failedMeter,
      meters: state.meters,
      reason: state.ousterReason
    }
  });
  return data?.text?.trim() || null;
}
