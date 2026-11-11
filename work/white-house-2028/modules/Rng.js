/** Mulberry32 — deterministic PRNG from seed */
export function createRng(seed) {
  let s = Number(seed) >>> 0 || 1;
  return {
    next() {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick(arr) {
      if (!arr?.length) return null;
      return arr[Math.floor(this.next() * arr.length)];
    },
    chance(p) {
      return this.next() < p;
    }
  };
}

export function hashSeed(...parts) {
  const str = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
