export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function assetBaseUrl() {
  if (typeof document === 'undefined') return '/play/startup-sim/';
  const script = document.querySelector('script[src*="game.js"]');
  if (script?.src) {
    return script.src.replace(/game\.js(\?.*)?$/, '');
  }
  return '/play/startup-sim/';
}
