import { formatMoney } from './constants.js';
import { getArr } from './Workspace.js';
import { progressionTier } from './ProgressionEconomy.js';
import { calendarTurn } from './XC.js';
import { recordCashOutflow } from './Finance.js';

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
    lastServicedTurn: null,
    history: [],
    creditScore: null,
    refinancedAtSeed: false
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
  const loan = state.finance.loan;
  if (!loan.history) loan.history = [];
  return loan;
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

/** 300–850 style score for UI; not a real bureau model. */
export function computeCreditScore(state) {
  const loan = loanState(state);
  const limit = computeCreditLimit(state);
  loan.creditLimit = limit;
  const sentiment = state.sentiment?.score ?? 68;
  const arr = getArr(state);
  const lifetime = state.finance?.lifetimeRevenue ?? 0;
  const utilization = limit > 0 ? (loan.balance ?? 0) / limit : 0;
  let score =
    520 +
    (sentiment / 100) * 180 +
    Math.min(arr / 200_000, 1) * 90 +
    Math.min(lifetime / 400_000, 1) * 60;
  if (state.flags?.seedRoundClosed) score += 35;
  if (state.flags?.xcAccepted) score += 20;
  score -= utilization * 120;
  if ((loan.history ?? []).some((h) => h.type === 'declined')) score -= 8;
  score = Math.round(Math.max(480, Math.min(820, score)));
  loan.creditScore = score;
  return score;
}

export function creditScoreLabel(score) {
  if (score >= 740) return 'Excellent';
  if (score >= 680) return 'Good';
  if (score >= 620) return 'Fair';
  return 'Building';
}

export function bankApprovalBreakdown(state, amount) {
  const loan = loanState(state);
  const limit = computeCreditLimit(state);
  loan.creditLimit = limit;
  const sentiment = state.sentiment?.score ?? 68;
  const arr = getArr(state);
  const utilization = limit > 0 ? loan.balance / limit : 0;
  const score = computeCreditScore(state);
  const factors = [
    { label: 'Base underwriting', pts: 35 },
    { label: `Market trust (${sentiment}/100)`, pts: Math.round((sentiment / 100) * 35) },
    { label: `ARR traction (${formatMoney(arr)})`, pts: Math.round(Math.min(arr / 250_000, 0.2) * 100) },
    {
      label: `Lifetime revenue (${formatMoney(state.finance?.lifetimeRevenue ?? 0)})`,
      pts: Math.round(Math.min((state.finance?.lifetimeRevenue ?? 0) / 500_000, 0.1) * 100)
    },
    { label: `Credit score (${score})`, pts: Math.round((score - 480) / 340 * 12) },
    { label: `Line utilization (${Math.round(utilization * 100)}%)`, pts: -Math.round(utilization * 25) },
    { label: `Draw size vs limit`, pts: -Math.round((amount / Math.max(limit, 1)) * 15) }
  ];
  if (state.flags?.seedRoundClosed) factors.push({ label: 'Seed closed (institutional)', pts: 8 });
  const odds = bankApprovalOdds(state, amount);
  return { limit, score, odds, factors, headroom: Math.max(0, limit - loan.balance) };
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
  const score = computeCreditScore(state);
  let odds =
    0.35 +
    (sentiment / 100) * 0.35 +
    Math.min(arr / 250_000, 0.2) +
    Math.min((state.finance?.lifetimeRevenue ?? 0) / 500_000, 0.1) +
    ((score - 480) / 340) * 0.08 -
    utilization * 0.25 -
    (amount / limit) * 0.15;
  if (state.flags?.seedRoundClosed) odds += 0.08;
  return Math.max(0.08, Math.min(0.92, odds));
}

function pushHistory(loan, entry) {
  if (!loan.history) loan.history = [];
  loan.history.unshift(entry);
  if (loan.history.length > 12) loan.history.length = 12;
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
    pushHistory(loan, {
      type: 'declined',
      amount: draw,
      turn,
      odds: Math.round(odds * 100)
    });
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
  pushHistory(loan, {
    type: 'draw',
    amount: draw,
    turn,
    balanceAfter: loan.balance,
    payment: loan.monthlyPayment
  });
  return {
    ok: true,
    draw,
    limit,
    payment: loan.monthlyPayment,
    summary: `Draw approved: ${formatMoney(draw)} — ~${formatMoney(loan.monthlyPayment)}/mo debt service added to overhead.`
  };
}

export function prepayLoan(state, amount) {
  const pay = Math.round(Number(amount) || 0);
  const loan = loanState(state);
  if (!loan.balance || loan.balance <= 0) {
    return { ok: false, reason: 'No outstanding loan balance.' };
  }
  if (pay < 1_000) return { ok: false, reason: 'Minimum prepayment is $1,000.' };
  const cash = state.finance?.cash ?? 0;
  const applied = Math.min(pay, cash, loan.balance);
  if (applied <= 0) return { ok: false, reason: 'Not enough cash to prepay.' };
  state.finance.cash -= applied;
  recordCashOutflow(state, applied, 'loan_prepay');
  loan.balance -= applied;
  pushHistory(loan, {
    type: 'prepay',
    amount: applied,
    turn: calendarTurn(state),
    balanceAfter: loan.balance
  });
  if (loan.balance <= 0) {
    loan.balance = 0;
    loan.monthlyPayment = 0;
    return { ok: true, applied, summary: `Prepaid ${formatMoney(applied)} — loan paid off.` };
  }
  recomputeMonthlyPayment(loan);
  return {
    ok: true,
    applied,
    summary: `Prepaid ${formatMoney(applied)} — balance ${formatMoney(loan.balance)}, ~${formatMoney(loan.monthlyPayment)}/mo.`
  };
}

/** After seed: lower APR and refresh payment schedule once. */
export function refinanceLoanAfterSeed(state) {
  const loan = loanState(state);
  if (!state.flags?.seedRoundClosed) {
    return { ok: false, reason: 'Refinance unlocks after seed closes.' };
  }
  if (loan.refinancedAtSeed) {
    return { ok: false, reason: 'Already refinanced at seed.' };
  }
  if (!loan.balance || loan.balance <= 0) {
    return { ok: false, reason: 'No balance to refinance.' };
  }
  const oldApr = loan.apr ?? LOAN_APR;
  loan.apr = 0.11;
  loan.refinancedAtSeed = true;
  recomputeMonthlyPayment(loan);
  pushHistory(loan, {
    type: 'refinance',
    turn: calendarTurn(state),
    oldApr,
    newApr: loan.apr,
    payment: loan.monthlyPayment
  });
  return {
    ok: true,
    summary: `Refinanced at seed — APR ${Math.round(oldApr * 100)}% → 11%, debt service ~${formatMoney(loan.monthlyPayment)}/mo.`
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

export function renderLoanHistoryList(state) {
  const loan = loanState(state);
  const rows = (loan.history ?? []).slice(0, 6);
  if (!rows.length) return '';
  const items = rows
    .map((h) => {
      if (h.type === 'draw') {
        return `<li>Draw ${formatMoney(h.amount)} — balance ${formatMoney(h.balanceAfter)} · turn ${h.turn}</li>`;
      }
      if (h.type === 'declined') {
        return `<li class="muted">Declined ${formatMoney(h.amount)} (~${h.odds}% odds) · turn ${h.turn}</li>`;
      }
      if (h.type === 'prepay') {
        return `<li>Prepay ${formatMoney(h.amount)} — balance ${formatMoney(h.balanceAfter)}</li>`;
      }
      if (h.type === 'refinance') {
        return `<li>Refinance — APR → ${Math.round((h.newApr ?? 0.11) * 100)}%, ~${formatMoney(h.payment)}/mo</li>`;
      }
      return '';
    })
    .join('');
  return `<h3 class="log-head">Loan activity</h3><ul class="instrument-list loan-history">${items}</ul>`;
}
