import { availableActions, canQueueAction, cashForAction } from "@/sim/actions";
import type { ActionDef } from "@/sim/types";
import type { GameState } from "@/sim";
import { useGameStore } from "@/store/gameStore";
import { formatMoney } from "@/lib/format";

export function ActionPanel({ state }: { state: GameState }) {
  const queue = useGameStore((s) => s.queue);
  const actions = availableActions(state);
  const starterKeys = new Set([
    "build_website",
    "purchase_domain",
    "advertise",
    "hire_developer",
    "develop_product",
  ]);
  const starters = actions.filter((a) => starterKeys.has(a.key));
  const rest = actions.filter((a) => !starterKeys.has(a.key));
  const showStarters = state.calendar.index < 12;

  return (
    <div className="ie-panel">
      <h3 className="ie-panel-title">Available actions</h3>
      <p className="ie-muted">
        {state.apLeft} AP left · {state.plannedActions.length} queued
      </p>
      {showStarters && starters.length > 0 && (
        <>
          <h4 className="ie-starter-head">Year 1 starters</h4>
          <ActionList state={state} actions={starters} queue={queue} />
        </>
      )}
      <ActionList
        state={state}
        actions={showStarters ? rest : actions}
        queue={queue}
        title={showStarters && rest.length > 0 ? "Later" : undefined}
      />
      {state.plannedActions.length > 0 && (
        <PlannedQueue state={state} />
      )}
    </div>
  );
}

function ActionList({
  state,
  actions,
  queue,
  title,
}: {
  state: GameState;
  actions: ActionDef[];
  queue: (key: string) => string | null;
  title?: string;
}) {
  if (actions.length === 0) return null;
  return (
    <>
      {title && <h4 className="ie-starter-head">{title}</h4>}
      <ul className="ie-action-list">
        {actions.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              className="ie-btn"
              disabled={!canQueueAction(state, a).ok}
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
    </>
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