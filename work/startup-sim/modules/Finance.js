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
import {
  progressionRevenueMult,
  progressionTier,
  getTierRevenueProfile,
  progressionTierLabelAt
} from './ProgressionEconomy.js';
import { applyTaskRivalEffects } from './WorldDynamics.js';
import { scenarioCostMult, scenarioRevenueMult } from './ScenarioEffects.js';
import { loanOverheadMonthly } from './BankLoan.js';
import { ceoSalaryMonthly } from './CeoEconomics.js';
import { cooSalaryMonthly } from './Coo.js';
import { totalHeadcount } from './Staff.js';

/** Hard caps on desk + growth payout multiplier (after sandbox tuning overlay). */
export const REV_MULT_CAP_CAREER = 60;
export const REV_MULT_CAP_SANDBOX = 800;
export const SANDBOX_WORKFORCE_HEADCOUNT_FULL = 10_000;

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

/** Revenue uses career baseline so sandbox tuning overlay is explicit (e.g. 20× × 2× = 40×). */
function modeDifficultyMult(_state) {
  return 2 - MODE_CONFIG.career.difficulty;
}

/**
 * Progression + category + hub + staff + buzz (career-equivalent).
 * Sandbox tuning from setup is applied on top — see applySandboxRevenueTuning().
 */
export function getCoreTaskRevenueMult(state) {
  const econ = state.company.economics ?? { revenueMult: 1, costMult: 1 };
  const m =
    econ.revenueMult *
    modeDifficultyMult(state) *
    hubRevenueMult(state) *
    scalingRevenueMult(state) *
    competitorRevenueMult(state) *
    xcProgramRevenueMult(state) *
    acceleratorRevenueMult(state) *
    productBuzzRevenueMult(state) *
    staffRevenueMultiplier(state) *
    scenarioRevenueMult(state);
  return Math.round(m * 100) / 100;
}

/** Sandbox setup multiplier stacks on core (e.g. 20× core × 2× tuning = 40×). */
export function applySandboxRevenueTuning(state, coreMult) {
  if (state.mode !== 'sandbox') return coreMult;
  const tune = getSandboxExtraRevenueMult(state);
  return Math.round(coreMult * tune * 100) / 100;
}

export function getSandboxTuningMult(state) {
  return state.mode === 'sandbox' ? getSandboxExtraRevenueMult(state) : 1;
}

export function getTaskRevenueCap(state) {
  if (state.mode !== 'sandbox') return REV_MULT_CAP_CAREER;
  const hc = totalHeadcount(state.staff?.headcountByDept);
  const scale = Math.min(1, hc / SANDBOX_WORKFORCE_HEADCOUNT_FULL);
  /** 30% of cap at zero headcount → 100% at 10k employees (sandbox only). */
  const workforceScale = 0.3 + scale * 0.7;
  return Math.round(REV_MULT_CAP_SANDBOX * workforceScale * 100) / 100;
}

/** Core × sandbox tuning, before global cap. */
export function getRawTaskRevenueMultiplier(state) {
  return applySandboxRevenueTuning(state, getCoreTaskRevenueMult(state));
}

function clampTaskRevenueMult(state, mult) {
  const cap = getTaskRevenueCap(state);
  return Math.round(Math.min(mult, cap) * 100) / 100;
}

/** HUD rev× — capped desk payout multiplier (sandbox tuning included). */
export function getTaskRevenueMultiplierPreview(state) {
  return clampTaskRevenueMult(state, getRawTaskRevenueMultiplier(state));
}

export function isTaskRevenueMultCapped(state) {
  return getRawTaskRevenueMultiplier(state) > getTaskRevenueCap(state) + 0.001;
}

/** Label + tooltip for desk / growth HUD. */
export function taskRevenueMultHud(state) {
  const effective = getTaskRevenueMultiplierPreview(state);
  const raw = getRawTaskRevenueMultiplier(state);
  const cap = getTaskRevenueCap(state);
  const workforceNote =
    state.mode === 'sandbox'
      ? ` Sandbox workforce cap ${cap}× (scales to ${REV_MULT_CAP_SANDBOX}× at ${SANDBOX_WORKFORCE_HEADCOUNT_FULL.toLocaleString()} staff).`
      : '';
  if (isTaskRevenueMultCapped(state)) {
    return {
      effective,
      raw,
      cap,
      label: 'Rev× (capped)',
      title: `Uncapped stack ${raw.toFixed(1)}× — payouts use ${cap}× max.${workforceNote}`
    };
  }
  return {
    effective,
    raw,
    cap,
    label: 'Rev. mult',
    title: workforceNote.trim()
  };
}

/** Rough desk payout range at current mult (before per-task headcount roll variance). */
export function estimateTaskPayoutBand(taskDef, state) {
  const [rMin, rMax] = taskDef?.revenue ?? [0, 0];
  const eff = getTaskRevenueMultiplierPreview(state);
  return {
    min: Math.round(rMin * eff * 0.45),
    max: Math.round(rMax * eff * 1.05)
  };
}

/** Desk tasks with `mrrGain` — shown on pre-launch crowdfunding plays. */
export function estimateTaskMrrBand(taskDef) {
  const spec = taskDef?.mrrGain;
  if (spec == null) return null;
  if (Array.isArray(spec) && spec.length >= 2) {
    return { min: Math.round(spec[0]), max: Math.round(spec[1]) };
  }
  const n = Math.round(Number(spec));
  if (!n) return null;
  return { min: n, max: n };
}

export function projectMonthlyBurn(state) {
  const headcount = state.staff?.headcountByDept ?? {};
  const payroll = computePayroll(headcount, state.stage, state);
  let fixed = workspaceRentMonthly(state);
  fixed = Math.round(fixed * hubCostMult(state));
  return (
    payroll +
    fixed +
    satelliteRent(state) +
    loanOverheadMonthly(state) +
    ceoSalaryMonthly(state) +
    cooSalaryMonthly(state)
  );
}

function sandboxMult(state) {
  return state.mode === 'sandbox' ? MODE_CONFIG.sandbox.difficulty : MODE_CONFIG.career.difficulty;
}

function tierSingleActionShare(state, tier, profile) {
  if (profile.singleActionMrrShare == null) return null;
  const mrr = Math.max(Number(state.finance?.mrr) || 0, getArr(state) / 12);
  const logM = Math.log10(Math.max(mrr, 1e6));
  let share = profile.singleActionMrrShare;
  if (tier >= 7) share += (logM - 6) * 0.01;
  share = Math.min(0.22, Math.max(0.03, share));
  if (state.mode === 'sandbox') share = Math.min(0.28, share * 1.12);
  return share;
}

function tierMonthlyBookShare(state, tier, profile) {
  if (profile.monthlyBookMrrShare == null) return null;
  const mrr = Math.max(Number(state.finance?.mrr) || 0, getArr(state) / 12);
  const logM = Math.log10(Math.max(mrr, 1e6));
  let share = profile.monthlyBookMrrShare;
  if (tier >= 7) share += (logM - 6) * 0.035;
  share = Math.min(0.75, Math.max(0.22, share));
  if (state.mode === 'sandbox') share = Math.min(0.82, share * 1.05);
  return share;
}

/** MRR-aware ceiling for one desk task or growth campaign (scales up at mega-cap). */
export function maxSingleBookedRevenue(state) {
  const tier = progressionTier(state);
  const profile = getTierRevenueProfile(tier);
  const share = tierSingleActionShare(state, tier, profile);
  if (share == null) return Number.POSITIVE_INFINITY;
  const mrr = Math.max(Number(state.finance?.mrr) || 0, getArr(state) / 12);
  if (mrr <= 0) return Number.POSITIVE_INFINITY;
  const perAction = Math.round(mrr * share);
  const absolute = state.mode === 'sandbox' ? 400_000_000_000 : 120_000_000_000;
  return Math.max(1_000_000, Math.min(perAction, absolute));
}

/** Monthly cap on booked desk + growth cash (prevents multi-trillion single-month spikes). */
export function maxMonthlyBookedRevenue(state) {
  const tier = progressionTier(state);
  const profile = getTierRevenueProfile(tier);
  const share = tierMonthlyBookShare(state, tier, profile);
  if (share == null) return Number.POSITIVE_INFINITY;
  const mrr = Math.max(Number(state.finance?.mrr) || 0, getArr(state) / 12);
  if (mrr <= 0) return Number.POSITIVE_INFINITY;
  const monthly = Math.round(mrr * share);
  const absolute = state.mode === 'sandbox' ? 900_000_000_000 : 350_000_000_000;
  return Math.max(5_000_000, Math.min(monthly, absolute));
}

function scaledPayoutBand(baseRange, mult) {
  const [lo, hi] = baseRange;
  return [
    Math.round(lo * mult * 0.45),
    Math.round(hi * mult * 1.05)
  ];
}

/** Desk + growth payout ranges at current rev× for one progression tier (catalog base bands). */
export function estimateTierPayoutBands(tier, mult, state = null) {
  const profile = getTierRevenueProfile(tier);
  let desk = scaledPayoutBand(profile.deskBase, mult);
  if (profile.deskWhale) {
    const whale = scaledPayoutBand(profile.deskWhale, mult);
    desk = [desk[0], Math.max(desk[1], whale[1])];
  }
  const growth = scaledPayoutBand(profile.growthBase, mult);
  if (state && progressionTier(state) === tier && profile.singleActionMrrShare != null) {
    const cap = maxSingleBookedRevenue(state);
    desk = [desk[0], Math.min(desk[1], cap)];
    growth[1] = Math.min(growth[1], cap);
  }
  return { desk, growth, profile };
}

/** Current era payout snapshot for HUD / finance panel. */
export function estimateEraRevenuePotential(state) {
  const tier = progressionTier(state);
  const mult = getTaskRevenueMultiplierPreview(state);
  const { desk, growth, profile } = estimateTierPayoutBands(tier, mult, state);
  const monthlyCap =
    profile.monthlyBookMrrShare != null ? maxMonthlyBookedRevenue(state) : null;
  const singleCap =
    profile.singleActionMrrShare != null ? maxSingleBookedRevenue(state) : null;
  return {
    tier,
    label: progressionTierLabelAt(tier),
    mult,
    desk,
    growth,
    arrGuide: profile.arrGuide,
    monthlyCap,
    singleCap
  };
}

/** All tiers — base catalog bands and payout at current rev× (current tier includes MRR caps). */
export function allTierRevenuePotentialRows(state) {
  const mult = getTaskRevenueMultiplierPreview(state);
  const current = progressionTier(state);
  const rows = [];
  for (let tier = 0; tier <= 7; tier += 1) {
    const { desk, growth, profile } = estimateTierPayoutBands(
      tier,
      mult,
      tier === current ? state : null
    );
    rows.push({
      tier,
      label: progressionTierLabelAt(tier),
      arrGuide: profile.arrGuide,
      deskBase: profile.deskBase,
      growthBase: profile.growthBase,
      deskWhale: profile.deskWhale ?? null,
      deskPayout: desk,
      growthPayout: growth,
      isCurrent: tier === current,
      monthlyCap: tier === current ? maxMonthlyBookedRevenue(state) : null,
      singleCap: tier === current ? maxSingleBookedRevenue(state) : null
    });
  }
  return rows;
}

/** Cap one booking; also respects remaining room in the current month. */
export function clampBookedRevenue(state, raw) {
  const amount = Math.max(0, Math.round(Number(raw) || 0));
  if (getTierRevenueProfile(progressionTier(state)).singleActionMrrShare == null) return amount;
  let capped = Math.min(amount, maxSingleBookedRevenue(state));
  const monthCap = maxMonthlyBookedRevenue(state);
  const booked = state.calendar?.monthRevenue ?? 0;
  capped = Math.min(capped, Math.max(0, monthCap - booked));
  return capped;
}

/** Apply one task's cash flow immediately when completed. */
export function applyTaskOutcome(state, taskDef, rolled) {
  const econ = state.company.economics ?? { revenueMult: 1, costMult: 1 };
  const sand = sandboxMult(state);
  const cost = Math.round(
    (taskDef.cost ?? 0) *
      econ.costMult *
      sand *
      hubCostMult(state) *
      staffCostMultiplier(state) *
      scenarioCostMult(state)
  );
  const payoutMult = getTaskRevenueMultiplierPreview(state);
  const revenue = clampBookedRevenue(
    state,
    Math.round(rolled.revenue * payoutMult * staffRetentionBonus(state, taskDef))
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
  const mrrGain = rolled.mrrGain ?? 0;
  if (mrrGain > 0) {
    state.finance.mrr = (state.finance.mrr ?? 0) + mrrGain;
    state.finance.arr = Math.round(state.finance.mrr * 12);
    state.finance.monthlyRevenue = (state.finance.monthlyRevenue ?? 0) + mrrGain;
  }
  applyTaskRivalEffects(state, taskDef);

  return { cost, revenue, mrrGain };
}

export function rollTaskOutcome(taskDef, state) {
  const [rMin, rMax] = taskDef.revenue ?? [0, 0];
  const product = taskDef.product ?? 0;
  const buzz = taskDef.buzz ?? 0;
  const base = rMin + Math.random() * Math.max(0, rMax - rMin);
  const mult = headcountExecutionScale(state, taskDef) * departmentTaskMultiplier(state, taskDef);
  const revenue = Math.round(base * mult);
  let mrrGain = 0;
  const mrrSpec = taskDef.mrrGain;
  if (Array.isArray(mrrSpec) && mrrSpec.length >= 2) {
    const [mMin, mMax] = mrrSpec;
    mrrGain = Math.round(mMin + Math.random() * Math.max(0, mMax - mMin));
  } else if (mrrSpec > 0) {
    mrrGain = Math.round(Number(mrrSpec));
  }
  return { revenue, product, buzz, mrrGain };
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
