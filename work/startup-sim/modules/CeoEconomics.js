import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import { founderValuationStake, founderEquityPct } from './Finance.js';
import { founderStakeValue, isPublicCompany, canCashOut } from './IPO.js';
import { calendarTurn } from './XC.js';

export function createInitialCeoState() {
  return {
    salaryAnnual: 0,
    careerSalaryPaid: 0,
    careerOwnerDraws: 0,
    drawLog: []
  };
}

function ceoState(state) {
  if (!state.ceo) state.ceo = createInitialCeoState();
  if (!state.ceo.drawLog) state.ceo.drawLog = [];
  return state.ceo;
}

export function ceoDisplayName(state) {
  const first = state.company?.ceoFirstName?.trim() || 'Founder';
  const last = state.company?.ceoLastName?.trim() || '';
  return last ? `${first} ${last}` : first;
}

export function ceoSalaryMonthly(state) {
  return Math.round((ceoState(state).salaryAnnual ?? 0) / 12);
}

export function setCeoSalaryAnnual(state, annual) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const n = Math.max(0, Math.min(2_000_000, Math.round(Number(annual) || 0)));
  ceoState(state).salaryAnnual = n;
  return {
    ok: true,
    annual: n,
    monthly: Math.round(n / 12),
    summary:
      n === 0
        ? 'CEO salary set to $0 — classic bootstrapped founder mode.'
        : `CEO salary set to ${formatMoney(n)}/yr (~${formatMoney(Math.round(n / 12))}/mo from company cash at month close).`
  };
}

/** Call after month-end burn (salary is already included in overhead). */
export function recordCeoSalaryForMonth(state) {
  const pay = ceoSalaryMonthly(state);
  if (pay <= 0) return [];
  const ceo = ceoState(state);
  ceo.careerSalaryPaid = (ceo.careerSalaryPaid ?? 0) + pay;
  return [`CEO salary ${formatMoney(pay)} — career cash comp ${formatMoney(ceo.careerSalaryPaid)}.`];
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

export function takeOwnerDraw(state, amount) {
  const gate = canTakeOwnerDraw(state, amount);
  if (!gate.ok) return gate;
  const draw = Math.round(Number(amount) || 0);
  state.finance.cash -= draw;
  recordCashOutflow(state, draw, 'owner_draw');
  const ceo = ceoState(state);
  ceo.careerOwnerDraws = (ceo.careerOwnerDraws ?? 0) + draw;
  ceo.drawLog.unshift({ amount: draw, turn: calendarTurn(state) });
  ceo.drawLog = ceo.drawLog.slice(0, 8);
  return {
    ok: true,
    draw,
    summary: `Owner draw ${formatMoney(draw)} — personal total ${formatMoney(ceo.careerOwnerDraws)} (company cash ${formatMoney(state.finance.cash)}).`
  };
}

/** Paper value of founder shares (public mark or last private valuation). */
export function founderEquityValue(state) {
  if (isPublicCompany(state)) return founderStakeValue(state);
  const v = founderValuationStake(state);
  return v ?? 0;
}

export function ceoPersonalCashComp(state) {
  const ceo = state.ceo ?? {};
  return (ceo.careerSalaryPaid ?? 0) + (ceo.careerOwnerDraws ?? 0);
}

export function ceoNetWorth(state) {
  return ceoPersonalCashComp(state) + (founderEquityValue(state) ?? 0);
}

export function ceoEndgameCompSnapshot(state) {
  const salary = state.ceo?.careerSalaryPaid ?? 0;
  const draws = state.ceo?.careerOwnerDraws ?? 0;
  const equity = founderEquityValue(state) ?? 0;
  const stockPayout = state.ending?.type === 'cash_out' ? state.ending.payout ?? 0 : 0;
  return {
    salary,
    draws,
    equityPaper: equity,
    stockPayout,
    totalCareerCash: salary + draws + stockPayout,
    netWorthEstimate: salary + draws + (stockPayout || equity)
  };
}

export function renderCeoCompBreakdown(state) {
  const pct = founderEquityPct(state);
  const equity = founderEquityValue(state);
  const salary = state.ceo?.careerSalaryPaid ?? 0;
  const draws = state.ceo?.careerOwnerDraws ?? 0;
  const liquid = salary + draws;
  const net = liquid + equity;
  const publicCo = isPublicCompany(state);
  return { pct, equity, salary, draws, liquid, net, publicCo };
}
