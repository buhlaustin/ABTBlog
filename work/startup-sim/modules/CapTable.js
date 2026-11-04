import { STAGES } from './constants.js';
import {
  canRaiseSeriesA,
  canRaiseSeriesB,
  isDownRoundLikely,
  seriesAGateSentiment,
  seriesBGateSentiment
} from './Sentiment.js';

const FOUNDER_AUTHORIZED = 10_000_000;

export function recalculateCapTablePercentages(capTable) {
  const total = capTable.reduce((s, r) => s + (r.shares ?? 0), 0);
  if (total <= 0) return capTable;
  for (const row of capTable) {
    row.pct = Math.round((row.shares / total) * 1000) / 10;
  }
  return capTable;
}

export function getFounderRow(state) {
  return state.capTable?.find((r) => r.id === 'founder');
}

/** Issue XC SAFE: +$500k cash, ~6% fully-diluted to XC holder. */
export function applyXCSafe(state) {
  if (state.flags?.xcAccepted) {
    return { ok: false, reason: 'Already accepted into X Combinator.' };
  }
  if (!state.flags?.xcUnlocked) {
    return { ok: false, reason: 'Reach $100k ARR to apply.' };
  }

  const founder = getFounderRow(state);
  const founderShares = founder?.shares ?? FOUNDER_AUTHORIZED;
  const xcShares = Math.round(founderShares * (0.06 / 0.94));

  state.finance.cash = (state.finance.cash ?? 0) + 500_000;
  if (!state.finance.instruments) state.finance.instruments = [];
  state.finance.instruments.push({
    type: 'safe',
    id: 'xc',
    label: 'X Combinator SAFE',
    amount: 500_000,
    cap: 8_000_000,
    discount: 0.2,
    estConversionPct: 6
  });

  const table = state.capTable.filter((r) => r.id !== 'xc');
  table.push({
    id: 'xc',
    name: 'X Combinator (SAFE)',
    shares: xcShares,
    class: 'investor'
  });
  state.capTable = recalculateCapTablePercentages(table);

  state.flags.xcAccepted = true;
  state.stage = STAGES.XC;
  state.finance.valuation = 8_000_000;
  return { ok: true, xcShares };
}

/**
 * Seed round: $3M on $15M post (~20% to seed investors) + 10% ESOP.
 * Requires XC acceptance.
 */
export function applySeedRound(state) {
  if (!state.flags?.xcAccepted) {
    return { ok: false, reason: 'Complete X Combinator acceptance first.' };
  }
  if (!state.flags?.xcResidencyComplete) {
    return { ok: false, reason: 'Finish the 3-month XC batch first.' };
  }
  if (!state.workspace?.smallOfficeOwned) {
    return { ok: false, reason: 'Lease a small office before closing seed.' };
  }
  if (state.flags?.seedRoundClosed) {
    return { ok: false, reason: 'Seed round already closed.' };
  }

  const preMoney = 12_000_000;
  const postMoney = 15_000_000;
  const raised = 3_000_000;

  let rows = state.capTable.map((r) => ({ ...r }));
  const totalBefore = rows.reduce((s, r) => s + r.shares, 0);
  const seedShares = Math.round(totalBefore * (raised / (postMoney - raised)));
  rows.push({
    id: 'seed',
    name: 'Seed investors',
    shares: seedShares,
    class: 'investor'
  });

  let total = rows.reduce((s, r) => s + r.shares, 0);
  const esopShares = Math.round(total * (0.1 / 0.9));
  rows.push({
    id: 'esop',
    name: 'Employee option pool',
    shares: esopShares,
    class: 'option'
  });

  state.capTable = recalculateCapTablePercentages(rows);
  state.finance.cash = (state.finance.cash ?? 0) + raised;
  state.finance.valuation = postMoney;
  state.finance.lastRound = {
    name: 'Seed',
    raised,
    preMoney,
    postMoney,
    closedMonth: state.calendar.monthIndex,
    closedYear: state.calendar.year
  };
  state.flags.seedRoundClosed = true;
  return { ok: true, raised, postMoney };
}

/** Cap table + instruments shape after seed — no cash or flag checks (sandbox bootstrap). */
export function applySeedCapTableSnapshot(state) {
  if (!state.capTable?.length) {
    state.capTable = [
      {
        id: 'founder',
        name: 'You (Founder)',
        shares: 10_000_000,
        pct: 100,
        class: 'founder'
      }
    ];
  }
  let rows = state.capTable.map((r) => ({ ...r }));
  const totalBefore = rows.reduce((s, r) => s + r.shares, 0);
  const raised = 3_000_000;
  const postMoney = 15_000_000;
  const seedShares = Math.round(totalBefore * (raised / (postMoney - raised)));
  if (!rows.some((r) => r.id === 'seed')) {
    rows.push({
      id: 'seed',
      name: 'Seed investors',
      shares: seedShares,
      class: 'investor'
    });
  }
  let total = rows.reduce((s, r) => s + r.shares, 0);
  if (!rows.some((r) => r.id === 'esop')) {
    const esopShares = Math.round(total * (0.1 / 0.9));
    rows.push({
      id: 'esop',
      name: 'Employee option pool',
      shares: esopShares,
      class: 'option'
    });
  }
  state.capTable = recalculateCapTablePercentages(rows);
}

function applyPricedRound(state, config) {
  const {
    roundKey,
    roundName,
    preMoney,
    raised,
    investorId,
    investorLabel,
    requireFlag,
    requireFlagValue = true,
    setFlag,
    minSentiment,
    sentimentBlockMessage
  } = config;

  if (requireFlag && state.flags?.[requireFlag] !== requireFlagValue) {
    return { ok: false, reason: `Complete ${roundName} prerequisites first.` };
  }
  if (state.flags?.[setFlag]) {
    return { ok: false, reason: `${roundName} already closed.` };
  }
  if (state.flags?.ipoFiled) {
    return { ok: false, reason: 'Already public — no new primary rounds.' };
  }
  const sentiment = state.sentiment?.score ?? 50;
  if (minSentiment != null && sentiment < minSentiment) {
    return {
      ok: false,
      reason: sentimentBlockMessage ?? `Board sentiment too low (${sentiment}/100) for ${roundName}.`
    };
  }

  let effectivePre = preMoney;
  let downRound = false;
  if (isDownRoundLikely(state)) {
    effectivePre = Math.round(preMoney * 0.85);
    downRound = true;
  }
  const postMoney = effectivePre + raised;
  const rows = state.capTable.map((r) => ({ ...r }));
  const totalBefore = rows.reduce((s, r) => s + r.shares, 0);
  const newShares = Math.round(totalBefore * (raised / (postMoney - raised)));
  rows.push({
    id: investorId,
    name: investorLabel,
    shares: newShares,
    class: 'investor'
  });

  state.capTable = recalculateCapTablePercentages(rows);
  state.finance.cash = (state.finance.cash ?? 0) + raised;
  state.finance.valuation = postMoney;
  state.finance.lastRound = {
    name: roundName,
    raised,
    preMoney: effectivePre,
    postMoney,
    downRound,
    closedMonth: state.calendar.monthIndex,
    closedYear: state.calendar.year
  };
  state.flags[setFlag] = true;
  if (downRound) state.flags.lastDownRound = true;
  return { ok: true, raised, postMoney, downRound, roundName };
}

export function applySeriesA(state) {
  if (!canRaiseSeriesA(state)) {
    return { ok: false, reason: 'Series A unlocks after seed and $2M lifetime revenue.' };
  }
  return applyPricedRound(state, {
    roundKey: 'seriesA',
    roundName: 'Series A',
    preMoney: 40_000_000,
    raised: 10_000_000,
    investorId: 'series-a',
    investorLabel: 'Series A investors',
    requireFlag: 'seedRoundClosed',
    setFlag: 'seriesAClosed',
    minSentiment: 30,
    sentimentBlockMessage: 'Board wants stronger momentum before Series A (sentiment below 30).'
  });
}

export function applySeriesB(state) {
  if (!canRaiseSeriesB(state)) {
    return { ok: false, reason: 'Series B unlocks after Series A and $12M lifetime revenue.' };
  }
  return applyPricedRound(state, {
    roundKey: 'seriesB',
    roundName: 'Series B',
    preMoney: 120_000_000,
    raised: 30_000_000,
    investorId: 'series-b',
    investorLabel: 'Series B investors',
    requireFlag: 'seriesAClosed',
    setFlag: 'seriesBClosed',
    minSentiment: 25,
    sentimentBlockMessage: 'Investors are skittish — improve board sentiment before Series B.'
  });
}

export function seriesAPreview(state) {
  if (!canRaiseSeriesA(state)) return null;
  const founder = getFounderRow(state);
  const down = isDownRoundLikely(state);
  const pre = down ? 34_000_000 : 40_000_000;
  const post = pre + 10_000_000;
  return {
    raised: 10_000_000,
    preMoney: pre,
    postMoney: post,
    founderPctNow: founder?.pct ?? 0,
    founderPctAfterApprox: Math.round((founder?.pct ?? 0) * 0.8 * 10) / 10,
    downRound: down,
    sentiment: seriesAGateSentiment(state),
    note: down
      ? 'Down-round likely (~15% valuation haircut) — runway is tight and sentiment is soft.'
      : '~20% to new Series A investors (pro-forma).'
  };
}

export function seriesBPreview(state) {
  if (!canRaiseSeriesB(state)) return null;
  const founder = getFounderRow(state);
  const down = isDownRoundLikely(state);
  const pre = down ? 102_000_000 : 120_000_000;
  const post = pre + 30_000_000;
  return {
    raised: 30_000_000,
    preMoney: pre,
    postMoney: post,
    founderPctNow: founder?.pct ?? 0,
    founderPctAfterApprox: Math.round((founder?.pct ?? 0) * 0.8 * 10) / 10,
    downRound: down,
    sentiment: seriesBGateSentiment(state),
    note: down
      ? 'Down-round terms on the table — board is nervous.'
      : '~20% to new Series B investors (pro-forma).'
  };
}

export function seedRoundPreview(state) {
  if (
    !state.flags?.xcAccepted ||
    !state.flags?.xcResidencyComplete ||
    !state.offices?.hubId ||
    state.flags?.seedRoundClosed
  ) {
    return null;
  }
  const founder = getFounderRow(state);
  const founderPct = founder?.pct ?? 100;
  return {
    raised: 3_000_000,
    preMoney: 12_000_000,
    postMoney: 15_000_000,
    founderPctNow: founderPct,
    founderPctAfterApprox: Math.round(founderPct * 0.72 * 10) / 10,
    note: '~20% to seed investors and 10% ESOP (pro-forma).'
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderCapTableRows(state) {
  return (state.capTable ?? [])
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.name)}</td><td class="num">${(r.shares ?? 0).toLocaleString()}</td><td class="num">${r.pct ?? 0}%</td><td>${escapeHtml(r.class ?? '—')}</td></tr>`
    )
    .join('');
}
