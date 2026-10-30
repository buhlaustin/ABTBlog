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
  return Boolean(getClientNarrativeApiUrl());
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

function isSiteProductionHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  return host === 'austinbuhltech.com' || host.endsWith('.austinbuhltech.com');
}

/** URL used for browser fetch — never cross-origin lambda on production (duplicate CORS). */
export function getClientNarrativeApiUrl() {
  const sameOrigin = resolveNarrativeApiUrl();
  if (sameOrigin) return sameOrigin;
  const configured = getNarrativeApiUrl();
  if (!configured) return null;
  if (isSiteProductionHost() && configured.includes('lambda-url')) {
    return `${window.location.origin}/play/hos/narrate`;
  }
  return configured;
}

async function postJson(apiUrl, body) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchAiDailyInbox(state) {
  const apiUrl = getClientNarrativeApiUrl();
  if (!apiUrl) return null;

  const payload = {
    kind: 'eer_daily_inbox',
    context: buildInboxContext(state)
  };

  const data = await postJson(apiUrl, payload);
  if (!data?.emails?.length) return null;
  return data.emails.slice(0, 5);
}

export async function fetchOusterLine(state) {
  const apiUrl = getClientNarrativeApiUrl();
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
