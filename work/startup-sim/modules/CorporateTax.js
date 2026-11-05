import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';

/** Desk task id — injected every April until paid for that calendar year. */
export const TAX_FILING_TASK_ID = 'required-annual-tax-filing';

/** Simplified effective rate on taxable revenue base (game fiction). */
export const CORPORATE_TAX_RATE = 0.21;

export function createInitialFiscal() {
  return {
    current: { year: null, revenue: 0, expenses: 0 },
    prior: { year: null, revenue: 0, expenses: 0, profit: 0 },
    taxPaidYear: null,
    charityDonatedLifetime: 0
  };
}

export function ensureFiscal(state) {
  if (!state.finance) state.finance = {};
  if (!state.finance.fiscal) {
    state.finance.fiscal = createInitialFiscal();
    state.finance.fiscal.current.year = state.calendar?.year ?? null;
  }
  const y = state.calendar?.year ?? null;
  if (y != null && state.finance.fiscal.current.year == null) {
    state.finance.fiscal.current.year = y;
  }
  if (y != null && state.finance.fiscal.current.year !== y) {
    state.finance.fiscal.current = { year: y, revenue: 0, expenses: 0 };
  }
  return state.finance.fiscal;
}

export function accrueFiscalRevenue(state, amount) {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return;
  const f = ensureFiscal(state);
  f.current.revenue += n;
}

export function accrueFiscalExpense(state, amount) {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return;
  const f = ensureFiscal(state);
  f.current.expenses += n;
}

/** Call when December closes — roll Jan–Dec totals into prior year. */
export function closeFiscalYearOnDecember(state, closedYear, closedMonthIndex) {
  if (closedMonthIndex !== 12) return null;
  const f = ensureFiscal(state);
  f.prior = {
    year: closedYear,
    revenue: f.current.revenue,
    expenses: f.current.expenses,
    profit: f.current.revenue - f.current.expenses
  };
  f.current = { year: closedYear + 1, revenue: 0, expenses: 0 };
  return f.prior;
}

export function isAprilTaxSeason(state) {
  return (state.calendar?.monthIndex ?? 0) === 4;
}

export function taxPaidForCalendarYear(state, year = state.calendar?.year) {
  return state.finance?.fiscal?.taxPaidYear === year;
}

export function isTaxFilingRequired(state) {
  if (!isAprilTaxSeason(state)) return false;
  if (taxPaidForCalendarYear(state)) return false;
  return computeTaxLiability(state) > 0 || (ensureFiscal(state).current.revenue ?? 0) > 0;
}

/** Revenue base for April filing: prior full FY, or YTD current FY in year one. */
export function taxBaseRevenue(state) {
  const f = ensureFiscal(state);
  const startY = state.meta?.calendarStartYear ?? f.current.year;
  const calY = state.calendar?.year ?? startY;
  if (f.prior?.year != null && calY > startY) {
    return Math.max(0, f.prior.revenue ?? 0);
  }
  return Math.max(0, f.current.revenue ?? 0);
}

export function computeTaxLiability(state) {
  const base = taxBaseRevenue(state);
  if (base <= 0) return 0;
  const rate = CORPORATE_TAX_RATE;
  return Math.max(500, Math.round(base * rate));
}

export function completeTaxFilingTask(state) {
  if (!isAprilTaxSeason(state)) {
    return { ok: false, reason: 'Corporate tax filing is due each April.' };
  }
  if (taxPaidForCalendarYear(state)) {
    return { ok: false, reason: 'Taxes already paid for this calendar year.' };
  }
  const owed = computeTaxLiability(state);
  if ((state.finance?.cash ?? 0) < owed) {
    return { ok: false, reason: `Need ${formatMoney(owed)} cash to pay taxes (have ${formatMoney(state.finance?.cash ?? 0)}).` };
  }
  state.finance.cash -= owed;
  recordCashOutflow(state, owed, 'tax');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + owed;
  const f = ensureFiscal(state);
  f.taxPaidYear = state.calendar.year;
  return {
    ok: true,
    owed,
    baseRevenue: taxBaseRevenue(state),
    summary: `Paid ${formatMoney(owed)} corporate tax on ${formatMoney(taxBaseRevenue(state))} fiscal revenue.`
  };
}

export function showPriorFiscalYear(state) {
  const f = ensureFiscal(state);
  const startY = state.meta?.calendarStartYear ?? state.calendar?.year;
  return Boolean(f.prior?.year != null && (state.calendar?.year ?? startY) > startY);
}

export function fiscalYearDisplay(state) {
  const f = ensureFiscal(state);
  const cur = f.current;
  const curProfit = (cur.revenue ?? 0) - (cur.expenses ?? 0);
  const prior = f.prior;
  const liability = isAprilTaxSeason(state) && !taxPaidForCalendarYear(state) ? computeTaxLiability(state) : 0;
  return {
    currentYear: cur.year ?? state.calendar?.year,
    currentRevenue: cur.revenue ?? 0,
    currentExpenses: cur.expenses ?? 0,
    currentProfit: curProfit,
    prior,
    showPrior: showPriorFiscalYear(state),
    taxLiability: liability,
    taxPaid: taxPaidForCalendarYear(state),
    charityLifetime: f.charityDonatedLifetime ?? 0
  };
}

const CHARITY_MIN = 1_000;

export function donateToCharity(state, amountRaw) {
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < CHARITY_MIN) {
    return { ok: false, reason: `Minimum charitable donation ${formatMoney(CHARITY_MIN)}.` };
  }
  if ((state.finance?.cash ?? 0) < amount) {
    return { ok: false, reason: `Need ${formatMoney(amount)} company cash.` };
  }
  state.finance.cash -= amount;
  recordCashOutflow(state, amount, 'charity');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + amount;
  const f = ensureFiscal(state);
  f.charityDonatedLifetime = (f.charityDonatedLifetime ?? 0) + amount;
  return {
    ok: true,
    amount,
    summary: `Donated ${formatMoney(amount)} to charity (deductible expense; no revenue).`
  };
}
