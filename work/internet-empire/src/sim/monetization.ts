import { laneDef } from "./lanes";
import type { GameState, RevenueBreakdown } from "./types";

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

/** Rough next-month revenue if you ended the month now (no organic visitor drift). */
export function estimateRevenueBreakdown(state: GameState): RevenueBreakdown {
  const lane = laneDef(state.lane);
  const years = Math.max(0, state.calendar.year - 1995);
  const revMult = revenueMultipliers(state, lane.revenueMult);

  let productMrr = 0;
  for (const p of state.products) {
    if (p.stage !== "live" || p.kind === "website") continue;
    const growth = productLiveGrowth(p.monthsLive + 1);
    productMrr += Math.round(p.revenueMonthly * revMult * growth);
  }
  const contractMrr = Math.round(state.monetization.enterpriseMrr * revMult);
  const adEstimate = Math.round(
    state.visitors *
      0.04 *
      state.macro.adCpm *
      lane.revenueMult *
      state.monetization.adArpuMult *
      (1 + years * 0.02)
  );
  return {
    productMrr,
    contractMrr,
    adEstimate,
    totalEstimate: productMrr + contractMrr + adEstimate,
  };
}

export function refreshProductMrr(state: GameState): void {
  for (const p of state.products) {
    if (p.stage !== "live" || p.kind === "website") continue;
    if (p.monthsLive > 0 && p.monthsLive % 6 === 0) {
      p.revenueMonthly = Math.round(p.revenueMonthly * 1.08);
    }
  }
}