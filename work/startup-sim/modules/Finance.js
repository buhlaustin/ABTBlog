import { formatMoney, MODE_CONFIG } from './constants.js';
import {
  computePayroll,
  staffRevenueMultiplier,
  headcountExecutionScale,
  departmentTaskMultiplier,
  staffCostMultiplier,
  staffRetentionBonus
} from './Staff.js';
import { satelliteRent } from './Offices.js';
import { workspaceRentMonthly, getArr } from './Workspace.js';
import { competitorRevenueMult } from './Competitor.js';
import { getSandboxExtraRevenueMult } from './SandboxTuning.js';
import { xcProgramRevenueMult, xcProgramProductBonus } from './XC.js';
import { acceleratorRevenueMult } from './Accelerators.js';
import { progressionRevenueMult } from './ProgressionEconomy.js';

/** Legacy alias — progression stack replaces seed-only scaling. */
export function scalingRevenueMult(state) {
  return progressionRevenueMult(state);
}

export function hubRevenueMult(state) {
  return state?.offices?.modifiers?.revenueMult ?? 1;
}

export function hubCostMult(state) {
  return state?.offices?.modifiers?.costMult ?? 1;
}

export function productBuzzRevenueMult(state) {
  const buzz = state.product?.buzz ?? 0;
  const level = state.product?.level ?? 0;
  const buzzBonus = Math.min(0.18, buzz * 0.022);
  const levelBonus = Math.min(0.22, level * 0.032);
  return 1 + buzzBonus + levelBonus;
}

/** Approximate desk-task revenue multiplier shown in HUD (not category ACV alone). */
export function getTaskRevenueMultiplierPreview(state) {
  const econ = state.company.economics ?? { revenueMult: 1, costMult: 1 };
  const sand = state.mode === 'sandbox' ? MODE_CONFIG.sandbox.difficulty : MODE_CONFIG.career.difficulty;
  const m =
    econ.revenueMult *
    (2 - sand) *
    hubRevenueMult(state) *
    scalingRevenueMult(state) *
    competitorRevenueMult(state) *
    getSandboxExtraRevenueMult(state) *
    xcProgramRevenueMult(state) *
    acceleratorRevenueMult(state) *
    productBuzzRevenueMult(state) *
    staffRevenueMultiplier(state);
  return Math.round(m * 100) / 100;
}

export function projectMonthlyBurn(state) {
  const headcount = state.staff?.headcountByDept ?? {};
  const payroll = computePayroll(headcount, state.stage, state);
  let fixed = workspaceRentMonthly(state);
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
  const cost = Math.round(
    (taskDef.cost ?? 0) * econ.costMult * sand * hubCostMult(state) * staffCostMultiplier(state)
  );
  const revenue = Math.round(
    rolled.revenue *
      econ.revenueMult *
      (2 - sand) *
      hubRevenueMult(state) *
      scalingRevenueMult(state) *
      competitorRevenueMult(state) *
      getSandboxExtraRevenueMult(state) *
      xcProgramRevenueMult(state) *
      acceleratorRevenueMult(state) *
      staffRevenueMultiplier(state) *
      staffRetentionBonus(state, taskDef)
  );

  state.finance.cash -= cost;
  state.finance.cash += revenue;
  state.finance.lifetimeRevenue += revenue;
  if (cost > 0) recordCashOutflow(state, cost, 'task');
  state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + revenue;
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;

  const productGain = Math.round((rolled.product ?? 0) * xcProgramProductBonus(state));
  state.product.level = (state.product.level ?? 0) + productGain;
  const buzzGain = rolled.buzz ?? 0;
  state.product.buzz = (state.product.buzz ?? 0) + buzzGain;

  return { cost, revenue };
}

export function rollTaskOutcome(taskDef, state) {
  const [rMin, rMax] = taskDef.revenue ?? [0, 0];
  const product = taskDef.product ?? 0;
  const buzz = taskDef.buzz ?? 0;
  const base = rMin + Math.random() * Math.max(0, rMax - rMin);
  const mult =
    headcountExecutionScale(state, taskDef) *
    departmentTaskMultiplier(state, taskDef) *
    productBuzzRevenueMult(state);
  const revenue = Math.round(base * mult);
  return { revenue, product, buzz };
}

/** Track spend for lifetime P&L (does not move cash — caller adjusts cash separately). */
export function recordCashOutflow(state, amount, _category = 'other') {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (!n) return;
  if (!state.finance) state.finance = {};
  state.finance.lifetimeExpenses = (state.finance.lifetimeExpenses ?? 0) + n;
  syncLifetimeProfit(state);
}

export function syncLifetimeProfit(state) {
  if (!state.finance) return 0;
  const rev = state.finance.lifetimeRevenue ?? 0;
  const exp = state.finance.lifetimeExpenses ?? 0;
  state.finance.lifetimeProfit = rev - exp;
  return state.finance.lifetimeProfit;
}

export function founderEquityPct(state) {
  return state.capTable?.find((r) => r.id === 'founder')?.pct ?? 100;
}

/** Paper wealth from last known private valuation (pre-IPO). */
export function founderValuationStake(state) {
  const val = state.finance?.valuation;
  if (!val || val <= 0) return null;
  return Math.round((val * founderEquityPct(state)) / 100);
}

export function initialInvestmentCash(state) {
  if (state.meta?.initialInvestmentCash != null) return state.meta.initialInvestmentCash;
  if (state.mode === 'sandbox' && state.sandboxStartingCash != null) {
    return state.sandboxStartingCash;
  }
  return MODE_CONFIG[state.mode === 'sandbox' ? 'sandbox' : 'career'].startingCash;
}

/** Month-end: payroll + fixed burn, update MRR snapshot. */
export function resolveMonthEndBurn(state) {
  const burn = projectMonthlyBurn(state);
  state.finance.cash -= burn;
  recordCashOutflow(state, burn, 'overhead');
  state.finance.monthlyBurn = burn;
  state.finance.monthlyRevenue = state.calendar.monthRevenue ?? 0;
  state.finance.mrr = Math.round(state.finance.monthlyRevenue);
  state.finance.arr = Math.round(state.finance.mrr * 12);
  return burn;
}

export function renderFinanceSummary(state) {
  const burn = projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  const runway = burn > 0 ? `${(cash / burn).toFixed(1)} mo` : '∞';
  syncLifetimeProfit(state);

  return {
    burn,
    runway,
    burnLabel: formatMoney(burn),
    cashLabel: formatMoney(cash),
    mrrLabel: formatMoney(state.finance?.mrr ?? 0),
    lifetimeRevenueLabel: formatMoney(state.finance?.lifetimeRevenue ?? 0),
    lifetimeExpensesLabel: formatMoney(state.finance?.lifetimeExpenses ?? 0),
    lifetimeProfitLabel: formatMoney(state.finance?.lifetimeProfit ?? 0),
    initialInvestmentLabel: formatMoney(initialInvestmentCash(state)),
    founderStakeLabel: founderValuationStake(state) != null ? formatMoney(founderValuationStake(state)) : '—'
  };
}
