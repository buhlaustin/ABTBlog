import { STAGES, formatMoney } from './constants.js';
import { getArr } from './Workspace.js';

export const PUBLIC_FLOAT_ROW_ID = 'public-float';

/** IPO listing price target — keeps sticker sane vs ARR and valuation. */
export function targetIpoSharePrice(state, valuation) {
  const arr = Math.max(getArr(state), (state.finance?.mrr ?? 0) * 12, 1);
  const ps = valuation / arr;
  const fromArr = 16 + Math.log10(Math.max(arr, 1e6)) * 10.5;
  const fromVal = Math.sqrt(valuation / 40_000_000) * 2.6;
  let price = Math.round(((fromArr + fromVal) / 2) * 100) / 100;
  if (ps > 28) price *= 0.68;
  if (ps > 45) price *= 0.58;
  return Math.max(8, Math.min(85, price));
}

/** ESOP created at seed — 8% fully-diluted (was 10%). */
export const SEED_ESOP_FD_PCT = 0.08;

/** Typical IPO: ~25% tradable float; ~8% primary (new shares, cash to company). */
export const IPO_TARGET_FLOAT_FD_PCT = 0.26;
export const IPO_PRIMARY_FD_PCT = 0.08;
/** Cap valuation-implied share inflation (old bug pushed ~70%+ float). */
export const IPO_MAX_FLOAT_FD_PCT = 0.32;

/**
 * IPO listing: primary shares (cash to company) + public float (secondary + free float).
 * Targets realistic dilution — not the pre-fix ~74% float, and not an ~18% toy float.
 */
export function applyPublicListingCapTable(state, valuation, sharePrice, opts = {}) {
  if (!state.capTable?.length) {
    return { totalShares: 0, primaryShares: 0, primaryProceeds: 0, liquidityShares: 0 };
  }
  const rows = state.capTable.filter((r) => r.id !== PUBLIC_FLOAT_ROW_ID).map((r) => ({ ...r }));
  const insider = rows.reduce((s, r) => s + (r.shares ?? 0), 0);
  const price = Math.max(Number(sharePrice) || 0, 0.01);
  const floatFdPct = opts.floatFdPct ?? IPO_TARGET_FLOAT_FD_PCT;
  const primaryFdPct = opts.primaryFdPct ?? IPO_PRIMARY_FD_PCT;
  const maxFloatFdPct = opts.maxFloatFdPct ?? IPO_MAX_FLOAT_FD_PCT;

  const fromFloatTarget = Math.round(insider / (1 - floatFdPct));
  const capTotal = Math.round(insider / (1 - maxFloatFdPct));
  let totalShares = Math.min(Math.max(fromFloatTarget, insider + 1), capTotal);
  const listingPrice = price;

  const newPublicShares = totalShares - insider;
  const primaryShares = Math.min(
    Math.max(1, Math.round(primaryFdPct * totalShares)),
    newPublicShares
  );
  const liquidityShares = newPublicShares - primaryShares;
  const primaryProceeds = Math.round(primaryShares * listingPrice);

  rows.push({
    id: PUBLIC_FLOAT_ROW_ID,
    name: 'Public shareholders (float)',
    shares: newPublicShares,
    class: 'public'
  });
  state.capTable = recalculateCapTablePercentages(rows);
  return {
    totalShares,
    primaryShares,
    primaryProceeds,
    liquidityShares,
    publicFloatShares: newPublicShares,
    listingPrice
  };
}

/** @deprecated name kept for callers — runs applyPublicListingCapTable. */
export function ensurePublicFloatOnCapTable(state, valuation, sharePrice, opts = {}) {
  return applyPublicListingCapTable(state, valuation, sharePrice, opts).totalShares;
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
  if (state.flags?.seriesAClosed || state.flags?.ipoFiled || state.stage === STAGES.PUBLIC) {
    return { ok: false, reason: 'X Combinator acceptance closes after Series A / going public.' };
  }
  if ((state.accelerators?.joined?.length ?? 0) >= 2) {
    return {
      ok: false,
      reason: 'You already joined two accelerator programs — cannot add X Combinator.'
    };
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
export function negotiateSeedTerms(baseTerms, structure) {
  const raised = baseTerms.raised;
  const postMoney = baseTerms.postMoney;
  if (structure === 'lean') {
    const leanRaised = Math.round(raised * 0.85);
    const leanPost = Math.round(postMoney * 1.12);
    return {
      raised: leanRaised,
      postMoney: leanPost,
      preMoney: leanPost - leanRaised
    };
  }
  if (structure === 'growth') {
    const growthRaised = Math.round(raised * 1.12);
    const growthPost = Math.round(postMoney * 0.94);
    return {
      raised: growthRaised,
      postMoney: growthPost,
      preMoney: growthPost - growthRaised
    };
  }
  return {
    raised,
    postMoney,
    preMoney: baseTerms.preMoney ?? postMoney - raised
  };
}

export function canCloseLeanSeed(state) {
  if (state.flags?.seedRoundClosed) return { ok: false, reason: 'Seed already closed.' };
  const pitch = state.xc?.demoDayPitch;
  const sentiment = state.sentiment?.score ?? 50;
  if (pitch === 'lean' || pitch === 'focused' || sentiment >= 40) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: 'Lean seed needs a focused Demo Day pitch or board sentiment ≥ 40.'
  };
}

export function seedFounderPctAfterPreview(founderPct, raised, postMoney, esopPct = SEED_ESOP_FD_PCT) {
  const investorSlice = raised / postMoney;
  const afterInvestors = founderPct * (1 - investorSlice);
  const afterEsop = afterInvestors * (1 - esopPct);
  return Math.round(afterEsop * 10) / 10;
}

export function applySeedRound(state, options = {}) {
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

  const structure = options.structure ?? 'standard';
  if (structure === 'lean' && !canCloseLeanSeed(state).ok) {
    return canCloseLeanSeed(state);
  }

  const { raised, preMoney, postMoney } = negotiateSeedTerms(getSeedRoundTerms(state), structure);

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
  const esopShares = Math.round(total * (SEED_ESOP_FD_PCT / (1 - SEED_ESOP_FD_PCT)));
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
    name: structure === 'lean' ? 'Seed (lean)' : structure === 'growth' ? 'Seed (growth)' : 'Seed',
    raised,
    preMoney,
    postMoney,
    structure,
    closedMonth: state.calendar.monthIndex,
    closedYear: state.calendar.year
  };
  state.flags.seedRoundClosed = true;
  applyFundraiseMomentum(state, 'Seed');
  const safeLines = convertOutstandingSafesAtSeed(state, postMoney);
  return { ok: true, raised, postMoney, preMoney, structure, safeLines };
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
    const esopShares = Math.round(total * (SEED_ESOP_FD_PCT / (1 - SEED_ESOP_FD_PCT)));
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
  const base = getSeedRoundTerms(state);
  const { raised, preMoney, postMoney } = base;
  const lean = negotiateSeedTerms(base, 'lean');
  const founderAfter = seedFounderPctAfterPreview(founderPct, raised, postMoney);
  const founderAfterLean = seedFounderPctAfterPreview(founderPct, lean.raised, lean.postMoney);
  const pitchNote = seedRoundTermsNote(state);
  const leanGate = canCloseLeanSeed(state);
  return {
    raised,
    preMoney,
    postMoney,
    leanRaised: lean.raised,
    leanPostMoney: lean.postMoney,
    founderPctNow: founderPct,
    founderPctAfterApprox: founderAfter,
    founderPctAfterLean: founderAfterLean,
    leanSeedOk: leanGate.ok,
    leanSeedReason: leanGate.reason,
    note: pitchNote ?? `~${Math.round((raised / postMoney) * 100)}% to seed investors and ${Math.round(SEED_ESOP_FD_PCT * 100)}% ESOP (pro-forma).`
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function totalOutstandingShares(state) {
  const total = (state.capTable ?? []).reduce((s, r) => s + (r.shares ?? 0), 0);
  return total > 0 ? total : 10_000_000;
}

/** Multiply every cap-table row — used for listing liquidity and stock splits. */
export function scaleCapTableShareCount(state, factor) {
  const mult = Math.max(1, Number(factor) || 1);
  if (mult <= 1.001) return 1;
  const rows = (state.capTable ?? []).map((r) => ({ ...r, shares: Math.round((r.shares ?? 0) * mult) }));
  state.capTable = recalculateCapTablePercentages(rows);
  return mult;
}

/**
 * Raise fully-diluted share count so market cap ÷ shares stays a normal sticker price.
 * @returns {{ mult: number, listingPrice: number }}
 */
export function ensurePublicListingShareScale(state, marketCapUsd, maxSticker = 85) {
  const cap = Math.max(0, Number(marketCapUsd) || 0);
  const sticker = Math.max(8, Number(maxSticker) || 85);
  let total = totalOutstandingShares(state);
  if (cap <= 0 || total <= 0) return { mult: 1, listingPrice: sticker };
  const minShares = Math.max(25_000_000, Math.ceil(cap / sticker));
  if (total >= minShares) {
    return { mult: 1, listingPrice: Math.round((cap / total) * 100) / 100 };
  }
  const mult = minShares / total;
  scaleCapTableShareCount(state, mult);
  total = totalOutstandingShares(state);
  return { mult, listingPrice: Math.round((cap / total) * 100) / 100 };
}

export function renderCapTableRows(state) {
  const rows = [...(state.capTable ?? [])].sort((a, b) => {
    if (a.id === PUBLIC_FLOAT_ROW_ID) return 1;
    if (b.id === PUBLIC_FLOAT_ROW_ID) return -1;
    return (b.shares ?? 0) - (a.shares ?? 0);
  });
  return rows
    .map((r) => {
      const rowClass = r.id === PUBLIC_FLOAT_ROW_ID ? ' class="cap-row-public"' : '';
      return `<tr${rowClass}><td>${escapeHtml(r.name)}</td><td class="num">${(r.shares ?? 0).toLocaleString()}</td><td class="num">${r.pct ?? 0}%</td><td>${escapeHtml(r.class ?? '—')}</td></tr>`;
    })
    .join('');
}

export const ESOP_ROW_ID = 'esop';

export function getOptionPoolRow(state) {
  return state.capTable?.find((r) => r.id === ESOP_ROW_ID) ?? null;
}

/** Insider shares only — public float should not inflate monthly pool top-ups. */
export function insiderOutstandingShares(rows) {
  return (rows ?? [])
    .filter((r) => r.id !== PUBLIC_FLOAT_ROW_ID)
    .reduce((s, r) => s + (r.shares ?? 0), 0);
}

/**
 * Shares to add for a pool top-up: pctPoints % of current pool size (e.g. 5 → +5% more pool shares).
 * Small fallback slice of insider FD if the pool row is empty.
 */
export function sharesForOptionPoolTopUp(rows, poolShares, pctPoints) {
  const pct = Number(pctPoints) / 100;
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 0.5) return 0;
  const pool = Math.max(0, Number(poolShares) || 0);
  if (pool > 0) {
    return Math.max(1, Math.round(pool * pct));
  }
  const insider = insiderOutstandingShares(rows);
  if (insider <= 0) return 0;
  return Math.max(1, Math.round(insider * (pct / 20)));
}

/** Preview a monthly pool refresh before mutating cap table. */
export function previewOptionPoolExpansion(state, pctPoints) {
  const pct = Number(pctPoints) / 100;
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 0.5) return null;
  const rows = state.capTable ?? [];
  if (!rows.length) return null;
  const poolRow = getOptionPoolRow(state);
  const poolShares = poolRow?.shares ?? 0;
  const totalBefore = rows.reduce((s, r) => s + (r.shares ?? 0), 0);
  if (totalBefore <= 0) return null;
  const sharesAdded = sharesForOptionPoolTopUp(rows, poolShares, pctPoints);
  if (sharesAdded <= 0) return null;
  const poolAfter = poolShares + sharesAdded;
  const totalAfter = totalBefore + sharesAdded;
  const poolPctBefore = Math.round((poolShares / totalBefore) * 1000) / 10;
  const poolPctAfter = Math.round((poolAfter / totalAfter) * 1000) / 10;
  return {
    pctPoints: Number(pctPoints),
    sharesAdded,
    poolSharesBefore: poolShares,
    poolPctBefore,
    poolPctAfter,
    totalOutstandingBefore: totalBefore,
    totalOutstandingAfter: totalAfter
  };
}

/** Add pctPoints percent of current pool shares (monthly board refresh — not a full FD recap). */
export function expandEmployeeOptionPool(state, pctPoints) {
  const pct = Number(pctPoints) / 100;
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 0.5) {
    return { ok: false, reason: 'Invalid pool expansion size.' };
  }
  if (!state.capTable?.length) {
    return { ok: false, reason: 'No cap table yet.' };
  }
  if (!state.flags?.seedRoundClosed && !getOptionPoolRow(state)) {
    return { ok: false, reason: 'Close seed first — the employee option pool is created at seed.' };
  }

  const preview = previewOptionPoolExpansion(state, pctPoints);
  if (!preview) return { ok: false, reason: 'Could not compute pool expansion.' };

  const rows = state.capTable.map((r) => ({ ...r }));
  let row = rows.find((r) => r.id === ESOP_ROW_ID);
  if (!row) {
    row = {
      id: ESOP_ROW_ID,
      name: 'Employee option pool',
      shares: 0,
      class: 'option'
    };
    rows.push(row);
  }
  row.shares = (row.shares ?? 0) + preview.sharesAdded;
  state.capTable = recalculateCapTablePercentages(rows);

  return {
    ok: true,
    pctPoints: preview.pctPoints,
    sharesAdded: preview.sharesAdded,
    poolPct: row.pct,
    poolShares: row.shares,
    poolPctBefore: preview.poolPctBefore,
    poolPctAfter: preview.poolPctAfter
  };
}

export function renderCapTableSummary(state) {
  const total = totalOutstandingShares(state);
  const floatRow = state.capTable?.find((r) => r.id === PUBLIC_FLOAT_ROW_ID);
  const price = state.publicMarket?.sharePrice;
  const implied =
    price && total > 0 ? Math.round(price * total) : state.finance?.valuation ?? null;
  const parts = [`<strong>${total.toLocaleString()}</strong> shares outstanding`];
  if (floatRow) {
    parts.push(`public float <strong>${floatRow.pct ?? 0}%</strong>`);
  }
  if (implied && price) {
    parts.push(`implied mkt cap ${formatMoney(implied)} at ${formatMoney(price)}/sh`);
  }
  return `<p class="fine-print cap-table-summary">${parts.join(' · ')}</p>`;
}
