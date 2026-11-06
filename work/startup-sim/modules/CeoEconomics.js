import { STAGES, formatMoney } from './constants.js';
import {
  recordCashOutflow,
  founderValuationStake,
  founderEquityPct,
  projectMonthlyBurn,
  companyRunwayDisplay
} from './Finance.js';
import { founderStakeValue, isPublicCompany, canCashOut } from './IPO.js';
import { getFounderRow } from './CapTable.js';
import { calendarTurn } from './XC.js';
import {
  applyHousingToPersonalExpenses,
  ceoHomeEquity,
  serviceCeoMortgageAtMonthEnd
} from './CeoLifestyle.js';
import { accrueCeoTaxableIncome, createInitialCeoPersonalTax } from './CeoPersonalTax.js';
import { ensureFiscal } from './CorporateTax.js';
import { formatCalendarStamp, twelveMonthCooldownStatus } from './GameCalendar.js';

export const CEO_ARR_BONUS_PCTS = [2, 5, 10, 20];

/** Personal burn while still working from the garage — dorm / parents, until first office lease. */
export const GARAGE_PHASE_PERSONAL_EXPENSE_MO = 350;

const GARAGE_PHASE_EXPENSE_BREAKDOWN = [
  { label: 'Food & household', amount: 165 },
  { label: 'Transport', amount: 85 },
  { label: 'Phone & subscriptions', amount: 55 },
  { label: 'Discretionary', amount: 45 }
];

export function isGaragePhasePersonalExpenses(state) {
  const w = state.workspace ?? {};
  return (
    !w.smallOfficeOwned &&
    !w.mediumOfficeOwned &&
    !w.largeOfficeOwned &&
    !w.campusOwned &&
    !w.hubOwned
  );
}

const EXPENSE_DEBIT_CATEGORIES = [
  'Housing',
  'Food & household',
  'Insurance & health',
  'Transport',
  'Family & childcare',
  'Discretionary'
];

const PERSONAL_BANK_MIN = 4_500;
const PERSONAL_BANK_MAX = 10_500;

export function createInitialCeoState() {
  return {
    salaryAnnual: 0,
    careerSalaryPaid: 0,
    careerOwnerDraws: 0,
    careerEmployeeBonuses: 0,
    careerCeoArrBonuses: 0,
    careerStockSales: 0,
    lastCeoArrBonusAt: null,
    bankBalance: null,
    personalExpenseScheduled: null,
    lastPersonalExpense: null,
    careerPersonalExpensesPaid: 0,
    drawLog: [],
    salaryPayLog: [],
    salaryChangeLog: [],
    bankLog: [],
    housing: {
      mode: 'rent',
      tierId: 'rent',
      purchasePrice: 0,
      mortgageBalance: 0,
      mortgagePaymentMonthly: 0,
      maintenanceMonthly: 0,
      purchasedTurn: null
    },
    lifestyleOwned: [],
    lifestyleDebitBump: 0,
    section: 'overview',
    personalGivingLifetime: 0,
    alumniGivingLifetime: 0,
    alumniDonationLog: [],
    netWorthHistory: [],
    investmentBalance: 0,
    careerInvestmentReturns: 0,
    lastInvestmentReturn: 0,
    personalTax: createInitialCeoPersonalTax()
  };
}

function ceoState(state) {
  if (!state.ceo) state.ceo = createInitialCeoState();
  if (!state.ceo.drawLog) state.ceo.drawLog = [];
  if (!state.ceo.salaryPayLog) state.ceo.salaryPayLog = [];
  if (!state.ceo.salaryChangeLog) state.ceo.salaryChangeLog = [];
  if (!state.ceo.bankLog) state.ceo.bankLog = [];
  if (!state.ceo.lifestyleOwned) state.ceo.lifestyleOwned = [];
  if (state.ceo.lifestyleDebitBump == null) state.ceo.lifestyleDebitBump = 0;
  return state.ceo;
}

function logStamp(state) {
  return {
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  };
}

/** Deterministic per-run personal starting cash (never a single hardcoded value). */
export function rollInitialPersonalBankBalance(state) {
  const seed = state.meta?.runSeed ?? 0;
  const nameSalt =
    ((state.company?.ceoFirstName ?? '').length + 1) * 7919 +
    ((state.company?.ceoLastName ?? '').length + 1) * 104729;
  let h = (seed ^ nameSalt) >>> 0;
  h = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (state.company?.categoryId?.length ?? 0), 0xc2b2ae35) >>> 0;
  const u = h / 0xffffffff;
  return Math.round(PERSONAL_BANK_MIN + u * (PERSONAL_BANK_MAX - PERSONAL_BANK_MIN));
}

export function ensureCeoPersonalBank(state) {
  const ceo = ceoState(state);
  if (ceo.bankBalance == null || !Number.isFinite(ceo.bankBalance)) {
    const opening = rollInitialPersonalBankBalance(state);
    ceo.bankBalance = opening;
    if (!state.meta) state.meta = {};
    state.meta.ceoOpeningBankBalance = opening;
    pushCeoLog(ceo, 'bankLog', {
      kind: 'opening',
      amount: opening,
      delta: opening,
      balanceAfter: opening,
      label: 'Opening personal balance',
      ...logStamp(state)
    });
  }
  return ceo.bankBalance;
}

export function initializeCeoPersonalFinances(state) {
  ensureCeoPersonalBank(state);
  preparePersonalExpensesForMonth(state);
}

/** April personal tax — debits personal bank only. */
export function payCeoPersonalTaxFromBank(state, amount) {
  const owed = Math.round(Number(amount) || 0);
  if (owed <= 0) return { ok: false, reason: 'Invalid tax amount.' };
  const ceo = ceoState(state);
  ensureCeoPersonalBank(state);
  const bal = ceo.bankBalance ?? 0;
  if (bal < owed) {
    return {
      ok: false,
      reason: `Need ${formatMoney(owed)} in personal bank to pay taxes (have ${formatMoney(bal)}).`
    };
  }
  const paid = debitPersonalBank(state, owed, 'Personal income tax (April)', 'personal_tax');
  if (paid < owed) {
    return { ok: false, reason: `Need ${formatMoney(owed)} in personal bank.` };
  }
  return { ok: true, amount: paid };
}

/** Monthly lifestyle spend band — driven only by CEO salary, not company ARR. */
export function personalExpenseBandForSalary(annualSalary) {
  const a = Math.max(0, Math.round(Number(annualSalary) || 0));
  if (a === 0) {
    return {
      min: 2_100,
      max: 3_500,
      label: '$0 salary — lean personal burn (savings / side income fictionally cover gaps)'
    };
  }
  const monthlyGross = a / 12;
  const min = Math.max(1_650, Math.round(monthlyGross * 0.36));
  const max = Math.max(min + 350, Math.round(monthlyGross * 0.68));
  let label = 'Household band tied to your CEO salary';
  if (a <= 80_000) label = 'Frugal professional household';
  else if (a <= 200_000) label = 'Mid-career executive household';
  else if (a <= 400_000) label = 'Senior executive household';
  else label = 'Top-comp public-CEO lifestyle band';
  return { min, max, label, annual: a };
}

export function personalExpenseBand(state) {
  if (isGaragePhasePersonalExpenses(state)) {
    return {
      min: GARAGE_PHASE_PERSONAL_EXPENSE_MO,
      max: GARAGE_PHASE_PERSONAL_EXPENSE_MO,
      label: 'At home / dorm — fixed lean burn until you lease an office'
    };
  }
  return personalExpenseBandForSalary(ceoState(state).salaryAnnual ?? 0);
}

function personalExpenseRollUnit(state, salt = 0) {
  const turn = calendarTurn(state);
  const annual = Math.round(ceoState(state).salaryAnnual ?? 0);
  const seed = state.meta?.runSeed ?? 0;
  let h =
    (seed ^ Math.imul(turn + salt * 19, 2_654_435_761) ^ Math.imul(annual, 1_597_334_677)) >>> 0;
  h = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return h / 0xffffffff;
}

function buildPersonalExpenseBreakdown(state, total) {
  const weights = EXPENSE_DEBIT_CATEGORIES.map((_, i) => 0.45 + personalExpenseRollUnit(state, 30 + i));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const parts = EXPENSE_DEBIT_CATEGORIES.map((label, i) => ({
    label,
    amount: Math.max(i === 0 ? 280 : 60, Math.round((weights[i] / weightSum) * total))
  }));
  let delta = total - parts.reduce((s, p) => s + p.amount, 0);
  parts[0].amount += delta;
  return parts;
}

/** Deterministic for this calendar month + salary — still varies month to month. */
export function rollPersonalExpenseTotal(state) {
  if (isGaragePhasePersonalExpenses(state)) {
    return GARAGE_PHASE_PERSONAL_EXPENSE_MO;
  }
  const band = personalExpenseBand(state);
  const u = personalExpenseRollUnit(state, 0);
  let total = Math.round(band.min + u * (band.max - band.min));
  const spikeRoll = personalExpenseRollUnit(state, 1);
  if (spikeRoll < 0.1) {
    total = Math.round(total * (1.05 + spikeRoll * 0.35));
    total = Math.min(total, Math.round(band.max * 1.15));
  }
  return Math.max(band.min, total);
}

/** Roll debits for the current in-game month (not player-controlled). */
export function preparePersonalExpensesForMonth(state) {
  const ceo = ceoState(state);
  const turn = calendarTurn(state);
  if (isGaragePhasePersonalExpenses(state)) {
    ceo.personalExpenseScheduled = {
      turn,
      total: GARAGE_PHASE_PERSONAL_EXPENSE_MO,
      breakdown: GARAGE_PHASE_EXPENSE_BREAKDOWN.map((p) => ({ ...p })),
      salaryAnnual: ceo.salaryAnnual ?? 0,
      month: state.calendar?.monthIndex,
      year: state.calendar?.year,
      garagePhase: true
    };
    return ceo.personalExpenseScheduled;
  }
  const totalRaw = rollPersonalExpenseTotal(state);
  const breakdownRaw = buildPersonalExpenseBreakdown(state, totalRaw);
  const { breakdown, total } = applyHousingToPersonalExpenses(state, breakdownRaw, totalRaw);
  ceo.personalExpenseScheduled = {
    turn,
    total,
    breakdown,
    salaryAnnual: ceo.salaryAnnual ?? 0,
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  };
  return ceo.personalExpenseScheduled;
}

export function scheduledPersonalExpense(state) {
  const ceo = ceoState(state);
  const turn = calendarTurn(state);
  if (ceo.personalExpenseScheduled?.turn === turn) {
    return ceo.personalExpenseScheduled;
  }
  return preparePersonalExpensesForMonth(state);
}

/** Midpoint of salary band — for runway estimates only. */
export function typicalPersonalExpenseMonthly(state) {
  const band = personalExpenseBand(state);
  return Math.round((band.min + band.max) / 2);
}

/** @deprecated use scheduledPersonalExpense(state).total */
export function effectivePersonalBurnMonthly(state) {
  return scheduledPersonalExpense(state).total;
}

/** @deprecated */
export function recommendedPersonalBurnMonthly(state) {
  return typicalPersonalExpenseMonthly(state);
}

function creditPersonalBank(state, amount, label, kind) {
  const pay = Math.round(Number(amount) || 0);
  if (pay <= 0) return 0;
  const ceo = ceoState(state);
  ensureCeoPersonalBank(state);
  ceo.bankBalance = (ceo.bankBalance ?? 0) + pay;
  pushCeoLog(ceo, 'bankLog', {
    kind,
    amount: pay,
    delta: pay,
    balanceAfter: ceo.bankBalance,
    label,
    ...logStamp(state)
  });
  return pay;
}

export function payFromPersonalBank(state, amount, label, kind) {
  const pay = Math.round(Number(amount) || 0);
  if (pay <= 0) return 0;
  const ceo = ceoState(state);
  ensureCeoPersonalBank(state);
  const applied = Math.min(pay, ceo.bankBalance ?? 0);
  ceo.bankBalance = Math.max(0, (ceo.bankBalance ?? 0) - applied);
  pushCeoLog(ceo, 'bankLog', {
    kind,
    amount: applied,
    delta: -applied,
    balanceAfter: ceo.bankBalance,
    label,
    ...logStamp(state)
  });
  return applied;
}

function debitPersonalBank(state, amount, label, kind) {
  return payFromPersonalBank(state, amount, label, kind);
}

export function ceoPersonalBankBalance(state) {
  return ensureCeoPersonalBank(state);
}

export function personalBankRunway(state) {
  const bal = ceoPersonalBankBalance(state);
  const burn = typicalPersonalExpenseMonthly(state);
  if (burn <= 0) return { burn, balance: bal, label: '∞' };
  return { burn, balance: bal, label: `${(bal / burn).toFixed(1)} mo` };
}

function pushCeoLog(ceo, key, entry, max = 10) {
  if (!ceo[key]) ceo[key] = [];
  ceo[key].unshift(entry);
  if (ceo[key].length > max) ceo[key].length = max;
}

export function ceoDisplayName(state) {
  const first = state.company?.ceoFirstName?.trim() || 'Founder';
  const last = state.company?.ceoLastName?.trim() || '';
  return last ? `${first} ${last}` : first;
}

export function ceoSalaryMonthly(state) {
  return Math.round((ceoState(state).salaryAnnual ?? 0) / 12);
}

export function suggestedCeoSalaryBand(state) {
  const arr = state.finance?.arr ?? 0;
  if (state.stage === STAGES.GARAGE && !state.flags?.seedRoundClosed) {
    return {
      label: 'Garage / bootstrap',
      typical: 0,
      presets: [
        { annual: 0, label: '$0' },
        { annual: 60_000, label: '$60k' },
        { annual: 120_000, label: '$120k' }
      ],
      note: 'Most solo founders stay at $0 until seed.'
    };
  }
  if (!state.flags?.seedRoundClosed) {
    return {
      label: 'Pre-seed',
      typical: 120_000,
      presets: [
        { annual: 0, label: '$0' },
        { annual: 120_000, label: '$120k' },
        { annual: 180_000, label: '$180k' }
      ],
      note: 'Angels expect frugal pay until priced seed.'
    };
  }
  if (isPublicCompany(state) || state.flags?.ipoFiled) {
    return {
      label: 'Public company',
      typical: 450_000,
      presets: [
        { annual: 350_000, label: '$350k' },
        { annual: 450_000, label: '$450k' },
        { annual: 750_000, label: '$750k' }
      ],
      note: 'Salary is in the proxy; most wealth is still equity.'
    };
  }
  if (!state.flags?.seriesAClosed) {
    return {
      label: 'Post-seed',
      typical: 180_000,
      presets: [
        { annual: 120_000, label: '$120k' },
        { annual: 180_000, label: '$180k' },
        { annual: 250_000, label: '$250k' }
      ],
      note: `Typical founder CEO comp ~${formatMoney(Math.min(200_000, Math.round(arr * 0.08)))}–${formatMoney(250_000)} at this stage.`
    };
  }
  if (!state.flags?.seriesBClosed) {
    return {
      label: 'Series A scale',
      typical: 250_000,
      presets: [
        { annual: 180_000, label: '$180k' },
        { annual: 250_000, label: '$250k' },
        { annual: 350_000, label: '$350k' }
      ],
      note: 'Board sets comp against peer CEOs — keep salary under ~12% of ARR.'
    };
  }
  if (!isPublicCompany(state)) {
    return {
      label: 'Late private',
      typical: 350_000,
      presets: [
        { annual: 250_000, label: '$250k' },
        { annual: 350_000, label: '$350k' },
        { annual: 500_000, label: '$500k' }
      ],
      note: 'Institutional boards benchmark against public comps.'
    };
  }
  return {
    label: 'Public company',
    typical: 450_000,
    presets: [
      { annual: 350_000, label: '$350k' },
      { annual: 450_000, label: '$450k' },
      { annual: 750_000, label: '$750k' }
    ],
    note: 'Salary is in the proxy; most wealth is still equity.'
  };
}

export function ceoSalaryBoardNote(state) {
  const annual = state.ceo?.salaryAnnual ?? 0;
  if (annual <= 0) return null;
  const arr = state.finance?.arr ?? 0;
  if (state.flags?.seriesAClosed && arr > 0 && annual > arr * 0.14) {
    return `CEO salary is ${Math.round((annual / arr) * 100)}% of ARR — expect board questions.`;
  }
  if (
    state.flags?.seedRoundClosed &&
    !state.flags?.seriesAClosed &&
    !state.flags?.ipoFiled &&
    !isPublicCompany(state) &&
    annual > 280_000
  ) {
    return 'Salary is high for pre–Series A — investors may ask you to reset comp.';
  }
  return null;
}

export function setCeoSalaryAnnual(state, annual) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const n = Math.max(0, Math.round(Number(annual) || 0));
  const ceo = ceoState(state);
  const prior = ceo.salaryAnnual ?? 0;
  if (prior !== n) {
    pushCeoLog(ceo, 'salaryChangeLog', {
      prior,
      annual: n,
      turn: calendarTurn(state),
      month: state.calendar?.monthIndex,
      year: state.calendar?.year
    });
  }
  ceo.salaryAnnual = n;
  preparePersonalExpensesForMonth(state);
  const boardNote = ceoSalaryBoardNote(state);
  return {
    ok: true,
    annual: n,
    monthly: Math.round(n / 12),
    boardNote,
    summary:
      n === 0
        ? 'CEO salary set to $0 — classic bootstrapped founder mode.'
        : `CEO salary set to ${formatMoney(n)}/yr (~${formatMoney(Math.round(n / 12))}/mo from company cash at month close).${boardNote ? ` ${boardNote}` : ''}`
  };
}

/** Call after month-end burn (salary is already included in overhead). */
export function recordCeoSalaryForMonth(state) {
  const pay = ceoSalaryMonthly(state);
  if (pay <= 0) return [];
  const ceo = ceoState(state);
  ceo.careerSalaryPaid = (ceo.careerSalaryPaid ?? 0) + pay;
  pushCeoLog(ceo, 'salaryPayLog', {
    amount: pay,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  creditPersonalBank(state, pay, 'CEO salary deposit', 'salary');
  accrueCeoTaxableIncome(state, pay);
  return [
    `CEO salary ${formatMoney(pay)} deposited — personal bank ${formatMoney(ceo.bankBalance)} (career ${formatMoney(ceo.careerSalaryPaid)}).`
  ];
}

/** Personal living expenses — after salary hits the bank this month. */
export function settlePersonalExpensesAtMonthEnd(state) {
  const sched = scheduledPersonalExpense(state);
  const burn = sched.total;
  if (burn <= 0) return [];
  const ceo = ceoState(state);
  ensureCeoPersonalBank(state);
  const paid = debitPersonalBank(state, burn, 'Personal debits (auto)', 'expenses');
  ceo.careerPersonalExpensesPaid = (ceo.careerPersonalExpensesPaid ?? 0) + paid;
  ceo.lastPersonalExpense = {
    total: paid,
    breakdown: sched.breakdown,
    scheduled: burn,
    ...logStamp(state)
  };
  pushCeoLog(ceo, 'bankLog', {
    kind: 'expense_detail',
    amount: paid,
    delta: -paid,
    balanceAfter: ceo.bankBalance,
    label: 'Debit breakdown',
    breakdown: sched.breakdown,
    ...logStamp(state)
  });
  ceo.personalExpenseScheduled = null;
  const lines = [
    `Personal debits ${formatMoney(paid)} (auto, salary-based) — bank ${formatMoney(ceo.bankBalance)}.`
  ];
  lines.push(...serviceCeoMortgageAtMonthEnd(state));
  const top = sched.breakdown?.[0];
  if (top) {
    lines.push(`Largest line: ${top.label} ${formatMoney(top.amount)}.`);
  }
  const typical = typicalPersonalExpenseMonthly(state);
  if ((ceo.bankBalance ?? 0) <= 0 && paid > 0) {
    lines.push('Personal bank at $0 — raise salary or take an owner draw before next month.');
  } else if ((ceo.bankBalance ?? 0) < typical * 0.5) {
    lines.push('Personal cash is tight versus your typical salary band.');
  }
  return lines;
}

export function maxOwnerDrawAmount(state) {
  return Math.max(0, Math.floor(state.finance?.cash ?? 0));
}

export function ownerDrawAmountForFraction(state, fraction) {
  const max = maxOwnerDrawAmount(state);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  if (f <= 0 || max < 500) return 0;
  return Math.max(500, Math.floor(max * f));
}

export function takeOwnerDrawFraction(state, fraction) {
  const draw = ownerDrawAmountForFraction(state, fraction);
  if (draw < 500) {
    return { ok: false, reason: 'Not enough company cash for a draw (min $500).' };
  }
  return takeOwnerDraw(state, draw);
}

export function donateFromPersonalBank(state, amountRaw) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < 500) return { ok: false, reason: 'Minimum personal gift is $500.' };
  const ceo = ceoState(state);
  ensureCeoPersonalBank(state);
  const bal = ceo.bankBalance ?? 0;
  if (bal < amount) {
    return { ok: false, reason: `Personal bank is ${formatMoney(bal)} — cannot give ${formatMoney(amount)}.` };
  }
  const paid = debitPersonalBank(state, amount, 'Personal philanthropy', 'personal_giving');
  ceo.personalGivingLifetime = (ceo.personalGivingLifetime ?? 0) + paid;
  return {
    ok: true,
    amount: paid,
    lifetime: ceo.personalGivingLifetime,
    summary: `Gave ${formatMoney(paid)} from your personal bank (lifetime giving ${formatMoney(ceo.personalGivingLifetime)}).`
  };
}

export function recordCeoNetWorthSnapshot(state) {
  const ceo = ceoState(state);
  if (!ceo.netWorthHistory) ceo.netWorthHistory = [];
  const net = ceoNetWorth(state);
  const stamp = logStamp(state);
  const last = ceo.netWorthHistory[0];
  if (last?.turn === stamp.turn) {
    last.netWorth = net;
    return;
  }
  ceo.netWorthHistory.unshift({ netWorth: net, ...stamp });
  if (ceo.netWorthHistory.length > 18) ceo.netWorthHistory.length = 18;
}

export function canTakeOwnerDraw(state, amount) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const draw = Math.round(Number(amount) || 0);
  if (draw < 500) return { ok: false, reason: 'Minimum owner draw is $500.' };
  const cash = state.finance?.cash ?? 0;
  if (draw > cash) {
    return { ok: false, reason: `Company cash is ${formatMoney(cash)} — cannot draw more.` };
  }
  return { ok: true };
}

/** Closed prior fiscal year revenue (ARR base for CEO bonus). Zero before first FY closes. */
export function priorYearArrRevenue(state) {
  const f = ensureFiscal(state);
  const startY = state.meta?.calendarStartYear ?? f.current.year;
  const calY = state.calendar?.year ?? startY;
  if (f.prior?.year != null && calY > startY) {
    return Math.max(0, f.prior.revenue ?? 0);
  }
  return 0;
}

export function estimateCeoArrBonus(state, pctRaw) {
  const pct = Number(pctRaw);
  const base = priorYearArrRevenue(state);
  if (base < 1 || !CEO_ARR_BONUS_PCTS.includes(pct)) return 0;
  return Math.round(base * (pct / 100));
}

export function canPayCeoArrBonus(state) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const base = priorYearArrRevenue(state);
  if (base < 1) {
    return { ok: false, reason: 'Need a closed prior fiscal year with revenue (Dec year-end).' };
  }
  const cd = twelveMonthCooldownStatus(state.ceo?.lastCeoArrBonusAt, state);
  if (!cd.eligible) {
    return {
      ok: false,
      reason: `CEO ARR bonus available again in ${cd.monthsUntil} month(s) (once every 12 months).`
    };
  }
  return { ok: true, priorYearArr: base };
}

export function payCeoArrBonus(state, pctRaw) {
  const pct = Number(pctRaw);
  if (!CEO_ARR_BONUS_PCTS.includes(pct)) {
    return { ok: false, reason: 'Choose 2%, 5%, 10%, or 20% of prior-year ARR.' };
  }
  const gate = canPayCeoArrBonus(state);
  if (!gate.ok) return gate;
  const pay = estimateCeoArrBonus(state, pct);
  if (pay < 500) {
    return { ok: false, reason: 'Bonus would be under $500 — pick a higher % or grow prior-year revenue.' };
  }
  const cash = state.finance?.cash ?? 0;
  if (cash < pay) {
    return { ok: false, reason: `Need ${formatMoney(pay)} company cash (have ${formatMoney(cash)}).` };
  }
  state.finance.cash -= pay;
  recordCashOutflow(state, pay, 'ceo_arr_bonus');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + pay;
  const ceo = ceoState(state);
  ceo.careerCeoArrBonuses = (ceo.careerCeoArrBonuses ?? 0) + pay;
  ceo.lastCeoArrBonusAt = {
    year: state.calendar?.year,
    monthIndex: state.calendar?.monthIndex
  };
  creditPersonalBank(
    state,
    pay,
    `CEO ARR bonus (${pct}% of prior-year revenue)`,
    'ceo_arr_bonus'
  );
  accrueCeoTaxableIncome(state, pay);
  return {
    ok: true,
    pct,
    amount: pay,
    priorYearArr: gate.priorYearArr,
    summary: `CEO ARR bonus ${formatMoney(pay)} (${pct}% of prior-year revenue ${formatMoney(gate.priorYearArr)}) — personal bank ${formatMoney(ceo.bankBalance)}.`
  };
}

export function ceoArrBonusUiState(state) {
  const base = priorYearArrRevenue(state);
  const cd = twelveMonthCooldownStatus(state.ceo?.lastCeoArrBonusAt, state);
  const last = state.ceo?.lastCeoArrBonusAt;
  return {
    priorYearArr: base,
    cooldown: cd,
    lastPaidLabel:
      last?.year != null ? formatCalendarStamp(last.year, last.monthIndex) : null
  };
}

export function takeOwnerDraw(state, amount) {
  const gate = canTakeOwnerDraw(state, amount);
  if (!gate.ok) return gate;
  const draw = Math.round(Number(amount) || 0);
  state.finance.cash -= draw;
  recordCashOutflow(state, draw, 'owner_draw');
  const ceo = ceoState(state);
  ceo.careerOwnerDraws = (ceo.careerOwnerDraws ?? 0) + draw;
  pushCeoLog(ceo, 'drawLog', {
    amount: draw,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  creditPersonalBank(state, draw, 'Owner draw deposit', 'draw');
  accrueCeoTaxableIncome(state, draw);
  return {
    ok: true,
    draw,
    summary: `Owner draw ${formatMoney(draw)} — personal bank ${formatMoney(ceo.bankBalance)} (company cash ${formatMoney(state.finance.cash)}).`
  };
}

export function depositStockCashOutToPersonalBank(state, payout) {
  const pay = creditPersonalBank(state, payout, 'Founder stake cash-out', 'cash_out');
  accrueCeoTaxableIncome(state, pay);
  return pay;
}

function totalCapShares(state) {
  const total = (state.capTable ?? []).reduce((s, r) => s + (r.shares ?? 0), 0);
  return total > 0 ? total : 10_000_000;
}

export function founderShareStats(state) {
  const founder = getFounderRow(state);
  const shares = founder?.shares ?? 0;
  const pct = founder?.pct ?? founderEquityPct(state);
  const publicCo = isPublicCompany(state);
  const pm = state.publicMarket ?? {};
  const val = state.finance?.valuation ?? 0;
  const totalShares = totalCapShares(state);
  const impliedPrivatePx = val > 0 && totalShares > 0 ? val / totalShares : 0;
  const markPx = publicCo ? pm.sharePrice ?? 0 : impliedPrivatePx;
  const stakeValue = publicCo ? founderStakeValue(state) : founderValuationStake(state) ?? Math.round(shares * markPx);
  const ipoPx = pm.ipoPrice ?? markPx;
  const gainSinceIpo =
    publicCo && ipoPx > 0 ? Math.round((markPx - ipoPx) * shares) : null;
  const divPerSh = pm.dividendPerShareLast ?? 0;
  const lastDividend = divPerSh > 0 ? Math.round(divPerSh * shares) : 0;
  const analystTarget = pm.analystTarget ?? null;
  const upsideAtPt =
    analystTarget != null && publicCo ? Math.round((analystTarget - markPx) * shares) : null;
  return {
    shares,
    pct,
    markPx,
    stakeValue: stakeValue ?? 0,
    ipoPx,
    gainSinceIpo,
    lastDividend,
    analystTarget,
    upsideAtPt,
    publicCo,
    ticker: pm.ticker ?? null
  };
}

/** Paper value of founder shares (public mark or last private valuation). */
export function founderEquityValue(state) {
  return founderShareStats(state).stakeValue;
}

export function creditCeoStockSale(state, amount, label) {
  const pay = Math.round(Number(amount) || 0);
  if (pay <= 0) return 0;
  const ceo = ceoState(state);
  ceo.bankBalance = (ceo.bankBalance ?? 0) + pay;
  ceo.careerStockSales = (ceo.careerStockSales ?? 0) + pay;
  pushCeoLog(ceo, 'bankLog', {
    kind: 'stock_sale',
    amount: pay,
    delta: pay,
    balanceAfter: ceo.bankBalance,
    label,
    ...logStamp(state)
  });
  accrueCeoTaxableIncome(state, pay);
  return pay;
}

export function ceoPersonalCashComp(state) {
  const ceo = state.ceo ?? {};
  return (
    (ceo.careerSalaryPaid ?? 0) +
    (ceo.careerOwnerDraws ?? 0) +
    (ceo.careerEmployeeBonuses ?? 0) +
    (ceo.careerCeoArrBonuses ?? 0) +
    (ceo.careerStockSales ?? 0)
  );
}

export function personalInvestmentBalance(state) {
  return Math.max(0, Math.round(ceoState(state).investmentBalance ?? 0));
}

export function personalInvestmentReturnRate(state) {
  if (isPublicCompany(state)) {
    const move = (state.publicMarket?.lastMonthDeltaPct ?? 0) / 100;
    return Math.max(-0.025, Math.min(0.03, 0.0035 + move * 0.4));
  }
  return 0.0015;
}

export function assertCeoNetWorthGate(state, minNetWorth) {
  const min = Math.round(Number(minNetWorth) || 0);
  if (min <= 0) return { ok: true };
  const nw = ceoNetWorth(state);
  if (nw >= min) return { ok: true, netWorth: nw };
  return {
    ok: false,
    netWorth: nw,
    reason: `Need about ${formatMoney(min)} net worth (yours ≈ ${formatMoney(nw)}).`
  };
}

export function depositPersonalInvestment(state, amountRaw) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < 1_000) return { ok: false, reason: 'Minimum transfer to portfolio is $1,000.' };
  const ceo = ceoState(state);
  ensureCeoPersonalBank(state);
  if ((ceo.bankBalance ?? 0) < amount) {
    return { ok: false, reason: `Need ${formatMoney(amount)} in personal bank.` };
  }
  ceo.bankBalance -= amount;
  ceo.investmentBalance = personalInvestmentBalance(state) + amount;
  pushCeoLog(ceo, 'bankLog', {
    kind: 'invest_deposit',
    amount,
    delta: -amount,
    balanceAfter: ceo.bankBalance,
    label: 'Moved to personal portfolio',
    ...logStamp(state)
  });
  return {
    ok: true,
    amount,
    summary: `Transferred ${formatMoney(amount)} to personal portfolio (bank ${formatMoney(ceo.bankBalance)}, portfolio ${formatMoney(ceo.investmentBalance)}).`
  };
}

export function withdrawPersonalInvestment(state, amountRaw) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < 500) return { ok: false, reason: 'Minimum withdrawal is $500.' };
  const ceo = ceoState(state);
  const bal = personalInvestmentBalance(state);
  if (bal < amount) {
    return { ok: false, reason: `Portfolio holds ${formatMoney(bal)}.` };
  }
  ceo.investmentBalance = bal - amount;
  creditPersonalBank(state, amount, 'Portfolio withdrawal', 'invest_withdraw');
  return {
    ok: true,
    amount,
    summary: `Withdrew ${formatMoney(amount)} from portfolio to personal bank.`
  };
}

/** Index-style personal portfolio — returns accrue inside the account. */
export function settlePersonalInvestmentsAtMonthEnd(state) {
  const ceo = ceoState(state);
  const bal = personalInvestmentBalance(state);
  if (bal <= 0) return [];
  const rate = personalInvestmentReturnRate(state);
  const gain = Math.round(bal * rate);
  if (gain === 0) return [];
  ceo.investmentBalance = bal + gain;
  ceo.careerInvestmentReturns = (ceo.careerInvestmentReturns ?? 0) + gain;
  ceo.lastInvestmentReturn = gain;
  const pctLabel = `${(rate * 100).toFixed(2)}%`;
  if (gain > 0) {
    accrueCeoTaxableIncome(state, gain);
    return [`Personal portfolio +${formatMoney(gain)} (${pctLabel} this month; total ${formatMoney(ceo.investmentBalance)}).`];
  }
  return [`Personal portfolio ${formatMoney(gain)} (${pctLabel}; total ${formatMoney(ceo.investmentBalance)}).`];
}

export function ceoFinancialHealth(state) {
  const runway = personalBankRunway(state);
  const burn = runway.burn;
  const bal = runway.balance;
  const months =
    runway.label === '∞' ? 99 : Math.max(0, parseFloat(runway.label) || 0);
  const lifestyleBump = state.ceo?.lifestyleDebitBump ?? 0;
  if (bal <= 0 && burn > 0) {
    return {
      tone: 'neg',
      label: 'Overdrawn risk',
      detail: 'Personal bank is empty — salary or a draw before month close.'
    };
  }
  if (months < 1.5) {
    return {
      tone: 'neg',
      label: 'Cash tight',
      detail: `~${runway.label} runway at ${formatMoney(burn)}/mo typical spend.`
    };
  }
  if (months < 4) {
    return {
      tone: 'neutral',
      label: 'Watch liquidity',
      detail: `${runway.label} personal runway${lifestyleBump ? ` (+${formatMoney(lifestyleBump)}/mo lifestyle)` : ''}.`
    };
  }
  return {
    tone: 'pos',
    label: 'Liquid',
    detail: `${runway.label} personal runway · bank ${formatMoney(bal)}.`
  };
}

export function ceoNetWorth(state) {
  return (
    ceoPersonalBankBalance(state) +
    personalInvestmentBalance(state) +
    (founderEquityValue(state) ?? 0) +
    ceoHomeEquity(state)
  );
}

export function wealthMix(state) {
  const cash = ceoPersonalBankBalance(state);
  const invest = personalInvestmentBalance(state);
  const equity = founderEquityValue(state) ?? 0;
  const home = ceoHomeEquity(state);
  const total = cash + invest + equity + home;
  if (total <= 0) {
    return {
      cash,
      invest,
      equity,
      home,
      total: 0,
      cashPct: 0,
      investPct: 0,
      equityPct: 100,
      homePct: 0
    };
  }
  return {
    cash,
    invest,
    equity,
    home,
    total,
    cashPct: Math.round((cash / total) * 1000) / 10,
    investPct: Math.round((invest / total) * 1000) / 10,
    equityPct: Math.round((equity / total) * 1000) / 10,
    homePct: Math.round((home / total) * 1000) / 10
  };
}

export function ceoRunwayNote(state) {
  const runwayInfo = companyRunwayDisplay(state);
  const burn = runwayInfo.burn;
  const ceoMo = ceoSalaryMonthly(state);
  const cash = runwayInfo.cash;
  const runway = burn > 0 ? cash / burn : Infinity;
  const burnSansCeo = Math.max(0, burn - ceoMo);
  const runwaySansCeo = burnSansCeo > 0 ? cash / burnSansCeo : Infinity;
  return {
    burn,
    ceoMo,
    runwayLabel: runwayInfo.monthsLabel,
    runwayDetail: runwayInfo.detail,
    runwaySansCeoLabel: burnSansCeo > 0 ? `${runwaySansCeo.toFixed(1)} mo` : '∞',
    deltaMo:
      ceoMo > 0 && burnSansCeo > 0 && Number.isFinite(runway) && Number.isFinite(runwaySansCeo)
        ? (runwaySansCeo - runway).toFixed(1)
        : null
  };
}

export function ceoEndgameCompSnapshot(state) {
  const salary = state.ceo?.careerSalaryPaid ?? 0;
  const draws = state.ceo?.careerOwnerDraws ?? 0;
  const equity = founderEquityValue(state) ?? 0;
  const stockPayout = state.ending?.type === 'cash_out' ? state.ending.payout ?? 0 : 0;
  const bank = ceoPersonalBankBalance(state);
  return {
    salary,
    draws,
    equityPaper: equity,
    stockPayout,
    bankBalance: bank,
    totalCareerCash: salary + draws + stockPayout,
    netWorthEstimate: bank + (stockPayout || equity)
  };
}

export function renderCeoCompBreakdown(state) {
  const pct = founderEquityPct(state);
  const equity = founderEquityValue(state);
  const salary = state.ceo?.careerSalaryPaid ?? 0;
  const draws = state.ceo?.careerOwnerDraws ?? 0;
  const bonuses =
    (state.ceo?.careerEmployeeBonuses ?? 0) + (state.ceo?.careerCeoArrBonuses ?? 0);
  const stockSales = state.ceo?.careerStockSales ?? 0;
  const bank = ceoPersonalBankBalance(state);
  const net = bank + equity;
  const publicCo = isPublicCompany(state);
  return { pct, equity, salary, draws, bonuses, stockSales, bank, net, publicCo };
}

export function buildCompLedger(state, limit = 12) {
  const ceo = state.ceo ?? {};
  const rows = [];
  for (const e of ceo.bankLog ?? []) {
    rows.push({
      kind: e.kind ?? 'bank',
      amount: e.delta ?? e.amount,
      turn: e.turn,
      month: e.month,
      year: e.year,
      label: e.label ?? 'Bank',
      balanceAfter: e.balanceAfter
    });
  }
  rows.sort((a, b) => (b.turn ?? 0) - (a.turn ?? 0));
  return rows.slice(0, limit);
}

export function cashOutPreview(state) {
  if (!canCashOut(state) && !isPublicCompany(state)) return null;
  const stats = founderShareStats(state);
  if (!stats.publicCo) return null;
  const payout = founderStakeValue(state);
  const bank = ceoPersonalBankBalance(state);
  return {
    payout,
    liquid: bank,
    combined: payout + bank,
    sharePrice: stats.markPx,
    gainSinceIpo: stats.gainSinceIpo
  };
}
