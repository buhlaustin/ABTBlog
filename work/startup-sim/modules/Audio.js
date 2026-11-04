const STORAGE_KEY = 'startup_sim_audio_v1';

let audioContext = null;

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false };
    const parsed = JSON.parse(raw);
    return { enabled: Boolean(parsed.enabled) };
  } catch {
    return { enabled: false };
  }
}

export function isAudioEnabled() {
  return readPrefs().enabled;
}

export function setAudioEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: Boolean(enabled) }));
  } catch {
    /* ignore */
  }
}

function getContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function tone(freq, durationSec, gain = 0.04) {
  if (!isAudioEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp);
  amp.connect(ctx.destination);
  const now = ctx.currentTime;
  amp.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
  osc.start(now);
  osc.stop(now + durationSec);
}

export function playUiClick() {
  tone(880, 0.06, 0.035);
}

export function playMonthCloseChime() {
  if (!isAudioEnabled()) return;
  tone(523.25, 0.12, 0.03);
  setTimeout(() => tone(659.25, 0.18, 0.028), 90);
}

export function syncAudioToggleCheckbox() {
  const el = document.getElementById('toggle-audio');
  if (el) el.checked = isAudioEnabled();
}
