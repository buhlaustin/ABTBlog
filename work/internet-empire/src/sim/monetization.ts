import { laneDef } from "./lanes";
import type { GameState } from "./types";

/** Multipliers applied when accruing product + ad revenue each month. */
export function revenueMultipliers(state: GameState, laneRevMult = 1): number {
  const mon = state.monetization;
  const salesMult = 1 + state.headcount.sales * 0.14 + state.headcount.executives * 0.1;
  const years = Math.max(0, state.calendar.year - 1995);
  const eraScale = 1 + years * 0.055;
  const productMon = mon?.productRevenueMult ?? 1;
  const adMon = mon?.adArpuMult ?? 1;
  const contractBoost = 1 + (mon?.enterpriseMrr ?? 0) / 25_000;
  return laneRevMult * salesMult * eraScale * productMon * Math.min(2.4, contractBoost) * (1 + (adMon - 1) * 0.35);
}

export function productLiveGrowth(monthsLive: number): number {
  return 1 + Math.min(monthsLive * 0.025, 0.85);
}

export function initialProductMrr(state: GameState, quality: number, tier: "standard" | "premium" | "enterprise"): number {
  const lane = laneDef(state.lane);
  const years = Math.max(0, state.calendar.year - 1995);
  const eraBase = 600 + years * 180;
  const tierMult = tier === "enterprise" ? 2.8 : tier === "premium" ? 1.55 : 1;
  const qualityPart = quality * 22;
  return Math.round((eraBase + qualityPart) * tierMult * lane.revenueMult);
}

export function refreshProductMrr(state: GameState): void {
  for (const p of state.products) {
    if (p.stage !== "live" || p.kind === "website") continue;
    if (p.monthsLive > 0 && p.monthsLive % 6 === 0) {
      p.revenueMonthly = Math.round(p.revenueMonthly * 1.08);
    }
  }
}