import type { GameState } from "@/sim";
import { estimateRevenueBreakdown } from "@/sim/monetization";

export function FinanceBreakdown({ state }: { state: GameState }) {
  const b = estimateRevenueBreakdown(state);
  const mon = state.monetization;

  return (
    <div className="ie-finance-breakdown">
      <h4>Next month estimate</h4>
      <ul>
        <li>Product MRR × multipliers: ${b.productMrr.toLocaleString()}</li>
        <li>Enterprise contracts: ${b.contractMrr.toLocaleString()}</li>
        <li>Ads (current traffic): ${b.adEstimate.toLocaleString()}</li>
        <li>
          <strong>Total ≈ ${b.totalEstimate.toLocaleString()}</strong>
        </li>
      </ul>
      <p className="ie-muted">
        Product mult {mon.productRevenueMult.toFixed(2)} · Ad ARPU mult {mon.adArpuMult.toFixed(2)} · Sales{" "}
        {state.headcount.sales} · Execs {state.headcount.executives}
      </p>
    </div>
  );
}