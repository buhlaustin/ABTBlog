import { formatMoney, STAGES } from './constants.js';
import { calendarTurn } from './XC.js';
import { computePayroll, totalHeadcount } from './Staff.js';
import { satelliteRent } from './Offices.js';
import { workspaceRentMonthly, getWorkspaceTier, WORKSPACE_TIER } from './Workspace.js';

function hubCostMult(state) {
  return state?.offices?.modifiers?.costMult ?? 1;
}
import { loanOverheadMonthly } from './BankLoan.js';
import { isPublicCompany } from './IPO.js';
import { cooSalaryMonthly } from './Coo.js';
import { executiveTeamSalaryMonthly } from './ExecutiveTeam.js';

function ceoCompMonthly(state) {
  return Math.round((state.ceo?.salaryAnnual ?? 0) / 12);
}

function cooCompMonthly(state) {
  return Math.round(cooSalaryMonthly(state));
}

function otherExecutiveCompMonthly(state) {
  return Math.round(executiveTeamSalaryMonthly(state));
}

/** Rolled monthly OPEX lines (excludes payroll, exec comp, rent, debt). */
export const COMPANY_VARIABLE_OPEX_CATEGORIES = [
  'Cloud & infrastructure',
  'SaaS & business tools',
  'Sales & marketing programs',
  'G&A & professional services',
  'Benefits & payroll admin',
  'Insurance & compliance'
];

const TIER_VARIABLE_OPEX_BASE = {
  [WORKSPACE_TIER.GARAGE]: 780,
  [WORKSPACE_TIER.SMALL]: 2_100,
  [WORKSPACE_TIER.MEDIUM]: 4_600,
  [WORKSPACE_TIER.LARGE]: 10_500,
  [WORKSPACE_TIER.CAMPUS]: 28_000,
  [WORKSPACE_TIER.HUB]: 82_000
};

const TIER_PER_HEADCOUNT_OPEX = {
  [WORKSPACE_TIER.GARAGE]: 72,
  [WORKSPACE_TIER.SMALL]: 95,
  [WORKSPACE_TIER.MEDIUM]: 118,
  [WORKSPACE_TIER.LARGE]: 142,
  [WORKSPACE_TIER.CAMPUS]: 168,
  [WORKSPACE_TIER.HUB]: 195
};

function overheadRollUnit(state, salt = 0) {
  const turn = calendarTurn(state);
  const seed = state.meta?.runSeed ?? 0;
  const hc = totalHeadcount(state.staff?.headcountByDept);
  let h = (seed ^ Math.imul(turn + salt * 23, 2_654_435_761) ^ Math.imul(hc + 1, 1_597_334_677)) >>> 0;
  h = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return h / 0xffffffff;
}

export function companyVariableOverheadBand(state) {
  const tier = getWorkspaceTier(state);
  const hc = totalHeadcount(state.staff?.headcountByDept);
  const base = TIER_VARIABLE_OPEX_BASE[tier] ?? TIER_VARIABLE_OPEX_BASE[WORKSPACE_TIER.GARAGE];
  const perHc = TIER_PER_HEADCOUNT_OPEX[tier] ?? 72;
  let min = base + Math.round(hc * perHc * 0.88);
  let max = base + Math.round(hc * perHc * 1.18);
  if (isPublicCompany(state)) {
    min += 38_000;
    max += 52_000;
  } else if (state.stage === STAGES.POST_XC || state.flags?.seriesAClosed) {
    min = Math.round(min * 1.06);
    max = Math.round(max * 1.1);
  }
  let label = 'Lean startup OPEX';
  if (tier === WORKSPACE_TIER.HUB) label = 'Global HQ operating load';
  else if (tier === WORKSPACE_TIER.CAMPUS) label = 'Campus-scale operating load';
  else if (tier === WORKSPACE_TIER.LARGE || tier === WORKSPACE_TIER.MEDIUM) {
    label = 'Growth-stage vendor & programs band';
  } else if (tier === WORKSPACE_TIER.SMALL) label = 'Early office tools & vendors';
  if (isPublicCompany(state)) label = 'Public company operating load (incl. IR & audit)';
  return { min, max, label, tier, headcount: hc };
}

function rollVariableOverheadTotal(state) {
  const band = companyVariableOverheadBand(state);
  const u = overheadRollUnit(state, 0);
  let total = Math.round(band.min + u * Math.max(0, band.max - band.min));
  const spikeRoll = overheadRollUnit(state, 1);
  if (spikeRoll < 0.09) {
    total = Math.round(total * (1.04 + spikeRoll * 0.22));
    total = Math.min(total, Math.round(band.max * 1.12));
  }
  return Math.max(band.min, total);
}

function buildVariableOpexBreakdown(state, total) {
  const cats = [...COMPANY_VARIABLE_OPEX_CATEGORIES];
  if (isPublicCompany(state)) cats.push('Public IR & audit');
  const weights = cats.map((_, i) => 0.4 + overheadRollUnit(state, 40 + i));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const parts = cats.map((label, i) => ({
    label,
    amount: Math.max(label.includes('Cloud') ? 120 : 80, Math.round((weights[i] / weightSum) * total))
  }));
  let delta = total - parts.reduce((s, p) => s + p.amount, 0);
  parts[0].amount += delta;
  return parts.filter((p) => p.amount > 0);
}

/** Full company overhead — payroll, facilities, debt, exec comp, and rolled OPEX. */
export function computeCompanyOverheadBreakdown(state) {
  const headcount = state.staff?.headcountByDept ?? {};
  const payroll = computePayroll(headcount, state.stage, state);
  const workspaceRent = Math.round(workspaceRentMonthly(state) * hubCostMult(state));
  const satellite = satelliteRent(state);
  const loan = loanOverheadMonthly(state);
  const ceoMo = ceoCompMonthly(state);
  const cooMo = cooCompMonthly(state);
  const execMo = otherExecutiveCompMonthly(state);
  const variableTotal = rollVariableOverheadTotal(state);
  const band = companyVariableOverheadBand(state);

  const breakdown = [];
  if (payroll > 0) breakdown.push({ label: 'Payroll', amount: payroll });
  if (ceoMo > 0) breakdown.push({ label: 'CEO compensation', amount: ceoMo });
  if (cooMo > 0) breakdown.push({ label: 'COO compensation', amount: cooMo });
  if (execMo > 0) breakdown.push({ label: 'Other executive compensation', amount: execMo });
  if (workspaceRent > 0) breakdown.push({ label: 'Workspace rent', amount: workspaceRent });
  if (satellite > 0) breakdown.push({ label: 'Satellite offices', amount: satellite });
  if (loan > 0) breakdown.push({ label: 'Debt service', amount: loan });
  breakdown.push(...buildVariableOpexBreakdown(state, variableTotal));

  let total = breakdown.reduce((s, line) => s + line.amount, 0);
  return { total, breakdown, band };
}

export function prepareCompanyOverheadForMonth(state) {
  if (!state.finance) state.finance = {};
  const turn = calendarTurn(state);
  const { total, breakdown, band } = computeCompanyOverheadBreakdown(state);
  state.finance.overheadScheduled = {
    turn,
    total,
    breakdown,
    bandLabel: band.label,
    bandMin: band.min,
    bandMax: band.max,
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  };
  return state.finance.overheadScheduled;
}

export function scheduledCompanyOverhead(state) {
  const turn = calendarTurn(state);
  if (state.finance?.overheadScheduled?.turn === turn) {
    return state.finance.overheadScheduled;
  }
  return prepareCompanyOverheadForMonth(state);
}

export function typicalCompanyOverheadMonthly(state) {
  const band = companyVariableOverheadBand(state);
  const structural = computeCompanyOverheadBreakdown(state);
  const payroll = structural.breakdown.find((l) => l.label === 'Payroll')?.amount ?? 0;
  const exec =
    (structural.breakdown.find((l) => l.label === 'CEO compensation')?.amount ?? 0) +
    (structural.breakdown.find((l) => l.label === 'COO compensation')?.amount ?? 0);
  const facilities =
    (structural.breakdown.find((l) => l.label === 'Workspace rent')?.amount ?? 0) +
    (structural.breakdown.find((l) => l.label === 'Satellite offices')?.amount ?? 0) +
    (structural.breakdown.find((l) => l.label === 'Debt service')?.amount ?? 0);
  const variableMid = Math.round((band.min + band.max) / 2);
  return payroll + exec + facilities + variableMid;
}

export function renderCompanyOverheadBreakdownHtml(breakdown) {
  if (!breakdown?.length) return '';
  const rows = breakdown
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.label)}</td><td class="num">${formatMoney(line.amount)}</td></tr>`
    )
    .join('');
  return `<div class="table-scroll ceo-debit-table">
    <table class="data-table">
      <thead><tr><th>Category</th><th>This month</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
