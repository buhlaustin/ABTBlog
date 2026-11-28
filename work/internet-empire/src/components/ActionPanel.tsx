import { availableActions, actionLabel, canQueueAction, cashForAction } from "@/sim/actions";
import { bankActionByKey, bankCashCost } from "@/sim/actionBank";
import type { ActionDef } from "@/sim/types";
import type { GameState } from "@/sim";
import { useGameStore } from "@/store/gameStore";
import { formatMoney } from "@/lib/format";

const CORE_KEYS = new Set([
  "build_website",
  "purchase_domain",
  "advertise",
  "hire_developer",
  "develop_product",
  "seo",
  "partnership",
  "upgrade_infra",
]);

export function ActionPanel({ state }: { state: GameState }) {
  const queue = useGameStore((s) => s.queue);
  const actions = availableActions(state);
  const core = actions.filter((a) => CORE_KEYS.has(a.key));
  const deck = actions.filter((a) => !CORE_KEYS.has(a.key));

  return (
    <div className="ie-panel">
      <h3 className="ie-panel-title">Available actions</h3>
      <p className="ie-muted">
        {state.apLeft} AP left · {state.plannedActions.length} queued · deck refreshes each month
      </p>
      {core.length > 0 && (
        <ActionList state={state} actions={core} queue={queue} title="Core playbook" />
      )}
      {deck.length > 0 && (
        <ActionList state={state} actions={deck} queue={queue} title="This month's opportunities" />
      )}
      {state.plannedActions.length > 0 && <PlannedQueue state={state} />}
    </div>
  );
}

function actionCost(state: GameState, a: ActionDef): number {
  const bank = bankActionByKey(a.key);
  if (bank && state.monthlyDeck.includes(a.key)) return bankCashCost(state, bank);
  return cashForAction(state, a);
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
              disabled={!canQueueAction(state, a, a.key).ok}
              onClick={() => queue(a.key)}
            >
              {actionLabel(a, state)}
              <span className="ie-btn-meta">
                {a.ap} AP · {formatMoney(actionCost(state, a))}
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