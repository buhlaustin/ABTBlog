import { formatMoney } from './constants.js';
import { isAprilTaxSeason } from './CorporateTax.js';

/** Desk task id — injected every April until CEO personal tax is paid. */
export const CEO_PERSONAL_TAX_FILING_TASK_ID = 'required-ceo-personal-tax-filing';

/** Simplified combined rate on W-2 + draws + bonus + secondary sales (game fiction). */
export const CEO_PERSONAL_TAX_RATE = 0.28;

export function createInitialCeoPersonalTax() {
  return {
    current: { year: null, income: 0 },
    prior: { year: null, income: 0 },
    taxPaidYear: null,
    careerTaxPaid: 0
  };
}

export function ensureCeoPersonalTax(state) {
  if (!state.ceo) return createInitialCeoPersonalTax();
  if (!state.ceo.personalTax) {
    state.ceo.personalTax = createInitialCeoPersonalTax();
  }
  const pt = state.ceo.personalTax;
  const y = state.calendar?.year ?? null;
  if (y != null && pt.current.year == null) pt.current.year = y;
  if (y != null && pt.current.year !== y) {
    pt.current = { year: y, income: 0 };
  }
  return pt;
}

export function accrueCeoTaxableIncome(state, amount) {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return;
  const pt = ensureCeoPersonalTax(state);
  pt.current.income += n;
}

/** Roll Jan–Dec CEO taxable income when December closes. */
export function closeCeoPersonalTaxYearOnDecember(state, closedYear, closedMonthIndex) {
  if (closedMonthIndex !== 12) return null;
  const pt = ensureCeoPersonalTax(state);
  pt.prior = {
    year: closedYear,
    income: pt.current.income ?? 0
  };
  pt.current = { year: closedYear + 1, income: 0 };
  return pt.prior;
}

export function ceoPersonalTaxPaidForYear(state, year = state.calendar?.year) {
  return state.ceo?.personalTax?.taxPaidYear === year;
}

export function ceoPersonalTaxBaseIncome(state) {
  const pt = ensureCeoPersonalTax(state);
  const startY = state.meta?.calendarStartYear ?? pt.current.year;
  const calY = state.calendar?.year ?? startY;
  if (pt.prior?.year != null && calY > startY) {
    return Math.max(0, pt.prior.income ?? 0);
  }
  return Math.max(0, pt.current.income ?? 0);
}

export function computeCeoPersonalTaxLiability(state) {
  const base = ceoPersonalTaxBaseIncome(state);
  if (base <= 0) return 0;
  return Math.max(250, Math.round(base * CEO_PERSONAL_TAX_RATE));
}

export function isCeoPersonalTaxFilingRequired(state) {
  if (!isAprilTaxSeason(state)) return false;
  if (ceoPersonalTaxPaidForYear(state)) return false;
  return computeCeoPersonalTaxLiability(state) > 0;
}

export function ceoPersonalTaxDisplay(state) {
  const pt = ensureCeoPersonalTax(state);
  const base = ceoPersonalTaxBaseIncome(state);
  const owed = computeCeoPersonalTaxLiability(state);
  return {
    currentYear: pt.current.year,
    currentIncome: pt.current.income ?? 0,
    priorYear: pt.prior?.year ?? null,
    priorIncome: pt.prior?.income ?? 0,
    baseIncome: base,
    liability: owed,
    taxPaid: ceoPersonalTaxPaidForYear(state),
    careerTaxPaid: pt.careerTaxPaid ?? 0,
    filingRequired: isCeoPersonalTaxFilingRequired(state)
  };
}

export function markCeoPersonalTaxPaid(state, amount) {
  const pt = ensureCeoPersonalTax(state);
  pt.taxPaidYear = state.calendar?.year ?? null;
  pt.careerTaxPaid = (pt.careerTaxPaid ?? 0) + Math.round(Number(amount) || 0);
}

export function completeCeoPersonalTaxFilingTask(state, payFromPersonalBank) {
  if (!isAprilTaxSeason(state)) {
    return { ok: false, reason: 'Personal tax filing is due each April.' };
  }
  if (ceoPersonalTaxPaidForYear(state)) {
    return { ok: false, reason: 'Personal taxes already paid for this calendar year.' };
  }
  const owed = computeCeoPersonalTaxLiability(state);
  if (owed <= 0) {
    return { ok: false, reason: 'No personal tax liability this April.' };
  }
  const paid = payFromPersonalBank(state, owed);
  if (!paid?.ok) {
    return paid ?? { ok: false, reason: 'Could not pay from personal bank.' };
  }
  markCeoPersonalTaxPaid(state, paid.amount);
  return {
    ok: true,
    owed: paid.amount,
    baseIncome: ceoPersonalTaxBaseIncome(state),
    summary: `Paid ${formatMoney(paid.amount)} personal income tax on ${formatMoney(ceoPersonalTaxBaseIncome(state))} taxable income (personal bank).`
  };
}
