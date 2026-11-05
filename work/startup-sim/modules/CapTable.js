import { STAGES } from './constants.js';
import { getArr } from './Workspace.js';

export const PUBLIC_FLOAT_ROW_ID = 'public-float';

/** IPO listing price target — keeps sticker sane vs ARR and valuation. */
export function targetIpoSharePrice(state, valuation) {
  const arr = Math.max(getArr(state), (state.finance?.mrr ?? 0) * 12, 1);
  const ps = valuation / arr;
  const fromArr = 16 + Math.log10(Math.max(arr, 1e6)) * 10.5;
  const fromVal = Math.sqrt(valuation / 40_000_000) * 4.2;
  let price = Math.round(((fromArr + fromVal) / 2) * 100) / 100;
  if (ps > 35) price *= 0.72;
  return Math.max(8, Math.min(420, price));
}

/** Issue tradable float so outstanding shares match market cap / price. */
export function ensurePublicFloatOnCapTable(state, valuation, sharePrice) {
  if (!state.capTable?.length) return 0;
  const rows = state.capTable.filter((r) => r.id !== PUBLIC_FLOAT_ROW_ID).map((r) => ({ ...r }));
  const insider = rows.reduce((s, r) => s + (r.shares ?? 0), 0);
  const price = Math.max(Number(sharePrice) || 0, 0.01);
  let total = Math.max(insider + 1, Math.round(valuation / price));
  let floatShares = total - insider;
  if (floatShares < Math.round(insider * 0.45)) {
    total = insider + Math.round(insider * 2.8);
    floatShares = total - insider;
  }
  rows.push({
    id: PUBLIC_FLOAT_ROW_ID,
    name: 'Public shareholders (float)',
    shares: floatShares,
    class: 'public'
  });
  state.capTable = recalculateCapTablePercentages(rows);
  return total;
}

export function migratePublicFloatCapTable(state) {
  if (!state.flags?.ipoFiled) return;
  if (state.capTable?.some((r) => r.id === PUBLIC_FLOAT_ROW_ID)) return;
  const price = state.publicMarket?.sharePrice ?? state.publicMarket?.ipoPrice ?? 0;
  const valuation = state.finance?.valuation ?? 0;
  if (price > 0 && valuation > 0) {
    ensurePublicFloatOnCapTable(state, valuation, price);
  }
}

export function issueFollowOnShares(state, dilutionPct = 0.025) {
  const rows = state.capTable.map((r) => ({ ...r }));
  const total = rows.reduce((s, r) => s + (r.shares ?? 0), 0);
  const newShares = Math.max(1, Math.round(total * (dilutionPct / (1 - dilutionPct))));
  let row = rows.find((r) => r.id === PUBLIC_FLOAT_ROW_ID);
  if (!row) {
    row = {
      id: PUBLIC_FLOAT_ROW_ID,
      name: 'Public shareholders (float)',
      shares: 0,
      class: 'public'
    };
    rows.push(row);
  }
  row.shares += newShares;
  state.capTable = recalculateCapTablePercentages(rows);
  return newShares;
}

export function retirePublicFloatShares(state, shareCount) {
  const n = Math.max(0, Math.floor(Number(shareCount) || 0));
  if (!n) return 0;
  const rows = state.capTable.map((r) => ({ ...r }));
  const row = rows.find((r) => r.id === PUBLIC_FLOAT_ROW_ID);
  if (!row?.shares) return 0;
  const retired = Math.min(row.shares, n);
  row.shares -= retired;
  state.capTable = recalculateCapTablePercentages(rows);
  return retired;
}
import { isFundraisingBlockedByScenario } from './ScenarioEffects.js';
import { convertOutstandingSafesAtSeed } from './FinanceCapital.js';
import {
  canRaiseSeriesA,
  canRaiseSeriesB,
  isDownRoundLikely,
  seatInstitutionalBoard,
  seriesAGateSentiment,
  seriesBGateSentiment
} from './Sentiment.js';
import { getSeedRoundTerms, seedRoundTermsNote } from './XC.js';

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

/** Issue new exec shares for ~pct fully-diluted ownership (before the grant). */
export function grantExecutiveEquity(state, { id, name, pct, holderClass = 'exec' }) {
  const targetPct = Math.max(0.1, Math.min(15, Number(pct) || 0));
  if (!state.capTable?.length) {
    state.capTable = [
      {
        id: 'founder',
        name: 'You (Founder)',
        shares: FOUNDER_AUTHORIZED,
        pct: 100,
        class: 'founder'
      }
    ];
  }
  const holderId = String(id || `exec-${Date.now()}`);
  let rows = state.capTable.filter((r) => r.id !== holderId).map((r) => ({ ...r }));
  const totalBefore = rows.reduce((s, r) => s + (r.shares ?? 0), 0);
  const grantShares = Math.round(totalBefore * (targetPct / (100 - targetPct)));
  rows.push({
    id: holderId,
    name: String(name || 'Executive'),
    shares: grantShares,
    class: holderClass
  });
  state.capTable = recalculateCapTablePercentages(rows);
  return { grantShares, pct: targetPct };
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

  const { raised, preMoney, postMoney } = getSeedRoundTerms(state);

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
  applyFundraiseMomentum(state, 'Seed');
  const safeLines = convertOutstandingSafesAtSeed(state, postMoney);
  return { ok: true, raised, postMoney, safeLines };
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
  if (isFundraisingBlockedByScenario(state)) {
    return {
      ok: false,
      reason: 'Fundraising frozen — resolve fallout from a recent decision or crisis first.'
    };
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
  applyFundraiseMomentum(state, roundName);
  let boardSeated = false;
  if (setFlag === 'seriesAClosed') {
    seatInstitutionalBoard(state);
    boardSeated = true;
  }
  return { ok: true, raised, postMoney, downRound, roundName, boardSeated };
}

function applyFundraiseMomentum(state, roundName) {
  const bumps = {
    Seed: { product: 2, buzz: 2 },
    'Series A': { product: 3, buzz: 4 },
    'Series B': { product: 3, buzz: 5 },
    'Series C': { product: 2, buzz: 4 },
    'Series D': { product: 2, buzz: 3 },
    'Series E': { product: 1, buzz: 3 },
    'Series F': { product: 1, buzz: 2 }
  };
  const b = bumps[roundName] ?? { product: 1, buzz: 1 };
  state.product.level = (state.product.level ?? 0) + b.product;
  state.product.buzz = (state.product.buzz ?? 0) + b.buzz;
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
    minSentiment: 32,
    sentimentBlockMessage: 'Market trust is too low — clean up press and decisions before Series A.'
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

export function canRaiseSeriesC(state) {
  return Boolean(state.flags?.seriesBClosed && (state.finance?.lifetimeRevenue ?? 0) >= 30_000_000);
}

export function applySeriesC(state) {
  if (!canRaiseSeriesC(state)) {
    return { ok: false, reason: 'Series C unlocks after Series B and $30M lifetime revenue.' };
  }
  return applyPricedRound(state, {
    roundKey: 'seriesC',
    roundName: 'Series C',
    preMoney: 200_000_000,
    raised: 50_000_000,
    investorId: 'series-c',
    investorLabel: 'Series C investors',
    requireFlag: 'seriesBClosed',
    setFlag: 'seriesCClosed',
    minSentiment: 22
  });
}

export function applySeriesD(state) {
  if (!state.flags?.seriesCClosed) {
    return { ok: false, reason: 'Close Series C first.' };
  }
  if ((state.finance?.lifetimeRevenue ?? 0) < 80_000_000) {
    return { ok: false, reason: 'Series D unlocks after $80M lifetime revenue.' };
  }
  return applyPricedRound(state, {
    roundKey: 'seriesD',
    roundName: 'Series D',
    preMoney: 500_000_000,
    raised: 100_000_000,
    investorId: 'series-d',
    investorLabel: 'Series D investors',
    requireFlag: 'seriesCClosed',
    setFlag: 'seriesDClosed',
    minSentiment: 20
  });
}

export function applySeriesE(state) {
  if (!state.flags?.seriesDClosed) {
    return { ok: false, reason: 'Close Series D first.' };
  }
  if ((state.finance?.lifetimeRevenue ?? 0) < 200_000_000) {
    return { ok: false, reason: 'Series E unlocks after $200M lifetime revenue.' };
  }
  return applyPricedRound(state, {
    roundKey: 'seriesE',
    roundName: 'Series E',
    preMoney: 1_000_000_000,
    raised: 150_000_000,
    investorId: 'series-e',
    investorLabel: 'Series E investors',
    requireFlag: 'seriesDClosed',
    setFlag: 'seriesEClosed',
    minSentiment: 18
  });
}

export function applySeriesF(state) {
  if (!state.flags?.seriesEClosed) {
    return { ok: false, reason: 'Close Series E first.' };
  }
  if ((state.finance?.lifetimeRevenue ?? 0) < 400_000_000) {
    return { ok: false, reason: 'Series F unlocks after $400M lifetime revenue.' };
  }
  return applyPricedRound(state, {
    roundKey: 'seriesF',
    roundName: 'Series F',
    preMoney: 2_000_000_000,
    raised: 200_000_000,
    investorId: 'series-f',
    investorLabel: 'Series F investors',
    requireFlag: 'seriesEClosed',
    setFlag: 'seriesFClosed',
    minSentiment: 15
  });
}

function pricedRoundPreview(state, config) {
  if (config.requireFlag && !state.flags?.[config.requireFlag]) return null;
  if (state.flags?.[config.setFlag]) return null;
  if (config.minLifetime && (state.finance?.lifetimeRevenue ?? 0) < config.minLifetime) return null;
  const founder = getFounderRow(state);
  const down = isDownRoundLikely(state);
  const pre = down ? Math.round(config.preMoney * 0.85) : config.preMoney;
  const post = pre + config.raised;
  return {
    raised: config.raised,
    preMoney: pre,
    postMoney: post,
    founderPctNow: founder?.pct ?? 0,
    founderPctAfterApprox: Math.round((founder?.pct ?? 0) * 0.8 * 10) / 10,
    downRound: down,
    roundName: config.roundName
  };
}

export function seriesCPreview(state) {
  return pricedRoundPreview(state, {
    requireFlag: 'seriesBClosed',
    setFlag: 'seriesCClosed',
    preMoney: 200_000_000,
    raised: 50_000_000,
    roundName: 'Series C',
    minLifetime: 30_000_000
  });
}

export function seriesDPreview(state) {
  return pricedRoundPreview(state, {
    requireFlag: 'seriesCClosed',
    setFlag: 'seriesDClosed',
    preMoney: 500_000_000,
    raised: 100_000_000,
    roundName: 'Series D',
    minLifetime: 80_000_000
  });
}

export function seriesEPreview(state) {
  return pricedRoundPreview(state, {
    requireFlag: 'seriesDClosed',
    setFlag: 'seriesEClosed',
    preMoney: 1_000_000_000,
    raised: 150_000_000,
    roundName: 'Series E',
    minLifetime: 200_000_000
  });
}

export function seriesFPreview(state) {
  return pricedRoundPreview(state, {
    requireFlag: 'seriesEClosed',
    setFlag: 'seriesFClosed',
    preMoney: 2_000_000_000,
    raised: 200_000_000,
    roundName: 'Series F',
    minLifetime: 400_000_000
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
    !state.workspace?.smallOfficeOwned ||
    state.flags?.seedRoundClosed
  ) {
    return null;
  }
  const founder = getFounderRow(state);
  const founderPct = founder?.pct ?? 100;
  const { raised, preMoney, postMoney } = getSeedRoundTerms(state);
  const dilutionFactor = 1 - raised / postMoney - 0.1 * (1 - raised / postMoney);
  const founderAfter = Math.round(founderPct * dilutionFactor * 10) / 10;
  const pitchNote = seedRoundTermsNote(state);
  return {
    raised,
    preMoney,
    postMoney,
    founderPctNow: founderPct,
    founderPctAfterApprox: founderAfter,
    note: pitchNote ?? '~20% to seed investors and 10% ESOP (pro-forma).'
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
