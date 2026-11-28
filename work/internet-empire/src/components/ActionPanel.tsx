import { availableActions, cashForAction } from "@/sim/actions";
import type { GameState } from "@/sim";
import { useGameStore } from "@/store/gameStore";
import { formatMoney } from "@/lib/format";

export function ActionPanel({ state }: { state: GameState }) {
  const queue = useGameStore((s) => s.queue);
  const actions = availableActions(state);

  return (
    <div className="ie-panel">
      <h3 className="ie-panel-title">Available actions</h3>
      <p className="ie-muted">
        {state.apLeft} AP left · {state.plannedActions.length} queued
      </p>
      <ul className="ie-action-list">
        {actions.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              className="ie-btn"
              disabled={state.apLeft < a.ap || state.cash < cashForAction(state, a)}
              onClick={() => queue(a.key)}
            >
              {a.label}
              <span className="ie-btn-meta">
                {a.ap} AP · {formatMoney(cashForAction(state, a))}
              </span>
            </button>
            <span className="ie-action-effect">{a.effect}</span>
          </li>
        ))}
      </ul>
      {state.plannedActions.length > 0 && (
        <PlannedQueue state={state} />
      )}
    </div>
  );
}

function PlannedQueue({ state }: { state: GameState }) {
  const unqueue = useGameStore((s) => s.unqueue);
  return (
    <div className="ie-queue">
      <h4>This month</h4>
      <ul>
        {state.plannedActions.map((p) => (
          <li key={p.id}>
            {p.label}
            <button type="button" className="ie-link-btn" onClick={() => unqueue(p.id)}>
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}