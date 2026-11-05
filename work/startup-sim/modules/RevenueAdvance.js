import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';

/** One-shot revenue-based advance — repaid as a slice of monthly desk revenue. */
export function createInitialRbfState() {
  return { active: false, principal: 0, owed: 0, sharePct: 0.12, feeMult: 1.28 };
}

function rbf(state) {
  if (!state.finance) state.finance = {};
  if (!state.finance.rbf) state.finance.rbf = createInitialRbfState();
  return state.finance.rbf;
}

export function rbfOutstanding(state) {
  const r = rbf(state);
  return r.active ? r.owed ?? 0 : 0;
}

export function canDrawRevenueAdvance(state) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const r = rbf(state);
  if (r.active && (r.owed ?? 0) > 0) {
    return { ok: false, reason: 'Repay the current revenue advance first.' };
  }
  const mrr = state.finance?.mrr ?? 0;
  if (mrr < 2_000) {
    return { ok: false, reason: 'Need at least $2k MRR for a revenue advance.' };
  }
  return { ok: true };
}

export function drawRevenueAdvance(state) {
  const gate = canDrawRevenueAdvance(state);
  if (!gate.ok) return gate;
  const mrr = state.finance?.mrr ?? 0;
  const principal = Math.round(Math.min(mrr * 4, 120_000, Math.max(10_000, mrr * 2.5)));
  const r = rbf(state);
  r.active = true;
  r.principal = principal;
  r.owed = Math.round(principal * (r.feeMult ?? 1.28));
  r.sharePct = mrr >= 15_000 ? 0.1 : 0.12;
  state.finance.cash = (state.finance.cash ?? 0) + principal;
  return {
    ok: true,
    principal,
    owed: r.owed,
    summary: `Revenue advance ${formatMoney(principal)} — repay ~${Math.round(r.sharePct * 100)}% of monthly revenue until ${formatMoney(r.owed)} cleared.`
  };
}

/** Call after month revenue is known, before month close burn. */
export function settleRevenueAdvanceAtMonthEnd(state) {
  const r = rbf(state);
  if (!r.active || (r.owed ?? 0) <= 0) return [];
  const rev = state.calendar?.monthRevenue ?? 0;
  if (rev <= 0) return [];
  const pay = Math.min(r.owed, Math.round(rev * (r.sharePct ?? 0.12)));
  if (pay <= 0) return [];
  state.finance.cash -= pay;
  recordCashOutflow(state, pay, 'rbf');
  r.owed -= pay;
  if (r.owed <= 0) {
    r.active = false;
    r.principal = 0;
    r.owed = 0;
    return [`Revenue advance repaid in full.`];
  }
  return [`Revenue advance repayment ${formatMoney(pay)} — ${formatMoney(r.owed)} remaining.`];
}
