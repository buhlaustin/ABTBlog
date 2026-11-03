import { formatMoney, MODE_CONFIG, fixedCostsForStage } from './GameState.js';
import { computePayroll, staffRevenueMultiplier } from './Staff.js';
import { satelliteRent } from './Offices.js';
import { scalingRevenueMult } from './IPO.js';

export function hubRevenueMult(state) {
  return state?.offices?.modifiers?.revenueMult ?? 1;
}

export function hubCostMult(state) {
  return state?.offices?.modifiers?.costMult ?? 1;
}

export function projectMonthlyBurn(state) {
  const headcount = state.staff?.headcountByDept ?? {};
  const payroll = computePayroll(headcount, state.stage, state);
  let fixed =
    typeof state.finance?.fixedCostsMonthly === 'number'
      ? state.finance.fixedCostsMonthly
      : fixedCostsForStage(state.stage);
  fixed = Math.round(fixed * hubCostMult(state));
  return payroll + fixed + satelliteRent(state);
}

function sandboxMult(state) {
  return state.mode === 'sandbox' ? MODE_CONFIG.sandbox.difficulty : MODE_CONFIG.career.difficulty;
}

/** Apply one task's cash flow immediately when completed. */
export function applyTaskOutcome(state, taskDef, rolled) {
  const econ = state.company.economics ?? { revenueMult: 1, costMult: 1 };
  const sand = sandboxMult(state);
  const cost = Math.round((taskDef.cost ?? 0) * econ.costMult * sand * hubCostMult(state));
  const revenue = Math.round(
    rolled.revenue * econ.revenueMult * (2 - sand) * hubRevenueMult(state) * scalingRevenueMult(state)
  );

  state.finance.cash -= cost;
  state.finance.cash += revenue;
  state.finance.lifetimeRevenue += revenue;
  state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + revenue;
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;

  state.product.level = (state.product.level ?? 0) + (rolled.product ?? 0);
  state.product.buzz = (state.product.buzz ?? 0) + (rolled.buzz ?? 0);

  return { cost, revenue };
}

export function rollTaskOutcome(taskDef, state) {
  const [rMin, rMax] = taskDef.revenue ?? [0, 0];
  const product = taskDef.product ?? 0;
  const buzz = taskDef.buzz ?? 0;
  const buzzBonus = Math.min(0.15, (state.product.buzz ?? 0) * 0.02);
  const levelBonus = Math.min(0.2, (state.product.level ?? 0) * 0.03);
  const mult = (1 + buzzBonus + levelBonus) * staffRevenueMultiplier(state);
  const revenue = Math.round((rMin + Math.random() * (rMax - rMin)) * mult);
  return { revenue, product, buzz };
}

/** Month-end: payroll + fixed burn, update MRR snapshot. */
export function resolveMonthEndBurn(state) {
  const burn = projectMonthlyBurn(state);
  state.finance.cash -= burn;
  state.finance.monthlyBurn = burn;
  state.finance.monthlyRevenue = state.calendar.monthRevenue ?? 0;
  state.finance.mrr = Math.round(state.finance.monthlyRevenue);
  return burn;
}

export function renderFinanceSummary(state) {
  const burn = projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  const runway = burn > 0 ? `${(cash / burn).toFixed(1)} mo` : '∞';

  return {
    burn,
    runway,
    burnLabel: formatMoney(burn),
    cashLabel: formatMoney(cash),
    mrrLabel: formatMoney(state.finance?.mrr ?? 0)
  };
}
