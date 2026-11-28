import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GameState } from "@/sim";

export function FinanceCharts({ state }: { state: GameState }) {
  if (state.history.length < 2) {
    return <p className="ie-muted">End a month to see trends.</p>;
  }
  const data = state.history.slice(-24).map((h) => ({
    m: h.monthIndex,
    visitors: h.visitors,
    cash: h.cash,
    valuation: h.valuation,
    revenue: h.revenue ?? 0,
  }));
  return (
    <div className="ie-charts">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="m" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Area type="monotone" dataKey="visitors" stroke="#38bdf8" fill="#0ea5e933" />
        </AreaChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="m" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Area type="monotone" dataKey="valuation" stroke="#a78bfa" fill="#8b5cf633" />
        </AreaChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="m" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Area type="monotone" dataKey="revenue" stroke="#4ade80" fill="#22c55e33" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}