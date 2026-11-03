/**
 * AI narrative client — mirrors HOS/EER pattern.
 * Phase 4: same URL as HOS (hos-narrative Lambda) with startup-specific `kind`s.
 */
import { STARTUP_NARRATIVE_API_URL } from './startup-config.js';
import { assetBaseUrl } from './utils.js';

let resolvedUrl = null;

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

export async function requestNarrative(kind, context) {
  const url = getNarrativeApiUrl();
  if (!url) return null;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, context })
  });

  if (!res.ok) return null;
  return res.json();
}
