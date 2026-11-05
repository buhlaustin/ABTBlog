import { formatMoney } from './constants.js';
import { getArr } from './Workspace.js';
import { progressionTier } from './ProgressionEconomy.js';
import { calendarTurn } from './XC.js';

export const LOAN_TERM_MONTHS = 18;
export const LOAN_APR = 0.14;

export function createInitialLoanState() {
  return {
    balance: 0,
    totalDrawn: 0,
    monthlyPayment: 0,
    apr: LOAN_APR,
    creditLimit: 0,
    drawsThisMonth: 0,
    lastDrawTurn: null,
    lastServicedTurn: null
  };
}

export function computeCreditLimit(state) {
  const arr = getArr(state);
  const lifetime = state.finance?.lifetimeRevenue ?? 0;
  const tier = progressionTier(state);
  let limit = 20_000 + Math.min(arr * 0.12, 400_000) + Math.min(lifetime * 0.05, 150_000);
  limit += tier * 8_000;
  if (state.flags?.xcAccepted) limit += 40_000;
  if (state.flags?.seedRoundClosed) limit *= 1.35;
  if (state.product?.level) limit += state.product.level * 2_500;
  return Math.round(Math.max(25_000, Math.min(limit, 750_000)));
}

function loanState(state) {
  if (!state.finance) state.finance = {};
  if (!state.finance.loan) state.finance.loan = createInitialLoanState();
  return state.finance.loan;
}

export function loanOutstanding(state) {
  return loanState(state).balance ?? 0;
}

export function loanPaymentMonthly(state) {
  const loan = loanState(state);
  if (!loan.balance || loan.balance <= 0) return 0;
  return loan.monthlyPayment ?? Math.round(loan.balance * 0.055);
}

/** Included in monthly overhead projection. */
export function loanOverheadMonthly(state) {
  return loanPaymentMonthly(state);
}

function recomputeMonthlyPayment(loan) {
  if (!loan.balance || loan.balance <= 0) {
    loan.monthlyPayment = 0;
    return;
  }
  const monthlyRate = (loan.apr ?? LOAN_APR) / 12;
  const n = LOAN_TERM_MONTHS;
  const p = loan.balance;
  const payment = (p * monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1);
  loan.monthlyPayment = Math.round(Math.max(payment, p * 0.04));
}

export function bankApprovalOdds(state, amount) {
  const loan = loanState(state);
  const limit = computeCreditLimit(state);
  loan.creditLimit = limit;
  const after = loan.balance + amount;
  if (after > limit) return 0;
  const sentiment = state.sentiment?.score ?? 68;
  const arr = getArr(state);
  const utilization = limit > 0 ? loan.balance / limit : 0;
  let odds =
    0.35 +
    (sentiment / 100) * 0.35 +
    Math.min(arr / 250_000, 0.2) +
    Math.min((state.finance?.lifetimeRevenue ?? 0) / 500_000, 0.1) -
    utilization * 0.25 -
    (amount / limit) * 0.15;
  if (state.flags?.seedRoundClosed) odds += 0.08;
  return Math.max(0.08, Math.min(0.92, odds));
}

export function requestLoanDraw(state, amount) {
  const draw = Math.round(Number(amount) || 0);
  if (draw < 5_000) return { ok: false, reason: 'Minimum draw is $5,000.' };
  const loan = loanState(state);
  const limit = computeCreditLimit(state);
  loan.creditLimit = limit;
  if (loan.balance + draw > limit) {
    return {
      ok: false,
      reason: `Credit limit ${formatMoney(limit)} — room for ${formatMoney(Math.max(0, limit - loan.balance))}.`
    };
  }
  const turn = calendarTurn(state);
  if (loan.lastDrawTurn === turn) {
    return { ok: false, reason: 'One loan draw per month.' };
  }
  const odds = bankApprovalOdds(state, draw);
  if (Math.random() > odds) {
    return {
      ok: false,
      reason: `Bank declined the ${formatMoney(draw)} draw (approval ~${Math.round(odds * 100)}% at your metrics).`
    };
  }
  loan.lastDrawTurn = turn;
  loan.balance += draw;
  loan.totalDrawn = (loan.totalDrawn ?? 0) + draw;
  state.finance.cash = (state.finance.cash ?? 0) + draw;
  recomputeMonthlyPayment(loan);
  return {
    ok: true,
    draw,
    limit,
    payment: loan.monthlyPayment,
    summary: `Draw approved: ${formatMoney(draw)} — ~${formatMoney(loan.monthlyPayment)}/mo debt service added to overhead.`
  };
}

/** After overhead cash is deducted, apply principal/interest split. */
export function serviceLoanAtMonthEnd(state) {
  const loan = loanState(state);
  if (!loan.balance || loan.balance <= 0) return [];
  const payment = Math.min(loanPaymentMonthly(state), loan.balance + Math.ceil(loan.balance * (loan.apr ?? LOAN_APR) / 12));
  const interest = Math.round(loan.balance * ((loan.apr ?? LOAN_APR) / 12));
  const principal = Math.max(0, payment - interest);
  loan.balance = Math.max(0, loan.balance - principal);
  loan.lastServicedTurn = calendarTurn(state);
  if (loan.balance <= 0) {
    loan.monthlyPayment = 0;
    return [`Loan paid off — debt service drops from overhead.`];
  }
  recomputeMonthlyPayment(loan);
  return [
    `Loan service ${formatMoney(payment)} (interest ${formatMoney(interest)}) — balance ${formatMoney(loan.balance)}.`
  ];
}
