/**
 * AI narrative client — mirrors HOS/EER pattern.
 * Phase 4: same URL as HOS (hos-narrative Lambda) with startup-specific `kind`s.
 */
import { STARTUP_NARRATIVE_API_URL } from './startup-config.js';

let resolvedUrl = null;

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

export function isNarrativeApiEnabled() {
  return Boolean(getNarrativeApiUrl());
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
