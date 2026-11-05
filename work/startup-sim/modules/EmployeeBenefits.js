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
import { panelStatCard, escapeHtml as panelEscapeHtml } from './PanelChrome.js';

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
  return panelEscapeHtml(s);
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
    <section class="finance-section people-benefits-section">
      <div class="finance-kpi-row people-kpi-row">
        ${panelStatCard('Salary mass / mo', formatMoney(mass.total), { hero: true })}
        ${panelStatCard('Payroll', formatMoney(mass.payroll))}
        ${panelStatCard('CEO + COO', formatMoney(mass.ceo + mass.coo))}
        ${panelStatCard('Headcount', String(mass.headcount))}
      </div>
      <div class="finance-section-head">
        <h3 class="finance-section-title">Company bonus</h3>
        <span class="growth-channel-badge growth-channel-badge--inline">${bonusDone != null ? `${bonusDone}% paid` : '1× / month'}</span>
      </div>
      <p class="fine-print">Uses one month&apos;s salary mass — CEO share goes to the CEO tab bank.</p>
      <div class="benefits-preset-row">${bonusButtons}</div>
      <div class="finance-section-head">
        <h3 class="finance-section-title">Offsites</h3>
        <span class="growth-channel-badge growth-channel-badge--inline">${offsiteDone ? 'Booked' : '1× / month'}</span>
      </div>
      <div class="growth-play-list">${offsiteCards}</div>
      <h3 class="finance-section-title">Quick perks</h3>
      <div class="growth-play-list">${perkCards}</div>
    </section>
  `;
}

export function renderPeoplePanel(container, state) {
  if (!container) return;
  ensurePeoplePrograms(state);
  const section = state.staff.peopleSection;
  const tab = (id, label) =>
    `<button type="button" class="${section === id ? 'active' : ''}" data-people-tab="${id}">${label}</button>`;

  container.innerHTML = `
    <div class="people-panel finance-panel">
      <div class="finance-hero">
        <p class="panel-lede">Headcount, perks, and option pool — payroll finalizes when you close the month on the Desk.</p>
      </div>
      <nav class="people-subtabs" aria-label="People sections">
        ${tab('staffing', 'Staffing')}
        ${tab('benefits', 'Employee perks')}
        ${tab('equity', 'Option pool')}
      </nav>
      <div id="people-section-mount"></div>
    </div>
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
    <section class="finance-section people-equity-section">
      <div class="finance-kpi-row people-kpi-row">
        ${panelStatCard('Option pool', poolRow ? `${poolRow.pct}%` : '—', { hero: true })}
        ${panelStatCard('Pool shares', poolRow ? (poolRow.shares ?? 0).toLocaleString() : '—')}
        ${panelStatCard('This month', poolExpanded ? 'Expanded' : 'Available')}
      </div>
      <p class="fine-print">Refresh ESOP without a priced round — dilutes all holders proportionally. One expansion per month.</p>
      <div class="benefits-preset-row">${poolButtons}</div>
      ${
        poolHistory
          ? `<details class="finance-details"><summary>Recent pool refreshes</summary><ul class="desk-log-list">${poolHistory}</ul></details>`
          : '<p class="fine-print">No pool refreshes yet.</p>'
      }
    </section>
  `;
}
