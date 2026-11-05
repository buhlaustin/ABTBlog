import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import {
  computePayroll,
  totalHeadcount,
  emptyHeadcount,
  renderPeopleStaffingPanel
} from './Staff.js';
import { ceoSalaryMonthly } from './CeoEconomics.js';
import { cooSalaryMonthly } from './Coo.js';
import { adjustSentiment } from './Sentiment.js';
import { easeCompetitorPressure } from './Competitor.js';
import { expandEmployeeOptionPool, getOptionPoolRow } from './CapTable.js';
import { calendarTurn } from './GameCalendar.js';
import { formatCalendarStamp } from './GameCalendar.js';

export const COMPANY_BONUS_PCTS = [2, 5, 10, 20];

export const OFFSITE_PROGRAMS = [
  {
    id: 'local',
    label: 'Local offsite',
    cost: 200_000,
    buzz: 2,
    sentiment: 4,
    rivalEase: 0,
    blurb: 'Two-day retreat — strategy, karaoke, questionable trust falls.'
  },
  {
    id: 'regional',
    label: 'Regional offsite',
    cost: 500_000,
    buzz: 3,
    sentiment: 6,
    rivalEase: 0,
    blurb: 'Fly everyone to a resort city; expense reports become folklore.'
  },
  {
    id: 'national',
    label: 'National offsite',
    cost: 1_000_000,
    buzz: 4,
    sentiment: 8,
    rivalEase: 1,
    blurb: 'Whole company, fancy venue, live band, zero slides on day two.'
  },
  {
    id: 'summit',
    label: 'Executive summit',
    cost: 10_000_000,
    buzz: 6,
    sentiment: 10,
    rivalEase: 1,
    blurb: 'IPO-scale blowout — customers optional, influencers invited.'
  },
  {
    id: 'flagship',
    label: 'Flagship experience',
    cost: 25_000_000,
    buzz: 8,
    sentiment: 12,
    rivalEase: 2,
    blurb: 'Destination week — if the press does not notice, you did it wrong.'
  }
];

export const EXTRA_PERKS = [
  {
    id: 'learning',
    label: 'Learning stipend',
    cost: 50_000,
    buzz: 1,
    sentiment: 3,
    blurb: '$1k/person course budget — Udemy and one legit conference.'
  },
  {
    id: 'celebration',
    label: 'Company celebration',
    cost: 25_000,
    buzz: 2,
    sentiment: 2,
    blurb: 'Catered win party — morale patch for a brutal month.'
  }
];

export const OPTION_POOL_EXPAND_PCTS = [2, 5, 10, 15];

function ensurePeoplePrograms(state) {
  if (!state.staff) return;
  if (!state.staff.benefitsThisMonth) {
    state.staff.benefitsThisMonth = { companyBonusPct: null, offsiteId: null, perks: [] };
  }
  if (!state.staff.optionPoolLog) state.staff.optionPoolLog = [];
  if (state.staff.peopleSection == null) state.staff.peopleSection = 'staffing';
}

export function resetEmployeeBenefitsMonth(state) {
  ensurePeoplePrograms(state);
  state.staff.benefitsThisMonth = { companyBonusPct: null, offsiteId: null, perks: [] };
  state.staff.optionPoolExpandedThisMonth = false;
}

/** Monthly salary mass: department payroll + CEO + COO (annual/12). */
export function totalEmployeeSalaryMassMonthly(state) {
  const hc = state.staff?.headcountByDept ?? emptyHeadcount();
  const payroll = computePayroll(hc, state.stage, state);
  const ceo = ceoSalaryMonthly(state);
  const coo = cooSalaryMonthly(state);
  return {
    payroll,
    ceo,
    coo,
    total: payroll + ceo + coo,
    headcount: totalHeadcount(hc)
  };
}

function payFromCompanyCash(state, amount, reason) {
  const cost = Math.round(Number(amount) || 0);
  if (cost <= 0) return { ok: false, reason: 'Invalid amount.' };
  const cash = state.finance?.cash ?? 0;
  if (cash < cost) {
    return { ok: false, reason: `Need ${formatMoney(cost)} company cash (have ${formatMoney(cash)}).` };
  }
  state.finance.cash -= cost;
  recordCashOutflow(state, cost, reason);
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + cost;
  return { ok: true, cost };
}

function creditCeoBonusShare(state, amount, pct) {
  const pay = Math.round(Number(amount) || 0);
  if (pay <= 0) return 0;
  const ceo = state.ceo;
  if (!ceo) return 0;
  ceo.bankBalance = (ceo.bankBalance ?? 0) + pay;
  ceo.careerEmployeeBonuses = (ceo.careerEmployeeBonuses ?? 0) + pay;
  if (!ceo.bankLog) ceo.bankLog = [];
  ceo.bankLog.push({
    kind: 'bonus',
    amount: pay,
    delta: pay,
    balanceAfter: ceo.bankBalance,
    label: `Company bonus (${pct}% pool)`,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  return pay;
}

export function payCompanyWideBonus(state, pctRaw) {
  ensurePeoplePrograms(state);
  const pct = Number(pctRaw);
  if (!COMPANY_BONUS_PCTS.includes(pct)) {
    return { ok: false, reason: 'Choose 2%, 5%, 10%, or 20% bonus.' };
  }
  if (state.staff.benefitsThisMonth.companyBonusPct != null) {
    return { ok: false, reason: 'Already paid a company bonus this month.' };
  }
  const mass = totalEmployeeSalaryMassMonthly(state);
  if (mass.total < 1) {
    return { ok: false, reason: 'No salary mass to bonus — hire staff or set CEO pay first.' };
  }
  const pool = Math.round(mass.total * (pct / 100));
  const paid = payFromCompanyCash(state, pool, 'employee-bonus');
  if (!paid.ok) return paid;

  const ceoShare = mass.ceo > 0 ? Math.round(pool * (mass.ceo / mass.total)) : 0;
  if (ceoShare > 0) creditCeoBonusShare(state, ceoShare, pct);

  state.staff.benefitsThisMonth.companyBonusPct = pct;
  state.product.buzz = (state.product?.buzz ?? 0) + Math.min(6, Math.ceil(pct / 4));
  adjustSentiment(state, Math.min(8, Math.ceil(pct / 2)), `Company-wide ${pct}% bonus.`);

  return {
    ok: true,
    pct,
    pool: paid.cost,
    ceoShare,
    mass
  };
}

export function conductEmployeeOffsite(state, programId) {
  ensurePeoplePrograms(state);
  const program = OFFSITE_PROGRAMS.find((p) => p.id === programId);
  if (!program) return { ok: false, reason: 'Unknown offsite program.' };
  if (state.staff.benefitsThisMonth.offsiteId) {
    return { ok: false, reason: 'Already ran an offsite this month.' };
  }
  const paid = payFromCompanyCash(state, program.cost, 'employee-offsite');
  if (!paid.ok) return paid;

  state.staff.benefitsThisMonth.offsiteId = program.id;
  state.product.buzz = (state.product?.buzz ?? 0) + (program.buzz ?? 0);
  adjustSentiment(state, program.sentiment ?? 0, program.label);
  if (program.rivalEase) easeCompetitorPressure(state, program.rivalEase);

  return { ok: true, program, cost: paid.cost };
}

export function runExtraEmployeePerk(state, perkId) {
  ensurePeoplePrograms(state);
  const perk = EXTRA_PERKS.find((p) => p.id === perkId);
  if (!perk) return { ok: false, reason: 'Unknown perk.' };
  const perks = state.staff.benefitsThisMonth.perks ?? [];
  if (perks.includes(perk.id)) {
    return { ok: false, reason: 'Already ran that perk this month.' };
  }
  const paid = payFromCompanyCash(state, perk.cost, 'employee-perk');
  if (!paid.ok) return paid;

  perks.push(perk.id);
  state.staff.benefitsThisMonth.perks = perks;
  state.product.buzz = (state.product?.buzz ?? 0) + (perk.buzz ?? 0);
  adjustSentiment(state, perk.sentiment ?? 0, perk.label);

  return { ok: true, perk, cost: paid.cost };
}

export function issueFurtherOptionPool(state, pctPointsRaw) {
  ensurePeoplePrograms(state);
  const pctPoints = Number(pctPointsRaw);
  if (!OPTION_POOL_EXPAND_PCTS.includes(pctPoints)) {
    return { ok: false, reason: 'Choose 2%, 5%, 10%, or 15% pool expansion.' };
  }
  if (state.staff.optionPoolExpandedThisMonth) {
    return { ok: false, reason: 'Already expanded the option pool this month.' };
  }
  const result = expandEmployeeOptionPool(state, pctPoints);
  if (!result.ok) return result;
  state.staff.optionPoolExpandedThisMonth = true;
  state.staff.optionPoolLog.push({
    pctPoints,
    sharesAdded: result.sharesAdded,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  adjustSentiment(state, -Math.min(4, Math.ceil(pctPoints / 4)), 'Board noted new option pool refresh.');
  return result;
}

export function setPeopleSection(state, section) {
  ensurePeoplePrograms(state);
  const allowed = new Set(['staffing', 'benefits', 'equity']);
  state.staff.peopleSection = allowed.has(section) ? section : 'staffing';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderEmployeeBenefitsPanel(container, state) {
  if (!container) return;
  ensurePeoplePrograms(state);
  const mass = totalEmployeeSalaryMassMonthly(state);
  const bonusDone = state.staff.benefitsThisMonth.companyBonusPct;
  const offsiteDone = state.staff.benefitsThisMonth.offsiteId;
  const perksDone = new Set(state.staff.benefitsThisMonth.perks ?? []);

  const bonusButtons = COMPANY_BONUS_PCTS.map((pct) => {
    const est = Math.round(mass.total * (pct / 100));
    const disabled =
      bonusDone != null || mass.total < 1 || (state.finance?.cash ?? 0) < est ? ' disabled' : '';
    return `<button type="button" class="btn btn-ghost btn-small" data-company-bonus="${pct}"${disabled}>${pct}% · ${formatMoney(est)}</button>`;
  }).join('');

  const offsiteCards = OFFSITE_PROGRAMS.map((p) => {
    const disabled =
      offsiteDone || (state.finance?.cash ?? 0) < p.cost ? ' disabled' : '';
    return `<div class="finance-action">
      <p><strong>${escapeHtml(p.label)}</strong> — ${formatMoney(p.cost)}</p>
      <p class="fine-print">${escapeHtml(p.blurb)} Buzz +${p.buzz} · morale +${p.sentiment}${p.rivalEase ? ` · rival heat −${p.rivalEase}` : ''}.</p>
      <button type="button" class="btn btn-primary btn-small" data-employee-offsite="${escapeHtml(p.id)}"${disabled}>Book offsite</button>
    </div>`;
  }).join('');

  const perkCards = EXTRA_PERKS.map((p) => {
    const disabled = perksDone.has(p.id) || (state.finance?.cash ?? 0) < p.cost ? ' disabled' : '';
    return `<div class="finance-action">
      <p><strong>${escapeHtml(p.label)}</strong> — ${formatMoney(p.cost)}</p>
      <p class="fine-print">${escapeHtml(p.blurb)}</p>
      <button type="button" class="btn btn-ghost btn-small" data-employee-perk="${escapeHtml(p.id)}"${disabled}>Run perk</button>
    </div>`;
  }).join('');

  container.innerHTML = `
    <p class="panel-lede">Perks and morale spend — not health insurance. Bonuses use <strong>one month&apos;s salary mass</strong> (payroll + CEO + COO). CEO&apos;s share deposits to the <strong>CEO tab</strong> bank ledger.</p>
    <div class="summary-grid">
      <div><span class="stat-label">Salary mass / mo</span><span class="stat-value">${formatMoney(mass.total)}</span></div>
      <div><span class="stat-label">Payroll</span><span class="stat-value">${formatMoney(mass.payroll)}</span></div>
      <div><span class="stat-label">CEO + COO</span><span class="stat-value">${formatMoney(mass.ceo + mass.coo)}</span></div>
      <div><span class="stat-label">Headcount</span><span class="stat-value">${mass.headcount}</span></div>
    </div>
    <h3 class="log-head">Company bonus</h3>
    <p class="fine-print">${bonusDone != null ? `Paid <strong>${bonusDone}%</strong> bonus this month.` : 'One bonus per month — includes CEO in the pool.'}</p>
    <div class="benefits-preset-row">${bonusButtons}</div>
    <h3 class="log-head">Offsites</h3>
    <p class="fine-print">${offsiteDone ? `Booked <strong>${escapeHtml(OFFSITE_PROGRAMS.find((p) => p.id === offsiteDone)?.label ?? offsiteDone)}</strong> this month.` : 'One offsite per month.'}</p>
    ${offsiteCards}
    <h3 class="log-head">Quick perks</h3>
    ${perkCards}
  `;
}

export function renderPeoplePanel(container, state) {
  if (!container) return;
  ensurePeoplePrograms(state);
  const section = state.staff.peopleSection;
  const tab = (id, label) =>
    `<button type="button" class="${section === id ? 'active' : ''}" data-people-tab="${id}">${label}</button>`;

  container.innerHTML = `
    <nav class="people-subtabs" aria-label="People sections">
      ${tab('staffing', 'Staffing')}
      ${tab('benefits', 'Employee perks')}
      ${tab('equity', 'Option pool')}
    </nav>
    <div id="people-section-mount"></div>
  `;

  const mount = document.getElementById('people-section-mount');
  if (section === 'benefits') renderEmployeeBenefitsPanel(mount, state);
  else if (section === 'equity') renderOptionPoolPanel(mount, state);
  else renderPeopleStaffingPanel(mount, state);
}

export function renderOptionPoolPanel(container, state) {
  if (!container) return;
  ensurePeoplePrograms(state);
  const poolRow = getOptionPoolRow(state);
  const poolExpanded = state.staff.optionPoolExpandedThisMonth;
  const poolButtons = OPTION_POOL_EXPAND_PCTS.map((pct) => {
    const disabled = poolExpanded ? ' disabled' : '';
    return `<button type="button" class="btn btn-primary btn-small" data-expand-option-pool="${pct}"${disabled}>Expand +${pct}% FD</button>`;
  }).join('');
  const poolHistory = (state.staff.optionPoolLog ?? [])
    .slice(-6)
    .reverse()
    .map(
      (e) =>
        `<li>+${e.pctPoints}% (${(e.sharesAdded ?? 0).toLocaleString()} shares) · ${escapeHtml(formatCalendarStamp(e.year, e.month))}</li>`
    )
    .join('');

  container.innerHTML = `
    <p class="panel-lede">Refresh the employee option pool without a priced round — board consent assumed. Dilutes all holders proportionally.</p>
    <div class="summary-grid">
      <div><span class="stat-label">Option pool</span><span class="stat-value">${poolRow ? `${poolRow.pct}%` : '—'}</span></div>
      <div><span class="stat-label">Pool shares</span><span class="stat-value">${poolRow ? (poolRow.shares ?? 0).toLocaleString() : '—'}</span></div>
      <div><span class="stat-label">This month</span><span class="stat-value">${poolExpanded ? 'Expanded' : 'Available'}</span></div>
    </div>
    <div class="benefits-preset-row">${poolButtons}</div>
    <p class="fine-print">One expansion per month · seed creates the initial ~10% ESOP.</p>
    ${poolHistory ? `<ul class="fine-print">${poolHistory}</ul>` : '<p class="fine-print">No pool refreshes yet.</p>'}
  `;
}
