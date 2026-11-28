import { TUNING, WEEKLY_AP } from "./Data.js";

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function createInitialState() {
  return {
    week: 1,
    apLeft: WEEKLY_AP,
    queued: [],
    reservoir: 78,
    moisture: 52,
    sun: 62,
    nutrients: 44,
    health: TUNING.startHealth,
    growth: 0,
    mold: 6,
    lastWeather: null,
    log: [],
    gameOver: false,
    won: false,
    scouting: false,
  };
}

export function cloneState(state) {
  return structuredClone(state);
}

export function pushLog(state, line) {
  state.log.unshift({ week: state.week, text: line });
  if (state.log.length > 24) state.log.pop();
}

export function resetWeekPlan(state) {
  state.apLeft = WEEKLY_AP;
  state.queued = [];
  state.scouting = false;
}

export function applyBands(state) {
  state.reservoir = clamp(state.reservoir, 0, TUNING.reservoirCap);
  state.moisture = clamp(state.moisture, 0, 100);
  state.sun = clamp(state.sun, 0, 100);
  state.nutrients = clamp(state.nutrients, 0, 100);
  state.health = clamp(state.health, 0, 100);
  state.growth = clamp(state.growth, 0, 100);
  state.mold = clamp(state.mold, 0, 100);
}