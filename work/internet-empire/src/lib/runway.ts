import type { GameState } from "@/sim";

/** Months of runway at current burn (simplified). */
export function runwayMonths(state: GameState): number | null {
  const net = state.expenses - state.revenue;
  if (net <= 0) return null;
  return Math.floor(state.cash / net);
}