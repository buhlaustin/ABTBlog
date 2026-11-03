import { STAGES, formatMoney, createInitialPublicMarket } from './GameState.js';
import { getFounderRow } from './CapTable.js';
import { requestNarrative } from './NarrativeApi.js';
import { buildGameSnapshot } from './GameContext.js';

function totalOutstandingShares(state) {
  const total = (state.capTable ?? []).reduce((s, r) => s + (r.shares ?? 0), 0);
  return total > 0 ? total : 10_000_000;
}

function deriveTicker(companyName) {
  const letters = String(companyName || 'CO')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (letters.length >= 4) return letters.slice(0, 4);
  return (letters + 'ACME').slice(0, 4);
}

/** Post-seed scaling so late-game tasks can reach the $1B gate in a reasonable run. */
export function scalingRevenueMult(state) {
  if (!state.flags?.seedRoundClosed) return 1;
  const r = state.finance?.lifetimeRevenue ?? 0;
  if (r < 500_000) return 1;
  const base = 1 + Math.min(140, (r / 4_000_000) ** 0.62);
  const sandbox = state.mode === 'sandbox' ? 1.2 : 1;
  return Math.round(base * sandbox * 100) / 100;
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
  if (!canFileIpo(state)) {
    return { ok: false, reason: 'IPO not available yet (need $1B lifetime revenue and a closed seed round).' };
  }

  const valuation = computeIpoValuation(state);
  const shares = totalOutstandingShares(state);
  const ipoPrice = Math.max(1, Math.round((valuation / shares) * 100) / 100);
  const pop = 1.08 + Math.random() * 0.12;
  const openPrice = Math.round(ipoPrice * pop * 100) / 100;

  state.publicMarket = state.publicMarket ?? createInitialPublicMarket();
  state.publicMarket.ticker = deriveTicker(state.company?.name);
  state.publicMarket.ipoPrice = ipoPrice;
  state.publicMarket.sharePrice = openPrice;
  state.publicMarket.ipoMonthIndex = state.calendar.monthIndex;
  state.publicMarket.ipoYear = state.calendar.year;
  state.publicMarket.priorMonthMrr = state.finance.mrr ?? 0;
  state.publicMarket.priceHistory = [{ month: state.calendar.monthIndex, year: state.calendar.year, price: openPrice }];
  state.publicMarket.monthsPublic = 0;

  state.finance.valuation = Math.round(openPrice * shares);
  state.flags.ipoFiled = true;
  state.stage = STAGES.PUBLIC;
  state.finance.fixedCostsMonthly = 6_500;

  return { ok: true, ticker: state.publicMarket.ticker, openPrice, valuation: state.finance.valuation };
}

export function founderStakeValue(state) {
  const founder = getFounderRow(state);
  const shares = founder?.shares ?? 0;
  const price = state.publicMarket?.sharePrice ?? 0;
  return Math.round(shares * price);
}

/** Monthly stock tick — call after month-end burn, before advancing calendar. */
export function tickPublicMarket(state) {
  if (!isPublicCompany(state) || state.flags?.cashedOut) return { deltaPct: 0, lines: [] };

  const pm = state.publicMarket;
  const price = pm.sharePrice ?? pm.ipoPrice ?? 1;
  const mrr = state.finance?.mrr ?? 0;
  const prior = pm.priorMonthMrr ?? mrr;
  pm.priorMonthMrr = mrr;

  let growth = 0;
  if (prior > 0) {
    growth = (mrr - prior) / prior;
  } else if (mrr > 0) {
    growth = 0.05;
  }

  const burn = state.finance?.monthlyBurn ?? 0;
  const cash = state.finance?.cash ?? 0;
  const runwayStress = burn > 0 && cash / burn < 3 ? -0.04 : 0;
  const buzz = Math.min(0.03, (state.product?.buzz ?? 0) * 0.004);
  const noise = (Math.random() - 0.5) * 0.1;
  const sentiment = readNewsSentiment(state);

  const deltaPct = growth * 0.35 + runwayStress + buzz + noise + sentiment;
  const floor = (pm.ipoPrice ?? price) * 0.15;
  const next = Math.max(floor, Math.round(price * (1 + deltaPct) * 100) / 100);

  pm.sharePrice = next;
  pm.monthsPublic = (pm.monthsPublic ?? 0) + 1;
  pm.priceHistory = (pm.priceHistory ?? []).concat({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    price: next
  });
  pm.priceHistory = pm.priceHistory.slice(-36);

  const shares = totalOutstandingShares(state);
  state.finance.valuation = Math.round(next * shares);

  const lines = [
    `Stock (${pm.ticker}) ${deltaPct >= 0 ? '+' : ''}${(deltaPct * 100).toFixed(1)}% → ${formatMoney(next)}/share.`
  ];
  return { deltaPct, lines };
}

function readNewsSentiment(state) {
  const headlines = (state.news?.currentMonthArticles ?? [])
    .concat(state.news?.archive ?? [])
    .slice(0, 6)
    .map((a) => `${a.headline} ${a.dek}`.toLowerCase());
  const text = headlines.join(' ');
  if (!text) return 0;
  let score = 0;
  if (/layoff|cut|scandal|miss|downgrade|probe/.test(text)) score -= 0.03;
  if (/record|surge|beat|ipo|partnership|growth|raise/.test(text)) score += 0.03;
  return score;
}

export function canCashOut(state) {
  return Boolean(isPublicCompany(state) && !state.flags?.cashedOut && !state.flags?.gameOver);
}

export function cashOut(state) {
  if (!canCashOut(state)) {
    return { ok: false, reason: 'Cash out unlocks after you take the company public.' };
  }

  const payout = founderStakeValue(state);
  const founder = getFounderRow(state);
  state.ending = {
    type: 'cash_out',
    payout,
    sharePrice: state.publicMarket?.sharePrice ?? 0,
    ticker: state.publicMarket?.ticker ?? '—',
    founderPct: founder?.pct ?? 0,
    monthsPublic: state.publicMarket?.monthsPublic ?? 0,
    lifetimeRevenue: state.finance?.lifetimeRevenue ?? 0,
    pressHeadline: state.publicMarket?.pressHeadline ?? null,
    pressDek: state.publicMarket?.pressDek ?? null
  };

  state.finance.cash = (state.finance.cash ?? 0) + payout;
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
      <p><strong>IPO window open</strong> — You crossed $1B lifetime revenue. File to list on the fictional exchange.</p>
      <p class="fine-print">Market sentiment from recent news can nudge the opening pop. After listing, the stock updates each month.</p>
      <button type="button" class="btn btn-primary btn-small" id="btn-file-ipo">File IPO</button>
    </div>`;
  } else if (isPublicCompany(state) && !state.flags?.cashedOut) {
    const pm = state.publicMarket ?? {};
    const stake = founderStakeValue(state);
    block = `<div class="finance-action ipo-action">
      <p><strong>${escapeHtml(pm.ticker ?? '—')}</strong> · ${formatMoney(pm.sharePrice ?? 0)}/share</p>
      <p class="fine-print">IPO ${formatMoney(pm.ipoPrice ?? 0)} · Founder stake ≈ ${formatMoney(stake)} · ${pm.monthsPublic ?? 0} month(s) public</p>
      ${
        pm.pressHeadline
          ? `<blockquote class="ipo-press"><strong>${escapeHtml(pm.pressHeadline)}</strong><br>${escapeHtml(pm.pressDek || '')}</blockquote>`
          : ''
      }
      <button type="button" class="btn btn-primary btn-small" id="btn-cash-out">Step down &amp; cash out</button>
    </div>`;
  } else if (state.flags?.cashedOut) {
    block = `<p class="fine-print">You already cashed out — load a new run from the main menu.</p>`;
  } else if (state.flags?.seedRoundClosed && !state.flags?.ipoUnlocked) {
    block = `<p class="fine-print">Reach ${formatMoney(1_000_000_000)} lifetime revenue to unlock the IPO window.</p>`;
  }

  mount.innerHTML = block;
}
