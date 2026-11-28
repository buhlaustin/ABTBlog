import type { GameState } from "./types";

export interface WinCriterion {
  id: string;
  label: string;
  met: boolean;
}

export function winCriteria(state: GameState): WinCriterion[] {
  const profitable = state.cash > 0 && state.revenue > state.expenses;
  const leader = state.visitors >= 50_000;
  const bigExit = state.valuation >= 20_000_000;
  const icon = state.brand >= 70 && state.visitors >= 25_000;
  const hasAiProduct = state.products.some((p) => p.kind === "ai" && p.stage === "live");
  const aiStack =
    hasAiProduct &&
    state.research.some((r) => r.id === "ai-models" && r.completed) &&
    state.computeBurn > 0 &&
    state.cash > 0;

  return [
    { id: "profit", label: "Profitable month (revenue beats burn)", met: profitable },
    { id: "leader", label: "50,000+ visitors", met: leader },
    { id: "exit", label: "$20M+ valuation", met: bigExit },
    { id: "icon", label: "Brand icon (70+ brand, 25k visitors)", met: icon },
    { id: "ai", label: "AI stack live (product + model research)", met: aiStack },
  ];
}