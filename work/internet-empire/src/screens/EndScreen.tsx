import type { GameState } from "@/sim";
import { winCriteria } from "@/sim/endgamePreview";
import { useGameStore } from "@/store/gameStore";

export function EndScreen({ state }: { state: GameState }) {
  const clearSave = useGameStore((s) => s.clearSave);
  const title = state.flags.won
    ? "You survived the AI era"
    : state.flags.legacyUrl
      ? "Legacy URL"
      : "Game over";
  const criteria = winCriteria(state);

  return (
    <section className="ie-end">
      <h2>{title}</h2>
      <p>{state.log[state.log.length - 1]}</p>
      <ul>
        <li>Visitors: {state.visitors.toLocaleString()}</li>
        <li>Valuation: ${state.valuation.toLocaleString()}</li>
        <li>Cash: ${state.cash.toLocaleString()}</li>
        <li>Lane: {state.lane}</li>
        <li>Months played: {state.history.length}</li>
      </ul>
      {state.flags.ended && (
        <>
          <h3>2030 survival checklist</h3>
          <ul>
            {criteria.map((c) => (
              <li key={c.id}>
                {c.met ? "✓" : "○"} {c.label}
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="ie-btn ie-btn-primary" onClick={() => clearSave()}>
        Main menu
      </button>
    </section>
  );
}