import type { GameState } from "@/sim";
import { useGameStore } from "@/store/gameStore";

export function EndScreen({ state }: { state: GameState }) {
  const clearSave = useGameStore((s) => s.clearSave);
  const title = state.flags.won ? "You survived the AI era" : state.flags.legacyUrl ? "Legacy URL" : "Game over";
  return (
    <section className="ie-end">
      <h2>{title}</h2>
      <p>{state.log[state.log.length - 1]}</p>
      <ul>
        <li>Visitors: {state.visitors.toLocaleString()}</li>
        <li>Valuation: ${state.valuation.toLocaleString()}</li>
        <li>Cash: ${state.cash.toLocaleString()}</li>
      </ul>
      <button type="button" className="ie-btn ie-btn-primary" onClick={() => clearSave()}>
        Main menu
      </button>
    </section>
  );
}