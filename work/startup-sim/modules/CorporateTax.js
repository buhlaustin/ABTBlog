import { STAGES, formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';

/** Desk task id — injected every April until paid for that calendar year. */
export const TAX_FILING_TASK_ID = 'required-annual-tax-filing';

/** Desk task — Jan / Jul / Oct estimated payment (not April). */
export const QUARTERLY_TAX_ESTIMATE_TASK_ID = 'required-quarterly-estimated-tax';

/** Federal corporate rate (flat) on the game’s taxable revenue base. */
export const CORPORATE_TAX_RATE = 0.21;

/** Calendar months when estimated tax is due (FY Jan–Dec; April is annual only). */
export const QUARTERLY_ESTIMATED_TAX_MONTHS = [1, 7, 10];

export function createInitialFiscal() {
  return {
    current: { year: null, revenue: 0, expenses: 0, estimatedTaxPrepaid: 0 },
    prior: { year: null, revenue: 0, expenses: 0, profit: 0, estimatedTaxPrepaid: 0 },
    taxPaidYear: null,
    quarterlyEstimatesPaid: {},
    charityDonatedLifetime: 0
  };
}

export function ensureFiscal(state) {
  if (!state.finance) state.finance = {};
  if (!state.finance.fiscal) {
    state.finance.fiscal = createInitialFiscal();
    state.finance.fiscal.current.year = state.calendar?.year ?? null;
  }
  const f = state.finance.fiscal;
  if (!f.quarterlyEstimatesPaid) f.quarterlyEstimatesPaid = {};
  if (f.current.estimatedTaxPrepaid == null) f.current.estimatedTaxPrepaid = 0;
  if (f.prior && f.prior.estimatedTaxPrepaid == null) f.prior.estimatedTaxPrepaid = 0;

  const y = state.calendar?.year ?? null;
  if (y != null && f.current.year == null) {
    f.current.year = y;
  }
  if (y != null && f.current.year !== y) {
    f.current = { year: y, revenue: 0, expenses: 0, estimatedTaxPrepaid: 0 };
  }
  return f;
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
    profit: f.current.revenue - f.current.expenses,
    estimatedTaxPrepaid: f.current.estimatedTaxPrepaid ?? 0
  };
  f.current = { year: closedYear + 1, revenue: 0, expenses: 0, estimatedTaxPrepaid: 0 };
  return f.prior;
}

export function isAprilTaxSeason(state) {
  return (state.calendar?.monthIndex ?? 0) === 4;
}

export function isQuarterlyEstimatedTaxSeason(state) {
  const m = state.calendar?.monthIndex ?? 0;
  return QUARTERLY_ESTIMATED_TAX_MONTHS.includes(m);
}

export function quarterlyEstimatedTaxPeriodKey(state) {
  const y = state.calendar?.year ?? 0;
  const m = state.calendar?.monthIndex ?? 0;
  return `${y}-est-${m}`;
}

export function quarterlyEstimatedTaxPaidForPeriod(state) {
  const f = ensureFiscal(state);
  return Boolean(f.quarterlyEstimatesPaid?.[quarterlyEstimatedTaxPeriodKey(state)]);
}

export function corporateTaxUnlocked(state) {
  return Boolean(state.flags?.seedRoundClosed);
}

/**
 * Monthly revenue run-rate for estimated-tax projection (next 3 calendar months).
 */
export function estimatedMonthlyRevenueRunRate(state) {
  const mrr = Math.max(
    state.finance?.mrr ?? 0,
    state.finance?.monthlyRevenue ?? 0,
    Math.round((state.finance?.arr ?? 0) / 12),
    0
  );
  let monthly = mrr;
  if (state.flags?.ipoFiled && state.stage === STAGES.PUBLIC) {
    const whisper = state.publicMarket?.whisperRevenueTarget ?? 0;
    if (whisper > 0) monthly = Math.max(monthly, whisper);
  }
  const booked = state.calendar?.monthRevenue ?? 0;
  if (booked > 0) monthly = Math.round(monthly * 0.6 + booked * 0.4);
  return Math.max(0, monthly);
}

/** Taxable revenue base for the next 3 months — ties quarterly estimates to operating run-rate. */
export function estimatedRevenueNextThreeMonths(state) {
  return Math.round(estimatedMonthlyRevenueRunRate(state) * 3);
}

export function computeQuarterlyEstimatedTaxLiability(state) {
  if (!corporateTaxUnlocked(state)) return 0;
  const base = estimatedRevenueNextThreeMonths(state);
  if (base <= 0) return 0;
  return Math.round(base * CORPORATE_TAX_RATE);
}

export function isQuarterlyEstimatedTaxRequired(state) {
  if (!corporateTaxUnlocked(state)) return false;
  if (!isQuarterlyEstimatedTaxSeason(state)) return false;
  if (quarterlyEstimatedTaxPaidForPeriod(state)) return false;
  return computeQuarterlyEstimatedTaxLiability(state) > 0;
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

function taxPrepaidCreditForApril(state) {
  const f = ensureFiscal(state);
  const startY = state.meta?.calendarStartYear ?? f.current.year;
  const calY = state.calendar?.year ?? startY;
  if (f.prior?.year != null && calY > startY) {
    return Math.max(0, f.prior.estimatedTaxPrepaid ?? 0);
  }
  return Math.max(0, f.current.estimatedTaxPrepaid ?? 0);
}

export function computeTaxLiability(state) {
  const base = taxBaseRevenue(state);
  if (base <= 0) return 0;
  const gross = Math.max(500, Math.round(base * CORPORATE_TAX_RATE));
  const prepaid = taxPrepaidCreditForApril(state);
  return Math.max(0, gross - prepaid);
}

export function completeQuarterlyEstimatedTaxTask(state) {
  if (!corporateTaxUnlocked(state)) {
    return { ok: false, reason: 'Quarterly estimated taxes start after you close the seed round.' };
  }
  if (!isQuarterlyEstimatedTaxSeason(state)) {
    return { ok: false, reason: 'Quarterly estimated tax is due in January, July, and October only.' };
  }
  if (quarterlyEstimatedTaxPaidForPeriod(state)) {
    return { ok: false, reason: 'Quarterly estimate already paid for this month.' };
  }
  const owed = computeQuarterlyEstimatedTaxLiability(state);
  if (owed <= 0) {
    return { ok: false, reason: 'No estimated tax due — revenue run-rate is too low to model.' };
  }
  if ((state.finance?.cash ?? 0) < owed) {
    return {
      ok: false,
      reason: `Need ${formatMoney(owed)} company cash for quarterly estimated tax (have ${formatMoney(state.finance?.cash ?? 0)}).`
    };
  }
  state.finance.cash -= owed;
  recordCashOutflow(state, owed, 'tax_quarterly_estimate');
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + owed;
  const f = ensureFiscal(state);
  f.current.estimatedTaxPrepaid = (f.current.estimatedTaxPrepaid ?? 0) + owed;
  const key = quarterlyEstimatedTaxPeriodKey(state);
  f.quarterlyEstimatesPaid[key] = true;
  const base = estimatedRevenueNextThreeMonths(state);
  return {
    ok: true,
    owed,
    estimatedRevenue: base,
    summary: `Paid ${formatMoney(owed)} quarterly estimated tax (21% × ${formatMoney(base)} next-3-mo revenue est.). Credits toward April filing.`
  };
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
  if (owed <= 0) {
    const f = ensureFiscal(state);
    f.taxPaidYear = state.calendar.year;
    return {
      ok: true,
      owed: 0,
      baseRevenue: taxBaseRevenue(state),
      summary: `Filed corporate return — quarterly estimates already covered the ${formatMoney(taxBaseRevenue(state))} revenue base.`
    };
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
    summary: `Paid ${formatMoney(owed)} corporate tax on ${formatMoney(taxBaseRevenue(state))} fiscal revenue (after quarterly estimate credits).`
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
  const quarterlyLiability =
    isQuarterlyEstimatedTaxRequired(state) ? computeQuarterlyEstimatedTaxLiability(state) : 0;
  const quarterlyBase = isQuarterlyEstimatedTaxSeason(state) ? estimatedRevenueNextThreeMonths(state) : 0;
  return {
    currentYear: cur.year ?? state.calendar?.year,
    currentRevenue: cur.revenue ?? 0,
    currentExpenses: cur.expenses ?? 0,
    currentProfit: curProfit,
    currentEstimatedTaxPrepaid: cur.estimatedTaxPrepaid ?? 0,
    prior,
    showPrior: showPriorFiscalYear(state),
    taxLiability: liability,
    taxPaid: taxPaidForCalendarYear(state),
    quarterlyTaxLiability: quarterlyLiability,
    quarterlyRevenueEstimate: quarterlyBase,
    quarterlyTaxPaid: quarterlyEstimatedTaxPaidForPeriod(state),
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
