/**
 * AI narrative client — mirrors HOS/EER pattern.
 * Phase 7: health probe confirms Startup kinds on deployed hos-narrative Lambda.
 */
import { STARTUP_NARRATIVE_API_URL } from './startup-config.js';
import { assetBaseUrl } from './utils.js';

let resolvedUrl = null;
/** @type {boolean | null} null = not probed yet */
let narrativeApiLive = null;

export function resolveNarrativeApiUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host === 'austinbuhltech.com' || host.endsWith('.austinbuhltech.com')) {
      return `${window.location.origin}/play/hos/narrate`;
    }
    if (window.location.pathname.startsWith('/play/startup-sim')) {
      return `${window.location.origin}/play/hos/narrate`;
    }
  }
  return getNarrativeApiUrl();
}

export function getNarrativeApiUrl() {
  if (resolvedUrl) return resolvedUrl;
  if (typeof window !== 'undefined' && window.__STARTUP_NARRATIVE_API_URL) {
    const w = String(window.__STARTUP_NARRATIVE_API_URL).trim();
    if (w) {
      resolvedUrl = w.replace(/\/$/, '');
      return resolvedUrl;
    }
  }
  if (typeof STARTUP_NARRATIVE_API_URL === 'string' && STARTUP_NARRATIVE_API_URL.length > 0) {
    resolvedUrl = STARTUP_NARRATIVE_API_URL.replace(/\/$/, '');
    return resolvedUrl;
  }
  return null;
}

export async function initNarrativeApiUrl() {
  if (getNarrativeApiUrl()) return getNarrativeApiUrl();
  try {
    const res = await fetch(`${assetBaseUrl()}narrative-api.json`, { cache: 'no-store' });
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

export function isNarrativeApiLive() {
  return narrativeApiLive === true;
}

/** Use live OpenAI-backed narrative when URL exists and health probe did not fail. */
export function shouldUseNarrativeAi() {
  if (!isNarrativeApiEnabled()) return false;
  if (narrativeApiLive === false) return false;
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function probeNarrativeApi({ retries = 3 } = {}) {
  const url = resolveNarrativeApiUrl() || getNarrativeApiUrl();
  if (!url) {
    narrativeApiLive = false;
    return false;
  }

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'startup_health', context: { ping: true } })
      });
      if (!res.ok) throw new Error(`health ${res.status}`);
      const data = await res.json();
      narrativeApiLive = Boolean(data?.ok && data?.startupKinds);
      return narrativeApiLive;
    } catch {
      if (attempt < retries - 1) {
        await sleep(350 * (attempt + 1));
      }
    }
  }

  narrativeApiLive = false;
  return false;
}

export async function requestNarrative(kind, context) {
  const url = resolveNarrativeApiUrl() || getNarrativeApiUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, context })
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
