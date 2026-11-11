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
import { executiveTeamSalaryMonthly } from './ExecutiveTeam.js';
import { adjustSentiment } from './Sentiment.js';
import { easeCompetitorPressure } from './Competitor.js';
import {
  expandEmployeeOptionPool,
  getOptionPoolRow,
  previewOptionPoolExpansion,
  totalOutstandingShares
} from './CapTable.js';
import { calendarTurn, formatCalendarStamp, twelveMonthCooldownStatus } from './GameCalendar.js';
import { accrueCeoTaxableIncome } from './CeoPersonalTax.js';
import {
  panelStatCard,
  escapeHtml as panelEscapeHtml,
  panelMetricGroup,
  panelMetricGrid,
  panelSnapshotSection
} from './PanelChrome.js';
import { meetsProgressionTierMin } from './ProgressionEconomy.js';

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

export const PERK_CATEGORIES = [
  { id: 'culture', label: 'Culture & recognition' },
  { id: 'wellness', label: 'Wellness & flexibility' },
  { id: 'growth', label: 'Learning & craft' },
  { id: 'community', label: 'Community & family' }
];

export const EXTRA_PERKS = [
  {
    id: 'celebration',
    category: 'culture',
    label: 'Company celebration',
    cost: 25_000,
    buzz: 2,
    sentiment: 2,
    blurb: 'Catered win party — morale patch for a brutal month.'
  },
  {
    id: 'recognition',
    category: 'culture',
    label: 'Spot awards',
    cost: 45_000,
    buzz: 2,
    sentiment: 3,
    blurb: 'Peer-nominated $500 cards — LinkedIn posts write themselves.'
  },
  {
    id: 'hackathon',
    category: 'culture',
    label: 'Internal hackathon',
    cost: 150_000,
    buzz: 3,
    sentiment: 3,
    product: 1,
    tierMin: 3,
    blurb: '48-hour build sprint — demos mandatory, sleep optional.'
  },
  {
    id: 'learning',
    category: 'growth',
    label: 'Learning stipend',
    cost: 50_000,
    buzz: 1,
    sentiment: 3,
    blurb: '$1k/person course budget — Udemy and one legit conference.'
  },
  {
    id: 'speaker',
    category: 'growth',
    label: 'Guest speaker series',
    cost: 80_000,
    buzz: 2,
    sentiment: 3,
    tierMin: 2,
    blurb: 'Three outside experts — engineers pretend it is not recruiting.'
  },
  {
    id: 'certification',
    category: 'growth',
    label: 'Certification push',
    cost: 120_000,
    buzz: 1,
    sentiment: 4,
    product: 1,
    tierMin: 3,
    blurb: 'Cloud and security certs — compliance deck gets easier.'
  },
  {
    id: 'wellness',
    category: 'wellness',
    label: 'Wellness stipend',
    cost: 75_000,
    buzz: 1,
    sentiment: 4,
    blurb: 'Gym, therapy, or meditation app — no questions asked.'
  },
  {
    id: 'remote-kit',
    category: 'wellness',
    label: 'Home office refresh',
    cost: 110_000,
    buzz: 1,
    sentiment: 4,
    blurb: 'Chair, monitor, and desk stipend — ergonomics audit optional.'
  },
  {
    id: 'mental-health',
    category: 'wellness',
    label: 'Mental health day',
    cost: 55_000,
    buzz: 1,
    sentiment: 5,
    blurb: 'Company-wide day off — Slack status: actually offline.'
  },
  {
    id: 'commuter',
    category: 'wellness',
    label: 'Commuter subsidy',
    cost: 65_000,
    buzz: 0,
    sentiment: 3,
    blurb: 'Transit and parking stipend — RTO debate cools one month.'
  },
  {
    id: 'cafeteria',
    category: 'culture',
    label: 'Premium cafeteria week',
    cost: 40_000,
    buzz: 2,
    sentiment: 2,
    blurb: 'Actual chefs on campus — lines at the espresso bar.'
  },
  {
    id: 'volunteer',
    category: 'community',
    label: 'Volunteer day',
    cost: 35_000,
    buzz: 2,
    sentiment: 4,
    blurb: 'Paid day for local nonprofits — photo ops included.'
  },
  {
    id: 'childcare',
    category: 'community',
    label: 'Childcare backup',
    cost: 95_000,
    buzz: 1,
    sentiment: 5,
    tierMin: 2,
    blurb: 'Emergency childcare credits — parents exhale.'
  },
  {
    id: 'family-stipend',
    category: 'community',
    label: 'Family support stipend',
    cost: 130_000,
    buzz: 1,
    sentiment: 6,
    tierMin: 4,
    blurb: 'Caregiver and parental slush fund — kept deliberately vague.'
  },
  {
    id: 'pet-friendly',
    category: 'community',
    label: 'Pet-friendly week',
    cost: 30_000,
    buzz: 3,
    sentiment: 2,
    blurb: 'Dogs in office — allergies become a leadership discussion.'
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
  if (state.staff.companyBonusAnnualMode == null) state.staff.companyBonusAnnualMode = false;
  if (state.staff.lastAnnualCompanyBonusAt === undefined) state.staff.lastAnnualCompanyBonusAt = null;
  if (!canPayAnnualCompanyBonus(state)) state.staff.companyBonusAnnualMode = false;
}

export function canPayAnnualCompanyBonus(state) {
  return twelveMonthCooldownStatus(state.staff?.lastAnnualCompanyBonusAt, state).eligible;
}

export function monthsUntilAnnualCompanyBonus(state) {
  return twelveMonthCooldownStatus(state.staff?.lastAnnualCompanyBonusAt, state).monthsUntil;
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
  const otherExec = executiveTeamSalaryMonthly(state);
  return {
    payroll,
    ceo,
    coo,
    otherExec,
    total: payroll + ceo + coo + otherExec,
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
  accrueCeoTaxableIncome(state, pay);
  return pay;
}

/** Salary mass used for bonus math — one month, or ×12 when paying an annual bonus. */
export function companyBonusSalaryBase(state, annualMode = false) {
  const mass = totalEmployeeSalaryMassMonthly(state);
  const mult = annualMode ? 12 : 1;
  return {
    ...mass,
    bonusBase: mass.total * mult,
    annualMode: Boolean(annualMode)
  };
}

export function estimateCompanyBonusPool(state, pct, annualMode = false) {
  const base = companyBonusSalaryBase(state, annualMode);
  return Math.round(base.bonusBase * (Number(pct) / 100));
}

export function setCompanyBonusAnnualMode(state, enabled) {
  ensurePeoplePrograms(state);
  if (enabled && !canPayAnnualCompanyBonus(state)) {
    state.staff.companyBonusAnnualMode = false;
    return;
  }
  state.staff.companyBonusAnnualMode = Boolean(enabled);
}

export function payCompanyWideBonus(state, pctRaw, opts = {}) {
  ensurePeoplePrograms(state);
  const pct = Number(pctRaw);
  if (!COMPANY_BONUS_PCTS.includes(pct)) {
    return { ok: false, reason: 'Choose 2%, 5%, 10%, or 20% bonus.' };
  }
  if (state.staff.benefitsThisMonth.companyBonusPct != null) {
    return { ok: false, reason: 'Already paid a company bonus this month.' };
  }
  const annualMode = opts.annual ?? state.staff.companyBonusAnnualMode ?? false;
  if (annualMode && !canPayAnnualCompanyBonus(state)) {
    const wait = monthsUntilAnnualCompanyBonus(state);
    return {
      ok: false,
      reason: `Annual company bonus available again in ${wait} month(s) (once every 12 months).`
    };
  }
  const mass = companyBonusSalaryBase(state, annualMode);
  if (mass.total < 1) {
    return { ok: false, reason: 'No salary mass to bonus — hire staff or set CEO pay first.' };
  }
  const pool = Math.round(mass.bonusBase * (pct / 100));
  const paid = payFromCompanyCash(state, pool, 'employee-bonus');
  if (!paid.ok) return paid;

  const ceoShare = mass.ceo > 0 ? Math.round(pool * (mass.ceo / mass.total)) : 0;
  if (ceoShare > 0) creditCeoBonusShare(state, ceoShare, pct);

  state.staff.benefitsThisMonth.companyBonusPct = pct;
  state.staff.benefitsThisMonth.companyBonusAnnual = annualMode;
  if (annualMode) {
    state.staff.lastAnnualCompanyBonusAt = {
      year: state.calendar?.year,
      monthIndex: state.calendar?.monthIndex
    };
    state.staff.companyBonusAnnualMode = false;
  }
  state.product.buzz = (state.product?.buzz ?? 0) + Math.min(6, Math.ceil(pct / 4));
  adjustSentiment(
    state,
    Math.min(8, Math.ceil(pct / 2)),
    annualMode ? `Company-wide ${pct}% annual bonus.` : `Company-wide ${pct}% bonus.`
  );

  return {
    ok: true,
    pct,
    annualMode,
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

function perkUnlocked(perk, state) {
  return meetsProgressionTierMin(state, perk.tierMin ?? 0);
}

export function runExtraEmployeePerk(state, perkId) {
  ensurePeoplePrograms(state);
  const perk = EXTRA_PERKS.find((p) => p.id === perkId);
  if (!perk) return { ok: false, reason: 'Unknown perk.' };
  if (!perkUnlocked(perk, state)) {
    return { ok: false, reason: 'Perk unlocks at a later funding stage.' };
  }
  const perks = state.staff.benefitsThisMonth.perks ?? [];
  if (perks.includes(perk.id)) {
    return { ok: false, reason: 'Already ran that perk this month.' };
  }
  const paid = payFromCompanyCash(state, perk.cost, 'employee-perk');
  if (!paid.ok) return paid;

  perks.push(perk.id);
  state.staff.benefitsThisMonth.perks = perks;
  state.product.buzz = (state.product?.buzz ?? 0) + (perk.buzz ?? 0);
  if (perk.product) {
    state.product.level = (state.product.level ?? 0) + perk.product;
  }
  adjustSentiment(state, perk.sentiment ?? 0, perk.label);
  if (perk.rivalEase) easeCompetitorPressure(state, perk.rivalEase);

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

function perkEffectLine(perk) {
  const parts = [];
  if (perk.buzz) parts.push(`buzz +${perk.buzz}`);
  if (perk.product) parts.push(`product +${perk.product}`);
  if (perk.sentiment) parts.push(`morale +${perk.sentiment}`);
  if (perk.rivalEase) parts.push(`rival heat −${perk.rivalEase}`);
  return parts.length ? parts.join(' · ') : 'Morale boost';
}

function renderPerkCard(p, state, perksDone) {
  const unlocked = perkUnlocked(p, state);
  const used = perksDone.has(p.id);
  const cash = state.finance?.cash ?? 0;
  const disabled = !unlocked || used || cash < p.cost ? ' disabled' : '';
  const title = !unlocked
    ? ' title="Unlocks at Series B or later — or IPO after Series A without a B raise"'
    : used
      ? ' title="Already ran this month"'
      : cash < p.cost
        ? ` title="Need ${formatMoney(p.cost)} cash"`
        : '';
  const status = used
    ? ' <span class="task-tag">Done</span>'
    : !unlocked
      ? ' <span class="task-tag">Locked</span>'
      : '';
  return `<div class="finance-action people-perk-card">
      <p><strong>${escapeHtml(p.label)}</strong>${status} — ${formatMoney(p.cost)}</p>
      <p class="fine-print">${escapeHtml(p.blurb)}</p>
      <p class="fine-print people-perk-effects">${escapeHtml(perkEffectLine(p))}</p>
      <button type="button" class="btn btn-primary btn-small" data-employee-perk="${escapeHtml(p.id)}"${disabled}${title}>Run perk</button>
    </div>`;
}

function renderPerkCategorySections(state, perksDone) {
  return PERK_CATEGORIES.map((cat) => {
    const items = EXTRA_PERKS.filter((p) => p.category === cat.id);
    if (!items.length) return '';
    const cards = items.map((p) => renderPerkCard(p, state, perksDone)).join('');
    const doneCount = items.filter((p) => perksDone.has(p.id)).length;
    return `<section class="finance-section people-perk-group">
      <div class="finance-section-head">
        <h3 class="finance-section-title">${escapeHtml(cat.label)}</h3>
        <span class="growth-channel-badge growth-channel-badge--inline">${doneCount}/${items.length} used</span>
      </div>
      <div class="people-perk-grid">${cards}</div>
    </section>`;
  }).join('');
}

export function renderEmployeeBenefitsPanel(container, state) {
  if (!container) return;
  ensurePeoplePrograms(state);
  const mass = totalEmployeeSalaryMassMonthly(state);
  const bonusDone = state.staff.benefitsThisMonth.companyBonusPct;
  const offsiteDone = state.staff.benefitsThisMonth.offsiteId;
  const perksDone = new Set(state.staff.benefitsThisMonth.perks ?? []);
  const perksUsedCount = perksDone.size;
  const sentiment = state.sentiment?.score ?? 68;
  const cash = state.finance?.cash ?? 0;

  const annualEligible = canPayAnnualCompanyBonus(state);
  const annualCooldown = monthsUntilAnnualCompanyBonus(state);
  const annualMode = annualEligible && Boolean(state.staff.companyBonusAnnualMode);
  const bonusBase = mass.total * (annualMode ? 12 : 1);
  const bonusButtons = COMPANY_BONUS_PCTS.map((pct) => {
    const est = Math.round(bonusBase * (pct / 100));
    const disabled =
      bonusDone != null || mass.total < 1 || cash < est ? ' disabled' : '';
    return `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-company-bonus="${pct}"${disabled}>${pct}% · ${formatMoney(est)}</button>`;
  }).join('');
  const bonusPaidLabel =
    bonusDone != null
      ? `${bonusDone}%${state.staff.benefitsThisMonth.companyBonusAnnual ? ' annual' : ''} paid`
      : '1× / month';

  const offsiteCards = OFFSITE_PROGRAMS.map((p) => {
    const disabled = offsiteDone || cash < p.cost ? ' disabled' : '';
    return `<div class="finance-action people-perk-card">
      <p><strong>${escapeHtml(p.label)}</strong> — ${formatMoney(p.cost)}</p>
      <p class="fine-print">${escapeHtml(p.blurb)}</p>
      <p class="fine-print people-perk-effects">Buzz +${p.buzz} · morale +${p.sentiment}${p.rivalEase ? ` · rival heat −${p.rivalEase}` : ''}</p>
      <button type="button" class="btn btn-primary btn-small" data-employee-offsite="${escapeHtml(p.id)}"${disabled}>Book offsite</button>
    </div>`;
  }).join('');

  const perkSections = renderPerkCategorySections(state, perksDone);

  container.innerHTML = `
    <section class="finance-section people-benefits-section">
      <p class="fine-print people-benefits-lede">Cash morale programs — not health insurance. Bonuses scale with payroll; perks and offsites stack buzz and board approval. Each perk is <strong>once per month</strong>; CEO bonus share lands on the CEO tab.</p>
      ${panelSnapshotSection(
        panelMetricGroup(
          'Programs snapshot',
          panelMetricGrid('4', [
            panelStatCard('Salary mass / mo', formatMoney(mass.total), { hero: true }),
            panelStatCard('Perks used', `${perksUsedCount}/${EXTRA_PERKS.length}`),
            panelStatCard('Board approval', `${sentiment}/100`),
            panelStatCard('Company cash', formatMoney(cash))
          ])
        ),
        { ariaLabel: 'Employee perks snapshot' }
      )}
      <div class="growth-channel-compare people-benefits-compare" role="note">
        <div class="growth-channel-card growth-channel-card--side">
          <p class="growth-channel-title"><span class="growth-channel-badge">Bonus</span></p>
          <p class="fine-print">${annualMode ? 'Percent of <strong>annual</strong> salary mass (monthly payroll × 12).' : 'Percent of one month&apos;s salary mass (payroll + exec comp).'} Strongest single morale swing.</p>
        </div>
        <div class="growth-channel-card growth-channel-card--paid">
          <p class="growth-channel-title"><span class="growth-channel-badge growth-channel-badge--paid">Programs</span></p>
          <p class="fine-print">Offsites and perk cards — mix culture, wellness, and learning; run several different perks each month.</p>
        </div>
      </div>
      <div class="finance-section-head">
        <h3 class="finance-section-title">Company bonus</h3>
        <span class="growth-channel-badge growth-channel-badge--inline">${bonusPaidLabel}</span>
      </div>
      <p class="fine-print">Payroll ${formatMoney(mass.payroll)}/mo · Leadership ${formatMoney(mass.ceo + mass.coo + (mass.otherExec ?? 0))}/mo · ${mass.headcount} employees · bonus base ${formatMoney(bonusBase)}${annualMode ? ' (annual)' : ''}.</p>
      <label class="people-bonus-annual-toggle fine-print">
        <input type="checkbox" id="company-bonus-annual" data-company-bonus-annual ${annualMode ? 'checked' : ''} ${bonusDone != null || !annualEligible ? 'disabled' : ''} />
        Annual bonus — apply % to monthly salary mass × 12 (once every 12 months; monthly % bonuses still available)
      </label>
      ${
        !annualEligible && annualCooldown > 0
          ? `<p class="fine-print people-bonus-cooldown">Annual bonus on cooldown — ${annualCooldown} month(s) until you can run another.</p>`
          : ''
      }
      <div class="benefits-preset-row">${bonusButtons}</div>
      <div class="finance-section-head">
        <h3 class="finance-section-title">Offsites</h3>
        <span class="growth-channel-badge growth-channel-badge--inline">${offsiteDone ? escapeHtml(OFFSITE_PROGRAMS.find((p) => p.id === offsiteDone)?.label ?? 'Booked') : '1× / month'}</span>
      </div>
      <div class="people-perk-grid people-offsite-grid">${offsiteCards}</div>
      <h3 class="finance-section-title">Monthly perk catalog</h3>
      <p class="fine-print">${EXTRA_PERKS.length} programs across culture, wellness, learning, and community — pick what fits the month.</p>
      ${perkSections}
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
  const seedClosed = Boolean(state.flags?.seedRoundClosed);
  const totalOut = totalOutstandingShares(state);
  const sentiment = state.sentiment?.score ?? 68;
  const poolButtons = OPTION_POOL_EXPAND_PCTS.map((pct) => {
    const disabled = poolExpanded || !seedClosed ? ' disabled' : '';
    const preview = seedClosed ? previewOptionPoolExpansion(state, pct) : null;
    const shareHint = preview
      ? ` · +${preview.sharesAdded.toLocaleString()} sh`
      : !seedClosed
        ? ' · close seed first'
        : '';
    const fdHint = preview ? ` → ${preview.poolPctAfter}% FD` : '';
    return `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-expand-option-pool="${pct}"${disabled} title="Adds ${pct}% of current pool shares; dilutes all holders">${pct}% pool${shareHint}${fdHint}</button>`;
  }).join('');
  const poolHistory = (state.staff.optionPoolLog ?? [])
    .slice(-6)
    .reverse()
    .map(
      (e) =>
        `<li>+${e.pctPoints}% pool (${(e.sharesAdded ?? 0).toLocaleString()} shares) · ${escapeHtml(formatCalendarStamp(e.year, e.month))}</li>`
    )
    .join('');

  const seedGate = !seedClosed
    ? `<div class="finance-alert finance-alert--tax" role="alert">Close <strong>seed</strong> on Finance to create the employee option pool.</div>`
    : '';

  container.innerHTML = `
    <section class="finance-section people-equity-section">
      <p class="fine-print people-benefits-lede">Board-approved ESOP top-ups without a priced round. Each choice adds that percent of <strong>current pool shares</strong> (not a full cap-table recap), so post-IPO numbers stay readable. <strong>One refresh per month</strong> — nicks board approval slightly.</p>
      ${panelSnapshotSection(
        panelMetricGroup(
          'Option pool snapshot',
          panelMetricGrid('4', [
            panelStatCard('Pool (FD)', poolRow ? `${poolRow.pct}%` : '—', { hero: true }),
            panelStatCard('Pool shares', poolRow ? (poolRow.shares ?? 0).toLocaleString() : '—'),
            panelStatCard('Outstanding', totalOut.toLocaleString()),
            panelStatCard('Board approval', `${sentiment}/100`)
          ])
        ),
        { ariaLabel: 'Option pool snapshot' }
      )}
      <div class="growth-channel-compare people-benefits-compare" role="note">
        <div class="growth-channel-card growth-channel-card--side">
          <p class="growth-channel-title"><span class="growth-channel-badge">Top-up</span></p>
          <p class="fine-print">Grow the pool by 2–15% of its current size — modest dilution, no investor negotiation.</p>
        </div>
        <div class="growth-channel-card growth-channel-card--paid">
          <p class="growth-channel-title"><span class="growth-channel-badge growth-channel-badge--paid">Priced round</span></p>
          <p class="fine-print">Seed and Series rounds on Finance set the big ESOP slices; use this tab for monthly refreshes between raises.</p>
        </div>
      </div>
      ${seedGate}
      <div class="finance-section-head">
        <h3 class="finance-section-title">Refresh option pool</h3>
        <span class="growth-channel-badge growth-channel-badge--inline">${poolExpanded ? 'Used this month' : '1× / month'}</span>
      </div>
      <div class="benefits-preset-row people-pool-expand-row">${poolButtons}</div>
      ${
        poolHistory
          ? `<details class="finance-details"><summary>Recent pool refreshes</summary><ul class="desk-log-list">${poolHistory}</ul></details>`
          : '<p class="fine-print">No pool refreshes yet.</p>'
      }
    </section>
  `;
}
