import { formatMoney } from './GameState.js';
import { computePayroll } from './Staff.js';

/** Phase 1: monthly burn/revenue resolution. */
export function projectMonthlyBurn(state) {
  const draft = state.staff?.draftHeadcountByDept ?? {};
  const payroll = computePayroll(draft, state.stage);
  const fixed = state.finance?.fixedCostsMonthly ?? 0;
  return payroll + fixed;
}

export function renderFinanceSummary(state) {
  const burn = projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  const runway =
    burn > 0 ? `${(cash / burn).toFixed(1)} mo` : '∞';

  return {
    burn,
    runway,
    burnLabel: formatMoney(burn),
    cashLabel: formatMoney(cash)
  };
}
