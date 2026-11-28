import { monthRng } from "./rng";
import type { GameState, Rival } from "./types";

export function defaultRivals(_seed: number, lane: string, aggression: number): Rival[] {
  const names = ["HyperPortal", "GigaSearch", "StreamVault", "PayBridge", "ModelForge"];
  return names.slice(0, 4).map((name, i) => ({
    id: `rival-${i}`,
    name,
    lane,
    share: 18 - i * 3,
    aggression,
    valuation: 500_000 * (i + 2),
  }));
}

export function tickRivals(state: GameState): string[] {
  const logs: string[] = [];
  const rng = monthRng(state, 91);
  for (const r of state.rivals) {
    if (rng.chance(0.25 + r.aggression * 0.05)) {
      const steal = rng.int(20, 120);
      state.visitors = Math.max(0, state.visitors - steal);
      r.share = Math.min(45, r.share + 1);
      logs.push(`${r.name} launched a competing feature (−${steal} visitors).`);
    }
    r.valuation = Math.round(r.valuation * (0.98 + rng.next() * 0.08));
  }
  return logs;
}