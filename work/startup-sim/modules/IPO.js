import { STAGES, formatMoney, createInitialPublicMarket } from './constants.js';
import { getEffectiveIpoGate } from './SandboxTuning.js';
import { getArr } from './Workspace.js';
import { calendarTurn } from './XC.js';
import {
  applyPublicListingCapTable,
  getFounderRow,
  issueFollowOnShares,
  recalculateCapTablePercentages,
  retirePublicFloatShares,
  targetIpoSharePrice,
  totalOutstandingShares,
  PUBLIC_FLOAT_ROW_ID,
  IPO_PRIMARY_FD_PCT,
  IPO_TARGET_FLOAT_FD_PCT
} from './CapTable.js';
import {
  ceoEndgameCompSnapshot,
  depositStockCashOutToPersonalBank,
  creditCeoStockSale
} from './CeoEconomics.js';
import { formatCalendarStamp } from './GameCalendar.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import { buildGameSnapshot } from './GameContext.js';
import { recordCashOutflow } from './Finance.js';
import { totalSubsidiaryMrr } from './Acquisitions.js';

function deriveTicker(companyName) {
  const letters = String(companyName || 'CO')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (letters.length >= 4) return letters.slice(0, 4);
  return (letters + 'ACME').slice(0, 4);
}

export function canFileIpo(state) {
  return Boolean(
    state.flags?.ipoUnlocked &&
      state.flags?.seedRoundClosed &&
      !state.flags?.ipoFiled &&
      !state.flags?.gameOver
  );
}

export function isPublicCompany(state) {
  return Boolean(state.flags?.ipoFiled && state.stage === STAGES.PUBLIC);
}

function computeIpoValuation(state) {
  const revenue = state.finance?.lifetimeRevenue ?? 0;
  const mrr = state.finance?.mrr ?? 0;
  const lastVal = state.finance?.valuation ?? 15_000_000;
  const revenueImplied = Math.max(lastVal, revenue * 4 + mrr * 48);
  return Math.min(80_000_000_000, Math.round(revenueImplied));
}

export function fileIpo(state) {
  if (state.flags?.ipoFiled) {
    return { ok: false, reason: 'IPO already filed.' };
  }
  if (!state.flags?.seedRoundClosed) {
    return { ok: false, reason: 'Close your seed round on Finance before filing an IPO.' };
  }
  if (!state.flags?.ipoUnlocked) {
    return {
      ok: false,
      reason: `Reach ${formatMoney(getEffectiveIpoGate(state))} ARR to unlock the IPO window.`
    };
  }
  if (state.flags?.gameOver) {
    return { ok: false, reason: 'This run has ended.' };
  }
  if (!canFileIpo(state)) {
    return { ok: false, reason: 'IPO is not available yet.' };
  }

  const valuation = computeIpoValuation(state);
  const ipoPrice = targetIpoSharePrice(state, valuation);
  const pop = 1.08 + Math.random() * 0.12;
  const openPrice = Math.round(ipoPrice * pop * 100) / 100;
  const openValuation = Math.round(valuation * pop);
  const listing = applyPublicListingCapTable(state, openValuation, openPrice, {
    floatFdPct: IPO_TARGET_FLOAT_FD_PCT,
    primaryFdPct: IPO_PRIMARY_FD_PCT
  });
  const primaryProceeds = listing.primaryProceeds ?? 0;
  if (primaryProceeds > 0) {
    state.finance.cash = (state.finance.cash ?? 0) + primaryProceeds;
  }

  state.publicMarket = state.publicMarket ?? createInitialPublicMarket();
  state.publicMarket.ticker = deriveTicker(state.company?.name);
  state.publicMarket.ipoPrice = ipoPrice;
  state.publicMarket.sharePrice = openPrice;
  state.publicMarket.ipoMonthIndex = state.calendar.monthIndex;
  state.publicMarket.ipoYear = state.calendar.year;
  state.publicMarket.priorMonthMrr = state.finance.mrr ?? 0;
  state.publicMarket.priceHistory = [{ month: state.calendar.monthIndex, year: state.calendar.year, price: openPrice }];
  state.publicMarket.monthsPublic = 0;
  state.publicMarket.lockupMonthsRemaining = 1;
  state.publicMarket.guidanceTone = 'inline';
  state.publicMarket.whisperRevenueTarget = whisperRevenueTarget(state);
  state.publicMarket.priorSharePrice = openPrice;
  state.publicMarket.buybackAuthorized = Math.round(valuation * 0.02);
  state.publicMarket.buybackUsedLifetime = 0;
  state.publicMarket.shortInterestPct = 4 + Math.floor(Math.random() * 6);
  state.publicMarket.high52 = openPrice;
  state.publicMarket.low52 = openPrice;
  state.publicMarket.indexMember = false;
  state.publicMarket.indexName = 'FTEQ-100';
  state.publicMarket.marketTape = [];
  state.publicMarket.institutionalHoldPct = 38 + Math.floor(Math.random() * 8);
  pushMarketTape(
    state,
    `IPO primary ${formatMoney(primaryProceeds)} (${listing.primaryShares?.toLocaleString('en-US') ?? '—'} new shares) hits the balance sheet.`
  );
  pushMarketTape(state, `Listed at ${formatMoney(openPrice)} — opening pop ${Math.round((pop - 1) * 100)}%.`);
  refreshAnalystCoverage(state, { force: true });
  computeFundamentalSharePrice(state);

  state.finance.valuation = Math.round(openPrice * totalOutstandingShares(state));
  state.publicMarket.ipoPrimaryProceeds = primaryProceeds;
  state.publicMarket.ipoPrimaryShares = listing.primaryShares ?? 0;
  state.flags.ipoFiled = true;
  state.stage = STAGES.PUBLIC;
  state.finance.fixedCostsMonthly = 6_500;
  if (!state.meta) state.meta = {};
  state.meta.monthsAtIpo = calendarTurn(state);

  return {
    ok: true,
    ticker: state.publicMarket.ticker,
    openPrice,
    valuation: state.finance.valuation,
    primaryProceeds,
    primaryShares: listing.primaryShares ?? 0
  };
}

export function founderStakeValue(state) {
  const founder = getFounderRow(state);
  const shares = founder?.shares ?? 0;
  const price = state.publicMarket?.sharePrice ?? 0;
  return Math.round(shares * price);
}

export function marketCap(state) {
  if (!isPublicCompany(state)) return 0;
  const shares = totalOutstandingShares(state);
  const price = state.publicMarket?.sharePrice ?? 0;
  return Math.round(shares * price);
}

function guidanceToneMult(tone) {
  if (tone === 'sandbag') return 0.88;
  if (tone === 'aggressive') return 1.14;
  return 1;
}

/** Street whisper for the month — used by guidance scoring. */
export function whisperRevenueTarget(state) {
  const mrr = state.finance?.mrr ?? 0;
  const burn = state.finance?.monthlyBurn ?? 0;
  const tone = state.publicMarket?.guidanceTone ?? 'inline';
  const base = Math.max(burn * 1.12, mrr * 0.08);
  return Math.round(base * guidanceToneMult(tone));
}

function priceFloor(state, price) {
  const pm = state.publicMarket ?? {};
  return (pm.ipoPrice ?? price) * 0.15;
}

/** Model fair value from ARR, growth, and street sentiment — anchors monthly re-rating. */
export function computeFundamentalSharePrice(state) {
  if (!isPublicCompany(state)) return null;
  const shares = totalOutstandingShares(state);
  if (shares <= 0) return null;

  const pm = state.publicMarket ?? {};
  const mrr = state.finance?.mrr ?? 0;
  const priorMrr = pm.priorMonthMrr ?? mrr;
  const coreArr = mrr * 12;
  const portArr = totalSubsidiaryMrr(state) * 12;
  const arr = Math.max(coreArr + portArr, 1);

  let growth = 0;
  if (priorMrr > 0) growth = (mrr - priorMrr) / priorMrr;
  growth = Math.max(-0.2, Math.min(0.35, growth));

  let ps = 6 + growth * 22;
  ps += (pm.guidanceBeatStreak ?? 0) * 0.35;
  ps += Math.min(2.5, (state.product?.buzz ?? 0) * 0.025);
  ps -= (state.world?.competitor?.pressure ?? 0) * 0.22;
  if (pm.guidanceTone === 'sandbag') ps *= 1.04;
  if (pm.guidanceTone === 'aggressive') ps *= 0.96;
  if (pm.indexMember) ps += 0.8;
  ps = Math.max(4, Math.min(26, ps));

  pm.priceSalesMultiple = Math.round(ps * 10) / 10;
  const fairCap = arr * ps;
  const floor = priceFloor(state, pm.sharePrice ?? pm.ipoPrice ?? 1);
  const px = Math.round((fairCap / shares) * 100) / 100;
  pm.fundamentalPrice = Math.max(floor, px);
  return pm.fundamentalPrice;
}

export function publicStockMetrics(state) {
  if (!isPublicCompany(state)) return null;
  const pm = state.publicMarket ?? {};
  const price = pm.sharePrice ?? 0;
  const fundamental = pm.fundamentalPrice ?? computeFundamentalSharePrice(state) ?? price;
  const premiumPct = fundamental > 0 ? ((price - fundamental) / fundamental) * 100 : 0;
  const cap = marketCap(state);
  const arr =
    (state.finance?.mrr ?? 0) * 12 + totalSubsidiaryMrr(state) * 12 || getArr(state);
  const tradingPs = arr > 0 ? cap / arr : null;
  const prev = pm.priorSharePrice ?? pm.ipoPrice ?? price;
  const sessionCh = prev > 0 ? ((price - prev) / prev) * 100 : 0;
  return {
    price,
    fundamental,
    premiumPct,
    tradingPs,
    arr,
    sessionCh,
    lastDelta: pm.lastMonthDeltaPct,
    modelPs: pm.priceSalesMultiple,
    drivers: pm.lastTickDrivers ?? []
  };
}

function hashPublic(state, salt) {
  const seed = state.meta?.runSeed ?? 1;
  const turn = calendarTurn(state);
  let h = (seed ^ salt ^ turn) >>> 0;
  h = Math.imul(h ^ (turn * 2654435761), 0x9e3779b1);
  return (h >>> 0) / 0xffffffff;
}

function pushMarketTape(state, text) {
  if (!state.publicMarket) return;
  const pm = state.publicMarket;
  if (!pm.marketTape) pm.marketTape = [];
  pm.marketTape.unshift({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    text
  });
  pm.marketTape = pm.marketTape.slice(0, 8);
}

function updateRange52(state, price) {
  const pm = state.publicMarket;
  if (!pm) return;
  if (pm.high52 == null || price > pm.high52) pm.high52 = price;
  if (pm.low52 == null || price < pm.low52) pm.low52 = price;
}

function pushPriceHistory(state, price) {
  const pm = state.publicMarket;
  pm.priceHistory = (pm.priceHistory ?? []).concat({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    price
  });
  pm.priceHistory = pm.priceHistory.slice(-36);
  updateRange52(state, price);
  const shares = totalOutstandingShares(state);
  state.finance.valuation = Math.round(price * shares);
}

/** Instant move (crises, desk, buybacks). Returns new price. */
export function applyStockPctMove(state, pct) {
  if (!isPublicCompany(state) || state.flags?.cashedOut || !pct) return null;
  const pm = state.publicMarket;
  const price = pm.sharePrice ?? pm.ipoPrice ?? 1;
  const next = Math.max(priceFloor(state, price), Math.round(price * (1 + Number(pct)) * 100) / 100);
  pm.priorSharePrice = price;
  pm.sharePrice = next;
  pushPriceHistory(state, next);
  computeFundamentalSharePrice(state);
  refreshAnalystCoverage(state);
  return next;
}

export function refreshAnalystCoverage(state, opts = {}) {
  if (!isPublicCompany(state)) return;
  const pm = state.publicMarket;
  const price = pm.sharePrice ?? pm.ipoPrice ?? 1;
  const target = pm.analystTarget ?? price * 1.08;
  if (opts.force || !pm.analystTarget) {
    pm.analystTarget = Math.round(price * (1.05 + Math.random() * 0.12) * 100) / 100;
  } else {
    pm.analystTarget = Math.round((target * 0.65 + price * 1.1) * 100) / 100;
  }
  const upside = (pm.analystTarget - price) / Math.max(price, 0.01);
  if (upside > 0.12) pm.analystRating = 'Outperform';
  else if (upside > 0.04) pm.analystRating = 'Buy';
  else if (upside > -0.06) pm.analystRating = 'Hold';
  else pm.analystRating = 'Underperform';
  const streak = pm.guidanceBeatStreak ?? 0;
  if (streak >= 3 && pm.analystRating === 'Hold') pm.analystRating = 'Buy';
  if (streak === 0 && pm.analystRating === 'Buy') pm.analystRating = 'Hold';
}

export function setPublicGuidanceTone(state, tone) {
  if (!isPublicCompany(state)) return { ok: false, reason: 'List first.' };
  const allowed = ['sandbag', 'inline', 'aggressive'];
  if (!allowed.includes(tone)) return { ok: false, reason: 'Unknown guidance tone.' };
  state.publicMarket.guidanceTone = tone;
  state.publicMarket.whisperRevenueTarget = whisperRevenueTarget(state);
  const labels = { sandbag: 'Conservative guide', inline: 'Inline guide', aggressive: 'Aggressive guide' };
  return { ok: true, summary: `${labels[tone]} — whisper ${formatMoney(state.publicMarket.whisperRevenueTarget)}/mo.` };
}

const BUYBACK_MIN = 50_000;

export function executeStockBuyback(state, amount) {
  if (!isPublicCompany(state)) return { ok: false, reason: 'Buybacks unlock after IPO.' };
  const pm = state.publicMarket;
  const authorized = pm.buybackAuthorized ?? 0;
  const spend = Math.round(Number(amount) || 0);
  if (spend < BUYBACK_MIN) {
    return { ok: false, reason: `Minimum buyback ${formatMoney(BUYBACK_MIN)}.` };
  }
  if (spend > authorized) {
    return { ok: false, reason: `Only ${formatMoney(authorized)} left on the authorization.` };
  }
  if ((state.finance?.cash ?? 0) < spend) {
    return { ok: false, reason: 'Not enough cash on the balance sheet.' };
  }
  state.finance.cash -= spend;
  recordCashOutflow(state, spend, 'buyback');
  pm.buybackAuthorized = authorized - spend;
  pm.buybackUsedLifetime = (pm.buybackUsedLifetime ?? 0) + spend;
  const price = pm.sharePrice ?? pm.ipoPrice ?? 1;
  retirePublicFloatShares(state, spend / Math.max(price, 0.01));
  const pct = Math.min(0.09, spend / Math.max(marketCap(state), 1) * 2.5);
  applyStockPctMove(state, pct);
  pm.shortInterestPct = Math.max(1, (pm.shortInterestPct ?? 5) - 1);
  pushMarketTape(state, `Open-market repurchase ${formatMoney(spend)}.`);
  return {
    ok: true,
    spend,
    pct,
    summary: `Repurchased ${formatMoney(spend)} — stock ${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(1)}%.`
  };
}

export function fileFollowOnOffering(state) {
  if (!isPublicCompany(state)) return { ok: false, reason: 'Follow-on unlocks after IPO.' };
  const pm = state.publicMarket;
  if ((pm.monthsPublic ?? 0) < 3) {
    return { ok: false, reason: 'Wait at least 3 months after listing.' };
  }
  const turn = calendarTurn(state);
  if (pm.lastFollowOnTurn === turn) {
    return { ok: false, reason: 'One follow-on per month.' };
  }
  const raise = Math.round(marketCap(state) * 0.04);
  if (raise < 100_000) return { ok: false, reason: 'Market cap too small for a follow-on.' };
  pm.lastFollowOnTurn = turn;
  state.finance.cash = (state.finance.cash ?? 0) + raise;
  state.finance.lifetimeRevenue += raise;
  const dilutionPct = 0.025;
  issueFollowOnShares(state, dilutionPct);
  applyStockPctMove(state, -0.05);
  pm.buybackAuthorized = (pm.buybackAuthorized ?? 0) + Math.round(raise * 0.15);
  pushMarketTape(state, `Follow-on priced — ${formatMoney(raise)} primary.`);
  return {
    ok: true,
    raise,
    summary: `Follow-on raised ${formatMoney(raise)} — stock −5%, cap table −2.5%.`
  };
}

export function executeStockSplit(state) {
  if (!isPublicCompany(state)) return { ok: false, reason: 'Splits require a listed stock.' };
  const pm = state.publicMarket;
  const price = pm.sharePrice ?? 0;
  if (price < 180) {
    return { ok: false, reason: 'Board waits until the share price is at least $180.' };
  }
  const turn = calendarTurn(state);
  if (pm.lastSplitTurn != null && turn - pm.lastSplitTurn < 6) {
    return { ok: false, reason: 'One split every 6 months max.' };
  }
  pm.lastSplitTurn = turn;
  for (const row of state.capTable ?? []) {
    if (row.shares) row.shares *= 2;
  }
  pm.sharePrice = Math.round((price / 2) * 100) / 100;
  pm.ipoPrice = Math.round(((pm.ipoPrice ?? price) / 2) * 100) / 100;
  applyStockPctMove(state, 0.012);
  pushMarketTape(state, '2-for-1 split — retail traders celebrate the lower sticker price.');
  return { ok: true, summary: '2-for-1 split executed — share count doubled, price halved.' };
}

export function declareStockDividend(state) {
  if (!isPublicCompany(state)) return { ok: false, reason: 'Dividends unlock after IPO.' };
  const pm = state.publicMarket;
  if ((pm.monthsPublic ?? 0) < 3) {
    return { ok: false, reason: 'Wait 3 months after listing.' };
  }
  const turn = calendarTurn(state);
  if (pm.lastDividendTurn != null && turn - pm.lastDividendTurn < 3) {
    return { ok: false, reason: 'One dividend declaration per quarter.' };
  }
  const shares = totalOutstandingShares(state);
  const perShare = 0.04;
  const payout = Math.round(shares * perShare);
  if ((state.finance?.cash ?? 0) < payout) {
    return { ok: false, reason: `Need ${formatMoney(payout)} cash for the dividend.` };
  }
  pm.lastDividendTurn = turn;
  state.finance.cash -= payout;
  recordCashOutflow(state, payout, 'dividend');
  pm.dividendPerShareLast = perShare;
  applyStockPctMove(state, 0.018);
  pm.institutionalHoldPct = Math.min(78, (pm.institutionalHoldPct ?? 42) + 1);
  pushMarketTape(state, `Declared $${perShare.toFixed(2)}/share dividend (${formatMoney(payout)} total).`);
  return { ok: true, payout, summary: `Dividend ${formatMoney(payout)} paid — yield chasers bid the stock.` };
}

function maybeShortSqueeze(state, deltaPct) {
  const pm = state.publicMarket;
  if ((pm.shortInterestPct ?? 0) < 9 || (pm.guidanceBeatStreak ?? 0) < 3 || deltaPct <= 0) return null;
  if (hashPublic(state, 901) > 0.55) return null;
  const squeeze = 0.07 + hashPublic(state, 902) * 0.05;
  applyStockPctMove(state, squeeze);
  pm.shortInterestPct = Math.max(2, pm.shortInterestPct - 4);
  pushMarketTape(state, `Short squeeze — cover rush added ${(squeeze * 100).toFixed(0)}%.`);
  return `Short squeeze: shorts scrambled (+${(squeeze * 100).toFixed(1)}%).`;
}

function maybeAnalystAction(state) {
  const pm = state.publicMarket;
  const turn = calendarTurn(state);
  if (pm.lastAnalystActionTurn === turn) return null;
  if (hashPublic(state, 801) > 0.38) return null;
  pm.lastAnalystActionTurn = turn;
  const streak = pm.guidanceBeatStreak ?? 0;
  const rival = state.world?.competitor?.pressure ?? 0;
  if (streak >= 2) {
    refreshAnalystCoverage(state, { force: true });
    applyStockPctMove(state, 0.022);
    const line = `${pm.analystRating} reiterate — price target ${formatMoney(pm.analystTarget)}.`;
    pushMarketTape(state, line);
    return `Analyst upgrade buzz: ${line}`;
  }
  if (streak === 0 && rival >= 4) {
    pm.analystRating = 'Underperform';
    pm.analystTarget = Math.round((pm.sharePrice ?? 1) * 0.92 * 100) / 100;
    applyStockPctMove(state, -0.028);
    const line = 'Downgrade to Underperform — rival share gains cited.';
    pushMarketTape(state, line);
    return line;
  }
  return null;
}

/** Month open: index, tape, institutional drift while public. */
export function tickPublicMarketAtMonthStart(state) {
  if (!isPublicCompany(state) || state.flags?.cashedOut) return [];
  const pm = state.publicMarket;
  const lines = [];
  pm.institutionalHoldPct = Math.min(82, (pm.institutionalHoldPct ?? 42) + (pm.indexMember ? 0.4 : 0.15));
  if (!pm.indexMember && (pm.monthsPublic ?? 0) >= 6 && marketCap(state) >= 500_000_000) {
    pm.indexMember = true;
    pm.indexName = pm.indexName ?? 'FTEQ-100';
    applyStockPctMove(state, 0.025);
    pushMarketTape(state, `Added to ${pm.indexName} — passive flows incoming.`);
    lines.push(`${pm.ticker} entered the ${pm.indexName} — index rebalancing bid expected.`);
  }
  const analystLine = maybeAnalystAction(state);
  if (analystLine) lines.push(analystLine);
  if (hashPublic(state, 803) < 0.12) {
    pm.shortInterestPct = Math.min(18, (pm.shortInterestPct ?? 5) + 1);
    lines.push(`Short interest ticked up to ${pm.shortInterestPct}% — borrow desk busy.`);
  } else if (hashPublic(state, 804) < 0.1 && (pm.shortInterestPct ?? 0) > 4) {
    pm.shortInterestPct -= 1;
  }
  return lines;
}

function portfolioConglomerateBonus(state) {
  const subMrr = totalSubsidiaryMrr(state);
  const core = state.finance?.mrr ?? 0;
  if (subMrr <= 0) return 0;
  const mix = subMrr / Math.max(core + subMrr, 1);
  return Math.min(0.025, mix * 0.04);
}

function isEarningsMonth(state) {
  const pm = state.publicMarket;
  const m = pm.monthsPublic ?? 0;
  return m > 0 && m % 3 === 0;
}

function formatDriverPct(pct) {
  const v = (Number(pct) || 0) * 100;
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

/** Monthly stock tick — call after month-end burn, before advancing calendar. */
export function tickPublicMarket(state) {
  if (!isPublicCompany(state) || state.flags?.cashedOut) return { deltaPct: 0, lines: [] };

  const pm = state.publicMarket;
  const price = pm.sharePrice ?? pm.ipoPrice ?? 1;
  pm.priorSharePrice = price;
  const mrr = state.finance?.mrr ?? 0;
  const prior = pm.priorMonthMrr ?? mrr;
  pm.priorMonthMrr = mrr;

  let growth = 0;
  if (prior > 0) {
    growth = (mrr - prior) / prior;
  } else if (mrr > 0) {
    growth = 0.05;
  }

  const fundamental = computeFundamentalSharePrice(state) ?? price;
  const richPct = fundamental > 0 ? (price - fundamental) / fundamental : 0;
  const meanRevert = -richPct * 0.16;

  const burn = state.finance?.monthlyBurn ?? 0;
  const cash = state.finance?.cash ?? 0;
  const runwayStress = burn > 0 && cash / burn < 3 ? -0.045 : burn > 0 && cash / burn < 6 ? -0.015 : 0;
  const buzz = Math.min(0.035, (state.product?.buzz ?? 0) * 0.0045);
  const noise = (Math.random() - 0.5) * 0.08;
  const sentiment = readNewsSentiment(state);
  const guidanceBeat = Math.min(0.07, (pm.guidanceBeatStreak ?? 0) * 0.014);
  const rivalHeat = Math.min(0.035, (state.world?.competitor?.pressure ?? 0) * 0.0045);
  const conglomerate = portfolioConglomerateBonus(state);
  const shortDrag = ((pm.shortInterestPct ?? 0) / 100) * 0.018;
  const growthTerm = growth * 0.42;

  let deltaPct =
    growthTerm +
    meanRevert +
    runwayStress +
    buzz +
    noise +
    sentiment +
    guidanceBeat +
    conglomerate -
    rivalHeat -
    shortDrag;

  const drivers = [
    { label: 'MRR growth', pct: growthTerm },
    { label: 'Valuation vs model', pct: meanRevert },
    { label: 'Guidance streak', pct: guidanceBeat },
    { label: 'Runway / cash', pct: runwayStress },
    { label: 'Buzz & news', pct: buzz + sentiment },
    { label: 'Rival & shorts', pct: -(rivalHeat + shortDrag) }
  ];

  const lines = [];
  if (isEarningsMonth(state)) {
    const monthRev = state.calendar?.monthRevenue ?? mrr;
    const whisper = pm.whisperRevenueTarget ?? whisperRevenueTarget(state);
    const surprise = whisper > 0 ? (monthRev - whisper) / whisper : 0;
    const earningsShock = Math.max(-0.09, Math.min(0.11, surprise * 0.35));
    deltaPct += earningsShock;
    drivers.push({ label: 'Earnings vs whisper', pct: earningsShock });
    deltaPct *= 1.35;
    pm.lastEarningsMonth = `${state.calendar.year}-${state.calendar.monthIndex}`;
    if ((pm.guidanceBeatStreak ?? 0) >= 2) {
      pm.earningsSurpriseStreak = (pm.earningsSurpriseStreak ?? 0) + 1;
      lines.push('Earnings call: beat-and-raise tone lifted the after-hours quote.');
    } else {
      pm.earningsSurpriseStreak = 0;
      lines.push('Earnings call: traders debated guidance more than the slide deck.');
    }
    pm.buybackAuthorized = (pm.buybackAuthorized ?? 0) + Math.round(marketCap(state) * 0.008);
  }

  const floor = priceFloor(state, price);
  const next = Math.max(floor, Math.round(price * (1 + deltaPct) * 100) / 100);

  pm.sharePrice = next;
  pm.lastMonthDeltaPct = deltaPct;
  pm.lastTickDrivers = drivers
    .filter((d) => Math.abs(d.pct) >= 0.002)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 5);
  pm.monthsPublic = (pm.monthsPublic ?? 0) + 1;
  pushPriceHistory(state, next);
  pm.whisperRevenueTarget = whisperRevenueTarget(state);
  computeFundamentalSharePrice(state);
  refreshAnalystCoverage(state);

  const squeezeLine = maybeShortSqueeze(state, deltaPct);
  if (squeezeLine) lines.push(squeezeLine);

  lines.unshift(
    `Stock (${pm.ticker}) ${deltaPct >= 0 ? '+' : ''}${(deltaPct * 100).toFixed(1)}% → ${formatMoney(pm.sharePrice)}/share (model ${formatMoney(pm.fundamentalPrice ?? fundamental)}).`
  );
  return { deltaPct, lines };
}

export function stockHudChangeLabel(state) {
  if (!isPublicCompany(state)) return '';
  const pm = state.publicMarket ?? {};
  const cur = pm.sharePrice ?? 0;
  const prev = pm.priorSharePrice ?? pm.ipoPrice ?? cur;
  if (!prev) return '';
  const pct = ((cur - prev) / prev) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function renderStockSparkline(history) {
  const pts = (history ?? []).slice(-18);
  if (pts.length < 2) return '';
  const prices = pts.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(max - min, 0.01);
  const w = 280;
  const h = 56;
  const up = prices[prices.length - 1] >= prices[0];
  const coords = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((p - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const ipoLine =
    min !== max
      ? `<line x1="0" y1="${(h - ((prices[0] - min) / span) * (h - 4) - 2).toFixed(1)}" x2="${w}" y2="${(h - ((prices[0] - min) / span) * (h - 4) - 2).toFixed(1)}" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3" />`
      : '';
  return `<svg class="stock-sparkline${up ? ' stock-sparkline-up' : ' stock-sparkline-down'}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Recent share price trend"><polyline fill="none" stroke="currentColor" stroke-width="2.5" points="${coords}" />${ipoLine}</svg>`;
}

function readNewsSentiment(state) {
  const headlines = (state.news?.currentMonthArticles ?? [])
    .concat(state.news?.archive ?? [])
    .slice(0, 6)
    .map((a) => `${a.headline ?? ''} ${a.dek ?? ''}`.toLowerCase());
  const text = headlines.join(' ');
  if (!text) return 0;
  let score = 0;
  if (/layoff|cut|scandal|miss|downgrade|probe/.test(text)) score -= 0.03;
  if (/record|surge|beat|ipo|partnership|growth|raise/.test(text)) score += 0.03;
  return score;
}

export function canCashOut(state) {
  return canSellFounderStock(state);
}

export function canSellFounderStock(state) {
  const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;
  const founder = getFounderRow(state);
  return Boolean(
    isPublicCompany(state) &&
      !state.flags?.cashedOut &&
      !state.flags?.gameOver &&
      lockup <= 0 &&
      (founder?.shares ?? 0) > 0
  );
}

/** Sell part of the founder block at market — stay CEO (lockup must be clear). */
export function sellFounderSharesPartial(state, pctOfFounderRaw) {
  if (!canSellFounderStock(state)) {
    const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;
    if (lockup > 0) {
      return {
        ok: false,
        reason: `Founder lockup — wait ${lockup} more month(s) before selling stock.`
      };
    }
    return { ok: false, reason: 'Stock sales unlock after IPO once lockup ends.' };
  }
  const pct = Number(pctOfFounderRaw);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 99) {
    return { ok: false, reason: 'Sell 1%–99% of your founder shares per trade.' };
  }

  const founder = getFounderRow(state);
  const price = state.publicMarket?.sharePrice ?? 0;
  if (price <= 0) return { ok: false, reason: 'No market price for your stock.' };

  const totalFounder = founder?.shares ?? 0;
  let sellShares = Math.max(1, Math.floor(totalFounder * (pct / 100)));
  if (sellShares >= totalFounder) {
    return { ok: false, reason: 'Use step down & cash out to sell your entire stake.' };
  }

  const rows = state.capTable.map((r) => ({ ...r }));
  const founderRow = rows.find((r) => r.id === 'founder');
  if (!founderRow) return { ok: false, reason: 'Founder row missing on cap table.' };
  founderRow.shares -= sellShares;

  let floatRow = rows.find((r) => r.id === PUBLIC_FLOAT_ROW_ID);
  if (!floatRow) {
    floatRow = {
      id: PUBLIC_FLOAT_ROW_ID,
      name: 'Public shareholders (float)',
      shares: 0,
      class: 'public'
    };
    rows.push(floatRow);
  }
  floatRow.shares = (floatRow.shares ?? 0) + sellShares;
  state.capTable = recalculateCapTablePercentages(rows);

  const proceeds = Math.round(sellShares * price);
  creditCeoStockSale(
    state,
    proceeds,
    `Sold ${sellShares.toLocaleString('en-US')} shares @ ${formatMoney(price)}`
  );
  state.finance.valuation = Math.round(price * totalOutstandingShares(state));

  return {
    ok: true,
    proceeds,
    sharesSold: sellShares,
    pctOfFounder: pct,
    sharePrice: price,
    founderPctAfter: founderRow.pct
  };
}

/** Decrement IPO lockup after a month closes while public. */
export function tickIpoLockup(state) {
  if (!isPublicCompany(state) || state.flags?.cashedOut) return [];
  const pm = state.publicMarket;
  if (!pm || (pm.lockupMonthsRemaining ?? 0) <= 0) return [];
  pm.lockupMonthsRemaining = Math.max(0, pm.lockupMonthsRemaining - 1);
  if (pm.lockupMonthsRemaining === 0) {
    return ['Founder lockup ended — you may step down and cash out when ready.'];
  }
  return [`Founder lockup: ${pm.lockupMonthsRemaining} month(s) before you can cash out.`];
}

export function cashOut(state) {
  if (!canCashOut(state)) {
    const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;
    if (lockup > 0) {
      return {
        ok: false,
        reason: `Founder lockup — wait ${lockup} more month(s) after listing before cashing out.`
      };
    }
    return { ok: false, reason: 'Cash out unlocks after you take the company public.' };
  }

  const payout = founderStakeValue(state);
  const founder = getFounderRow(state);
  const comp = ceoEndgameCompSnapshot(state);
  state.ending = {
    type: 'cash_out',
    payout,
    sharePrice: state.publicMarket?.sharePrice ?? 0,
    ticker: state.publicMarket?.ticker ?? '—',
    founderPct: founder?.pct ?? 0,
    monthsPublic: state.publicMarket?.monthsPublic ?? 0,
    lifetimeRevenue: state.finance?.lifetimeRevenue ?? 0,
    pressHeadline: state.publicMarket?.pressHeadline ?? null,
    pressDek: state.publicMarket?.pressDek ?? null,
    ceoSalaryCareer: comp.salary,
    ceoOwnerDraws: comp.draws,
    ceoBankBalance: depositStockCashOutToPersonalBank(state, payout),
    totalCareerCashComp: comp.salary + comp.draws + payout
  };

  state.flags.cashedOut = true;
  state.flags.gameOver = true;
  state.flags.gameOverReason = 'You stepped down as CEO and cashed out your founder stake.';
  return { ok: true, payout };
}

export async function fetchIpoPress(state) {
  const snapshot = buildGameSnapshot(state);
  const context = {
    snapshot,
    ticker: state.publicMarket?.ticker,
    openPrice: state.publicMarket?.sharePrice,
    companyName: state.company?.name
  };

  if (!shouldUseNarrativeAi()) {
    const name = state.company?.name ?? 'Your startup';
    const ticker = state.publicMarket?.ticker ?? 'CO';
    const headline = `${name} (${ticker}) rings the fictional opening bell`;
    const dek = `Wall Street pretends to understand the pitch deck as shares begin trading.`;
    state.publicMarket.pressHeadline = headline;
    state.publicMarket.pressDek = dek;
    return { source: 'offline', headline, dek };
  }

  try {
    const res = await requestNarrative('startup_ipo_press', context);
    if (res?.headline) {
      state.publicMarket.pressHeadline = res.headline;
      state.publicMarket.pressDek = res.dek ?? '';
      return { source: 'ai', ...res };
    }
  } catch {
    /* offline */
  }

  const name = state.company?.name ?? 'Your startup';
  const ticker = state.publicMarket?.ticker ?? 'CO';
  const headline = `${name} (${ticker}) rings the fictional opening bell`;
  const dek = `Wall Street pretends to understand the pitch deck as shares begin trading.`;
  state.publicMarket.pressHeadline = headline;
  state.publicMarket.pressDek = dek;
  return { source: 'offline', headline, dek };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderIpoPanel(container, state) {
  const mount = container?.querySelector('#ipo-panel-mount') ?? document.getElementById('ipo-panel-mount');
  if (!mount) return;

  let block = '';
  if (canFileIpo(state)) {
    block = `<div class="finance-action ipo-action">
      <p><strong>IPO window open</strong> — You crossed ${formatMoney(getEffectiveIpoGate(state))} ARR. File to list on the fictional exchange.</p>
      <p class="fine-print">Typical listing: ~8% primary (new shares, cash to the company) and ~26% public float — insiders dilute accordingly. Sentiment nudges the opening pop; the stock marks monthly after that.</p>
      <button type="button" class="btn btn-primary btn-small" id="btn-file-ipo">File IPO</button>
    </div>`;
  } else if (isPublicCompany(state) && !state.flags?.cashedOut) {
    if (!state.publicMarket?.analystRating) refreshAnalystCoverage(state);
    const pm = state.publicMarket ?? {};
    if (pm.fundamentalPrice == null) computeFundamentalSharePrice(state);
    const metrics = publicStockMetrics(state) ?? {};
    const cap = marketCap(state);
    const tone = pm.guidanceTone ?? 'inline';
    const monthsPub = pm.monthsPublic ?? 0;
    const earningsSoon = monthsPub % 3 === 2;
    const earningsThisMonth = monthsPub > 0 && monthsPub % 3 === 0;
    const sessionCh = metrics.sessionCh ?? 0;
    const premium = metrics.premiumPct ?? 0;
    const premiumClass = premium >= 0 ? 'stock-premium-rich' : 'stock-premium-cheap';
    const chClass = sessionCh >= 0 ? 'positive' : 'negative';
    const driverList =
      (metrics.drivers ?? []).length > 0
        ? `<ul class="stock-driver-list">${metrics.drivers
            .map(
              (d) =>
                `<li><span>${escapeHtml(d.label)}</span> <strong>${formatDriverPct(d.pct)}</strong></li>`
            )
            .join('')}</ul>`
        : '<p class="fine-print">Price drivers appear after the first monthly close as a public company.</p>';
    block = `<div class="finance-action ipo-action stock-panel">
      <div class="stock-panel-header">
        <p class="stock-headline"><strong>${escapeHtml(pm.ticker ?? '—')}</strong> <span class="stock-spot">${formatMoney(pm.sharePrice ?? 0)}</span><span class="stat-value ${chClass}">${sessionCh >= 0 ? '+' : ''}${sessionCh.toFixed(1)}% vs last mark</span></p>
        <p class="fine-print">Mkt cap ${formatMoney(cap)} · ${totalOutstandingShares(state).toLocaleString()} shares outstanding</p>
      </div>
      ${renderStockSparkline(pm.priceHistory)}
      <div class="summary-grid stock-stats stock-stats-primary">
        <div><span class="stat-label">Model fair value</span><span class="stat-value">${formatMoney(metrics.fundamental ?? pm.fundamentalPrice ?? 0)}/sh</span></div>
        <div><span class="stat-label">Premium to model</span><span class="stat-value ${premiumClass}">${premium >= 0 ? '+' : ''}${premium.toFixed(1)}%</span></div>
        <div><span class="stat-label">Trading P/S (ARR)</span><span class="stat-value">${metrics.tradingPs != null ? `${metrics.tradingPs.toFixed(1)}×` : '—'}</span></div>
        <div><span class="stat-label">Model P/S</span><span class="stat-value">${pm.priceSalesMultiple != null ? `${pm.priceSalesMultiple}×` : '—'}</span></div>
        <div><span class="stat-label">Last month move</span><span class="stat-value">${pm.lastMonthDeltaPct != null ? formatDriverPct(pm.lastMonthDeltaPct) : '—'}</span></div>
        <div><span class="stat-label">IPO open</span><span class="stat-value">${formatMoney(pm.ipoPrice ?? 0)}</span></div>
      </div>
      <div class="summary-grid stock-stats">
        <div><span class="stat-label">Analyst</span><span class="stat-value">${escapeHtml(pm.analystRating ?? '—')} · ${formatMoney(pm.analystTarget ?? 0)} PT</span></div>
        <div><span class="stat-label">Whisper rev.</span><span class="stat-value">${formatMoney(pm.whisperRevenueTarget ?? 0)}/mo</span></div>
        <div><span class="stat-label">Beat streak</span><span class="stat-value">${pm.guidanceBeatStreak ?? 0}</span></div>
        <div><span class="stat-label">Short interest</span><span class="stat-value">${pm.shortInterestPct ?? 0}%</span></div>
        <div><span class="stat-label">Institutional</span><span class="stat-value">${Math.round(pm.institutionalHoldPct ?? 42)}%</span></div>
        <div><span class="stat-label">52-week</span><span class="stat-value">${formatMoney(pm.low52 ?? pm.sharePrice ?? 0)} – ${formatMoney(pm.high52 ?? pm.sharePrice ?? 0)}</span></div>
      </div>
      <details class="stock-drivers-details"><summary>Last month price drivers</summary>${driverList}</details>
      <p class="fine-print">${monthsPub} month(s) public${pm.ipoPrimaryProceeds ? ` · IPO primary ${formatMoney(pm.ipoPrimaryProceeds)} (${(pm.ipoPrimaryShares ?? 0).toLocaleString('en-US')} sh)` : ''}${earningsThisMonth ? ' · <strong>earnings month</strong>' : earningsSoon ? ' · earnings next month' : ''}${pm.indexMember ? ` · ${escapeHtml(pm.indexName ?? 'Index')}` : ''} · buyback auth ${formatMoney(pm.buybackAuthorized ?? 0)}${pm.dividendPerShareLast ? ` · last div $${Number(pm.dividendPerShareLast).toFixed(2)}/sh` : ''}. Monthly mark re-rates toward ARR×P/S with growth, guidance, and cash runway.</p>
      ${
        (pm.marketTape?.length ?? 0) > 0
          ? `<ul class="stock-tape">${pm.marketTape
              .map(
                (e) =>
                  `<li><span class="tape-when">${escapeHtml(formatCalendarStamp(e.year, e.month))}</span> ${escapeHtml(e.text)}</li>`
              )
              .join('')}</ul>`
          : ''
      }
      <div class="stock-guidance-row">
        <span class="stat-label">Guidance tone</span>
        <button type="button" class="btn btn-small companies-filter${tone === 'sandbag' ? ' active' : ''}" data-stock-guidance="sandbag">Sandbag</button>
        <button type="button" class="btn btn-small companies-filter${tone === 'inline' ? ' active' : ''}" data-stock-guidance="inline">Inline</button>
        <button type="button" class="btn btn-small companies-filter${tone === 'aggressive' ? ' active' : ''}" data-stock-guidance="aggressive">Guide high</button>
      </div>
      <div class="stock-actions">
        <button type="button" class="btn btn-small" data-stock-buyback="250000">Buyback $250k</button>
        <button type="button" class="btn btn-small" data-stock-buyback="1000000">Buyback $1M</button>
        <button type="button" class="btn btn-small" data-stock-follow-on>Follow-on offering</button>
        <button type="button" class="btn btn-small" data-stock-split>2-for-1 split</button>
        <button type="button" class="btn btn-small" data-stock-dividend>Declare dividend</button>
      </div>
      ${
        pm.pressHeadline
          ? `<blockquote class="ipo-press"><strong>${escapeHtml(pm.pressHeadline)}</strong><br>${escapeHtml(pm.pressDek || '')}</blockquote>`
          : ''
      }
      ${
        (pm.lockupMonthsRemaining ?? 0) > 0
          ? `<p class="fine-print">Founder lockup: ${pm.lockupMonthsRemaining} month(s) remaining — cash out on the CEO tab after lockup.</p>`
          : `<p class="fine-print">Lockup clear — step down and cash out on the <strong>CEO</strong> tab.</p>`
      }
    </div>`;
  } else if (state.flags?.cashedOut) {
    block = `<p class="fine-print">You already cashed out — start a new company from the main menu.</p>`;
  } else if (state.flags?.seedRoundClosed && !state.flags?.ipoUnlocked) {
    block = `<p class="fine-print">Reach ${formatMoney(getEffectiveIpoGate(state))} ARR to unlock the IPO window.</p>`;
  }

  mount.innerHTML = block;
}
