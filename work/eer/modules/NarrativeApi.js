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

/** Primary: configured Lambda URL (Function URL CORS). Fallback: same-origin CloudFront proxy. */
export function getClientNarrativeApiUrl() {
  const direct = getDirectNarrativeApiUrl();
  if (direct) return direct;
  if (isSiteProductionHost()) {
    return `${window.location.origin}/play/hos/narrate`;
  }
  return resolveNarrativeApiUrl() || getNarrativeApiUrl();
}

export function getDirectNarrativeApiUrl() {
  const configured = getNarrativeApiUrl();
  if (configured?.includes('lambda-url')) return configured.replace(/\/$/, '');
  return null;
}

async function postJson(apiUrl, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      signal: controller.signal
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { error: `HTTP ${res.status}`, detail: errText.slice(0, 200) };
    }
    return await res.json();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAiDailyInbox(state) {
  const apiUrl = getClientNarrativeApiUrl();
  if (!apiUrl) return { emails: null, error: 'Narrative API URL not configured' };

  const payload = {
    kind: 'eer_daily_inbox',
    context: buildInboxContext(state)
  };

  const proxy =
    isSiteProductionHost() ? `${window.location.origin}/play/hos/narrate` : null;
  const urls = [...new Set([apiUrl, proxy].filter(Boolean))];

  let lastError = 'AI inbox unavailable';
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const data = await postJson(url, payload);
      if (data?.emails?.length) {
        return { emails: data.emails.slice(0, 5), error: null };
      }
      lastError = data?.error || data?.detail || 'Empty inbox response';
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }
  }
  return { emails: null, error: lastError };
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
  if (data?.text) return data.text.trim();
  return null;
}
