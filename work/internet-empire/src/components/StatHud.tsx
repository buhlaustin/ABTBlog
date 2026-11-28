import { employeeCount } from "@/sim/calendar";
import type { GameState } from "@/sim";
import { formatMoney } from "@/lib/format";

export function StatHud({ state }: { state: GameState }) {
  const employees = employeeCount(state.headcount) + 1;
  const stats = [
    { label: "Cash", value: formatMoney(state.cash) },
    { label: "Employees", value: String(employees) },
    { label: "Website visitors", value: state.visitors.toLocaleString() },
    { label: "Valuation", value: formatMoney(state.valuation) },
  ];
  return (
    <p className="ie-stat-grid">
      {stats.map((s) => (
        <span key={s.label} className="ie-stat">
          <span className="ie-stat-label">{s.label}</span>
          <span className="ie-stat-value">{s.value}</span>
        </span>
      ))}
    </p>
  );
}