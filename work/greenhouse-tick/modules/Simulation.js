import { ACTIONS, TUNING, WEATHER } from "./Data.js";
import { applyBands, pushLog } from "./GameState.js";

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function inBand(value, band) {
  return value >= band.lo && value <= band.hi;
}

/** Simple LCG — same family as other site sims for teachable determinism. */
export function createRng(seed) {
  let s = seed >>> 0;
  return {
    next() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    },
  };
}

export function canQueue(state, actionId) {
  const def = ACTIONS[actionId];
  if (!def) return { ok: false, reason: "Unknown action." };
  if (state.gameOver) return { ok: false, reason: "Season ended." };
  if (state.apLeft < def.ap) return { ok: false, reason: "No action points left." };
  if (actionId === "water" && state.reservoir < 8) {
    return { ok: false, reason: "Reservoir too low — wait for rain or mist." };
  }
  return { ok: true, def };
}

export function queueAction(state, actionId) {
  const check = canQueue(state, actionId);
  if (!check.ok) return check;
  const def = check.def;
  state.queued.push(actionId);
  state.apLeft -= def.ap;
  if (actionId === "scout") state.scouting = true;
  return { ok: true, label: def.label };
}

export function unqueueAction(state, index) {
  const id = state.queued[index];
  if (!id) return false;
  const def = ACTIONS[id];
  state.apLeft += def?.ap ?? 1;
  state.queued.splice(index, 1);
  if (!state.queued.includes("scout")) state.scouting = false;
  return true;
}

function pickWeather(rng) {
  const roll = rng.next();
  if (roll < 0.22) return WEATHER[0];
  if (roll < 0.42) return WEATHER[1];
  if (roll < 0.58) return WEATHER[2];
  return WEATHER[3];
}

function comfortScore(state) {
  const { ideal } = TUNING;
  let score = 1;
  if (!inBand(state.moisture, ideal.moisture)) score -= 0.22;
  if (!inBand(state.sun, ideal.sun)) score -= 0.22;
  if (!inBand(state.nutrients, ideal.nutrients)) score -= 0.18;
  if (state.mold > 35) score -= 0.2;
  if (state.health < 35) score -= 0.15;
  return clamp(score, 0.15, 1.25);
}

function resolveQueued(state) {
  for (const actionId of state.queued) {
    const def = ACTIONS[actionId];
    if (!def || def.blurbOnly) continue;
    if (def.moisture) state.moisture += def.moisture;
    if (def.sun) state.sun += def.sun;
    if (def.nutrients) state.nutrients += def.nutrients;
    if (def.reservoir) state.reservoir += def.reservoir;
    if (def.mold) state.mold += def.mold;
    if (def.health) state.health += def.health;
  }
}

function passiveDrift(state) {
  state.moisture -= 6;
  state.nutrients -= 4;
  state.mold += state.moisture > 75 ? 5 : 2;
  if (state.sun > 85) {
    state.moisture -= 5;
    state.health -= 2;
  }
  if (state.sun < 30) state.health -= 3;
  if (state.moisture < 18) state.health -= 5;
  state.reservoir += 4;
}

export function resolveWeek(state, seed) {
  if (state.gameOver) return { lines: [] };

  const rng = createRng((seed ^ (state.week * 911) ^ state.growth) >>> 0);
  const weather = pickWeather(rng);
  state.lastWeather = weather;

  resolveQueued(state);
  passiveDrift(state);

  if (weather.moisture) state.moisture += weather.moisture;
  if (weather.sun) state.sun += weather.sun;
  if (weather.reservoir) state.reservoir += weather.reservoir;
  if (weather.mold) state.mold += weather.mold;
  if (weather.health) state.health += weather.health;

  const comfort = comfortScore(state);
  let growthDelta = 9.5 * comfort;
  if (weather.growthMod) growthDelta *= weather.growthMod;
  if (state.scouting) growthDelta += 1.8;

  state.growth += growthDelta;
  state.health += comfort > 0.85 ? 2 : comfort < 0.45 ? -6 : -1;
  state.health -= state.mold > 40 ? 4 : 0;

  applyBands(state);

  const lines = [
    `Weather: ${weather.label} — ${weather.blurb}`,
    `Comfort ${(comfort * 100).toFixed(0)}% → growth +${growthDelta.toFixed(1)}%`,
  ];
  for (const line of lines) pushLog(state, line);

  state.week += 1;

  if (state.health <= 0) {
    state.gameOver = true;
    state.won = false;
    pushLog(state, "Crops collapsed — soil biology crashed.");
  } else if (state.growth >= TUNING.winGrowth) {
    state.gameOver = true;
    state.won = true;
    pushLog(state, "Harvest ready — you balanced the greenhouse.");
  } else if (state.week > TUNING.maxWeeks) {
    state.gameOver = true;
    state.won = false;
    pushLog(state, "Season ended before full maturity.");
  }

  return { lines, weather };
}