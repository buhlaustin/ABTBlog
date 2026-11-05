import { STAGES, formatMoney } from './constants.js';
import { recordCashOutflow, founderValuationStake, founderEquityPct, projectMonthlyBurn } from './Finance.js';
import { founderStakeValue, isPublicCompany, canCashOut } from './IPO.js';
import { getFounderRow } from './CapTable.js';
import { calendarTurn } from './XC.js';

export function createInitialCeoState() {
  return {
    salaryAnnual: 0,
    careerSalaryPaid: 0,
    careerOwnerDraws: 0,
    drawLog: [],
    salaryPayLog: [],
    salaryChangeLog: []
  };
}

function ceoState(state) {
  if (!state.ceo) state.ceo = createInitialCeoState();
  if (!state.ceo.drawLog) state.ceo.drawLog = [];
  if (!state.ceo.salaryPayLog) state.ceo.salaryPayLog = [];
  if (!state.ceo.salaryChangeLog) state.ceo.salaryChangeLog = [];
  return state.ceo;
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
  if (state.flags?.seedRoundClosed && !state.flags?.seriesAClosed && annual > 280_000) {
    return 'Salary is high for pre–Series A — investors may ask you to reset comp.';
  }
  return null;
}

export function setCeoSalaryAnnual(state, annual) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const n = Math.max(0, Math.min(2_000_000, Math.round(Number(annual) || 0)));
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
  return [`CEO salary ${formatMoney(pay)} — career cash comp ${formatMoney(ceo.careerSalaryPaid)}.`];
}

export function maxOwnerDrawAmount(state) {
  return Math.max(0, Math.floor(state.finance?.cash ?? 0));
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
  pushCeoLog(ceo, 'drawLog', {
    amount: draw,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  return {
    ok: true,
    draw,
    summary: `Owner draw ${formatMoney(draw)} — personal total ${formatMoney(ceo.careerOwnerDraws)} (company cash ${formatMoney(state.finance.cash)}).`
  };
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

export function ceoPersonalCashComp(state) {
  const ceo = state.ceo ?? {};
  return (ceo.careerSalaryPaid ?? 0) + (ceo.careerOwnerDraws ?? 0);
}

export function ceoNetWorth(state) {
  return ceoPersonalCashComp(state) + (founderEquityValue(state) ?? 0);
}

export function wealthMix(state) {
  const salary = state.ceo?.careerSalaryPaid ?? 0;
  const draws = state.ceo?.careerOwnerDraws ?? 0;
  const equity = founderEquityValue(state) ?? 0;
  const total = salary + draws + equity;
  if (total <= 0) {
    return { salary, draws, equity, total: 0, salaryPct: 0, drawsPct: 0, equityPct: 100 };
  }
  return {
    salary,
    draws,
    equity,
    total,
    salaryPct: Math.round((salary / total) * 1000) / 10,
    drawsPct: Math.round((draws / total) * 1000) / 10,
    equityPct: Math.round((equity / total) * 1000) / 10
  };
}

export function ceoRunwayNote(state) {
  const burn = projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  const ceoMo = ceoSalaryMonthly(state);
  const runway = burn > 0 ? cash / burn : Infinity;
  const burnSansCeo = Math.max(0, burn - ceoMo);
  const runwaySansCeo = burnSansCeo > 0 ? cash / burnSansCeo : Infinity;
  return {
    burn,
    ceoMo,
    runwayLabel: burn > 0 ? `${runway.toFixed(1)} mo` : '∞',
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

export function buildCompLedger(state, limit = 8) {
  const ceo = state.ceo ?? {};
  const rows = [];
  for (const e of ceo.salaryPayLog ?? []) {
    rows.push({
      kind: 'salary',
      amount: e.amount,
      turn: e.turn,
      month: e.month,
      year: e.year,
      label: 'Salary paid'
    });
  }
  for (const e of ceo.drawLog ?? []) {
    rows.push({
      kind: 'draw',
      amount: e.amount,
      turn: e.turn,
      month: e.month,
      year: e.year,
      label: 'Owner draw'
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
  const liquid = ceoPersonalCashComp(state);
  return {
    payout,
    liquid,
    combined: payout + liquid,
    sharePrice: stats.markPx,
    gainSinceIpo: stats.gainSinceIpo
  };
}
