import type { ReactNode } from "react";
import type { GameState, TabId } from "@/sim";
import { eraAt } from "@/sim/eras";
import { formatMonth } from "@/lib/format";
import { useGameStore } from "@/store/gameStore";
import { ActionPanel } from "./ActionPanel";
import { FinanceCharts } from "./FinanceCharts";
import { SideStage } from "./SideStage";
import { StatHud } from "./StatHud";

const TABS: { id: TabId; label: string }[] = [
  { id: "desk", label: "Desk" },
  { id: "products", label: "Products" },
  { id: "marketing", label: "Marketing" },
  { id: "people", label: "People" },
  { id: "finance", label: "Finance" },
  { id: "rivals", label: "Rivals" },
  { id: "research", label: "Research" },
  { id: "news", label: "News" },
];

export function GameShell({ state }: { state: GameState }) {
  const tab = useGameStore((s) => s.tab);
  const setTab = useGameStore((s) => s.setTab);
  const endMonth = useGameStore((s) => s.endMonth);
  const era = eraAt(state.calendar.year);

  return (
    <div className="ie-game-shell">
      <header className="ie-header">
        <div>
          <p className="ie-eyebrow">Internet Empire · {era.label}</p>
          <h1>{state.companyName}</h1>
          <p className="ie-muted">{formatMonth(state.calendar.year, state.calendar.month)}</p>
        </div>
        <button type="button" className="ie-btn ie-btn-primary" onClick={() => endMonth()}>
          End month
        </button>
      </header>

      <StatHud state={state} />

      <div className="ie-main">
        <nav className="ie-tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "ie-tab active" : "ie-tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ie-panels">
          <div className="ie-panel-stack">{renderPanel(tab, state)}</div>
          <SideStage state={state} />
        </div>
      </div>
    </div>
  );
}

function Panel({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="ie-panel">
      {title && <h3 className="ie-panel-title">{title}</h3>}
      {children}
    </div>
  );
}

function renderPanel(tab: TabId, state: GameState) {
  switch (tab) {
    case "desk":
      return <ActionPanel state={state} />;
    case "products":
      return (
        <Panel title="Products">
          <ul>
            {state.products.length === 0 && <li className="ie-muted">No products yet.</li>}
            {state.products.map((p) => (
              <li key={p.id}>
                {p.name} · {p.stage} · Q{p.quality}
              </li>
            ))}
          </ul>
        </Panel>
      );
    case "marketing":
      return (
        <Panel title="Marketing">
          <p>Brand {state.brand} · Ad CPM ×{state.macro.adCpm.toFixed(2)}</p>
          <p className="ie-muted">Queue ads and SEO from the Desk tab.</p>
        </Panel>
      );
    case "people":
      return (
        <Panel title="People">
          <ul>
            <li>Developers: {state.headcount.developers}</li>
            <li>Designers: {state.headcount.designers}</li>
            <li>Sales: {state.headcount.sales}</li>
            <li>Executives: {state.headcount.executives}</li>
          </ul>
        </Panel>
      );
    case "finance":
      return (
        <Panel title="Finance">
          <p>
            Revenue (last tick) ${state.revenue.toLocaleString()} · Expenses $
            {state.expenses.toLocaleString()}
          </p>
          {state.computeBurn > 0 && <p>Compute burn ${state.computeBurn.toLocaleString()}/mo</p>}
          <FinanceCharts state={state} />
        </Panel>
      );
    case "rivals":
      return (
        <Panel title="Competition">
          <ul>
            {state.rivals.map((r) => (
              <li key={r.id}>
                {r.name} — share {r.share}% · val ${r.valuation.toLocaleString()}
              </li>
            ))}
          </ul>
          <h4>Acquisition targets</h4>
          <ul>
            {state.acquisitions.map((a) => (
              <li key={a.id}>
                {a.name} — {a.price.toLocaleString()} ({a.visitors} visitors)
                <AcquireBtn id={a.id} price={a.price} cash={state.cash} />
              </li>
            ))}
          </ul>
        </Panel>
      );
    case "research":
      return (
        <Panel title="Research">
          <ul>
            {state.research.map((r) => (
              <li key={r.id}>
                {r.label}{" "}
                {r.completed ? "✓" : r.unlocked ? `(${r.progress}/${r.months})` : "(locked)"}
              </li>
            ))}
          </ul>
        </Panel>
      );
    case "news":
      return (
        <Panel title="News">
          <ul className="ie-news">
            {state.news
              .slice()
              .reverse()
              .map((n) => (
                <li key={n.id}>
                  <strong>{n.headline}</strong>
                  <p>{n.body}</p>
                </li>
              ))}
          </ul>
          <h4>Log</h4>
          <ul>
            {state.log
              .slice()
              .reverse()
              .slice(0, 8)
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ul>
        </Panel>
      );
    default:
      return null;
  }
}

function AcquireBtn({ id, price, cash }: { id: string; price: number; cash: number }) {
  const queue = useGameStore((s) => s.queue);
  return (
    <button
      type="button"
      className="ie-link-btn"
      disabled={cash < price}
      onClick={() => queue("acquire", { targetId: id })}
    >
      queue acquire
    </button>
  );
}