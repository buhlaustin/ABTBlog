import { STAGES, formatMoney, createInitialPublicMarket } from './constants.js';
import { getEffectiveIpoGate } from './SandboxTuning.js';
import { getArr } from './Workspace.js';
import { calendarTurn } from './XC.js';
import { getFounderRow } from './CapTable.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import { buildGameSnapshot } from './GameContext.js';
import { recordCashOutflow } from './Finance.js';
import { totalSubsidiaryMrr } from './Acquisitions.js';

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
  state.publicMarket.lockupMonthsRemaining = 1;
  state.publicMarket.guidanceTone = 'inline';
  state.publicMarket.whisperRevenueTarget = whisperRevenueTarget(state);
  state.publicMarket.priorSharePrice = openPrice;
  state.publicMarket.buybackAuthorized = Math.round(valuation * 0.02);
  state.publicMarket.buybackUsedLifetime = 0;
  state.publicMarket.shortInterestPct = 4 + Math.floor(Math.random() * 6);
  refreshAnalystCoverage(state, { force: true });

  state.finance.valuation = Math.round(openPrice * shares);
  state.flags.ipoFiled = true;
  state.stage = STAGES.PUBLIC;
  state.finance.fixedCostsMonthly = 6_500;
  if (!state.meta) state.meta = {};
  state.meta.monthsAtIpo = calendarTurn(state);

  return { ok: true, ticker: state.publicMarket.ticker, openPrice, valuation: state.finance.valuation };
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

function pushPriceHistory(state, price) {
  const pm = state.publicMarket;
  pm.priceHistory = (pm.priceHistory ?? []).concat({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    price
  });
  pm.priceHistory = pm.priceHistory.slice(-36);
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
  const pct = Math.min(0.09, spend / Math.max(marketCap(state), 1) * 2.5);
  applyStockPctMove(state, pct);
  pm.shortInterestPct = Math.max(1, (pm.shortInterestPct ?? 5) - 1);
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
  for (const row of state.capTable ?? []) {
    if (row.shares) row.shares = Math.round(row.shares * (1 - dilutionPct));
  }
  applyStockPctMove(state, -0.05);
  pm.buybackAuthorized = (pm.buybackAuthorized ?? 0) + Math.round(raise * 0.15);
  return {
    ok: true,
    raise,
    summary: `Follow-on raised ${formatMoney(raise)} — stock −5%, cap table −2.5%.`
  };
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

  const burn = state.finance?.monthlyBurn ?? 0;
  const cash = state.finance?.cash ?? 0;
  const runwayStress = burn > 0 && cash / burn < 3 ? -0.04 : 0;
  const buzz = Math.min(0.03, (state.product?.buzz ?? 0) * 0.004);
  const noise = (Math.random() - 0.5) * 0.1;
  const sentiment = readNewsSentiment(state);
  const guidanceBeat = Math.min(0.06, (pm.guidanceBeatStreak ?? 0) * 0.012);
  const rivalHeat = Math.min(0.03, (state.world?.competitor?.pressure ?? 0) * 0.004);
  const conglomerate = portfolioConglomerateBonus(state);
  const shortDrag = ((pm.shortInterestPct ?? 0) / 100) * 0.015;

  let deltaPct =
    growth * 0.35 + runwayStress + buzz + noise + sentiment + guidanceBeat + conglomerate - rivalHeat - shortDrag;
  const lines = [];
  if (isEarningsMonth(state)) {
    deltaPct *= 1.55;
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
  pm.monthsPublic = (pm.monthsPublic ?? 0) + 1;
  pushPriceHistory(state, next);
  pm.whisperRevenueTarget = whisperRevenueTarget(state);
  refreshAnalystCoverage(state);

  lines.unshift(
    `Stock (${pm.ticker}) ${deltaPct >= 0 ? '+' : ''}${(deltaPct * 100).toFixed(1)}% → ${formatMoney(next)}/share.`
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
  const pts = (history ?? []).slice(-12);
  if (pts.length < 2) return '';
  const prices = pts.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(max - min, 0.01);
  const w = 220;
  const h = 48;
  const coords = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((p - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return `<svg class="stock-sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${coords}" /></svg>`;
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
  const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;
  return Boolean(
    isPublicCompany(state) &&
      !state.flags?.cashedOut &&
      !state.flags?.gameOver &&
      lockup <= 0
  );
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
      <p class="fine-print">Market sentiment from recent news can nudge the opening pop. After listing, the stock updates each month.</p>
      <button type="button" class="btn btn-primary btn-small" id="btn-file-ipo">File IPO</button>
    </div>`;
  } else if (isPublicCompany(state) && !state.flags?.cashedOut) {
    if (!state.publicMarket?.analystRating) refreshAnalystCoverage(state);
    const pm = state.publicMarket ?? {};
    const stake = founderStakeValue(state);
    const cap = marketCap(state);
    const tone = pm.guidanceTone ?? 'inline';
    const earningsSoon = (pm.monthsPublic ?? 0) % 3 === 2;
    block = `<div class="finance-action ipo-action stock-panel">
      <p class="stock-headline"><strong>${escapeHtml(pm.ticker ?? '—')}</strong> · ${formatMoney(pm.sharePrice ?? 0)}/share · Mkt cap ${formatMoney(cap)}</p>
      ${renderStockSparkline(pm.priceHistory)}
      <div class="summary-grid stock-stats">
        <div><span class="stat-label">IPO</span><span class="stat-value">${formatMoney(pm.ipoPrice ?? 0)}</span></div>
        <div><span class="stat-label">Analyst</span><span class="stat-value">${escapeHtml(pm.analystRating ?? '—')} · ${formatMoney(pm.analystTarget ?? 0)} PT</span></div>
        <div><span class="stat-label">Whisper</span><span class="stat-value">${formatMoney(pm.whisperRevenueTarget ?? 0)}/mo</span></div>
        <div><span class="stat-label">Beat streak</span><span class="stat-value">${pm.guidanceBeatStreak ?? 0}</span></div>
        <div><span class="stat-label">Short interest</span><span class="stat-value">${pm.shortInterestPct ?? 0}%</span></div>
        <div><span class="stat-label">Founder stake</span><span class="stat-value">${formatMoney(stake)}</span></div>
      </div>
      <p class="fine-print">${pm.monthsPublic ?? 0} month(s) public${earningsSoon ? ' · earnings next month' : ''} · buyback auth ${formatMoney(pm.buybackAuthorized ?? 0)}</p>
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
      </div>
      ${
        pm.pressHeadline
          ? `<blockquote class="ipo-press"><strong>${escapeHtml(pm.pressHeadline)}</strong><br>${escapeHtml(pm.pressDek || '')}</blockquote>`
          : ''
      }
      ${
        (pm.lockupMonthsRemaining ?? 0) > 0
          ? `<p class="fine-print">Founder lockup: ${pm.lockupMonthsRemaining} month(s) remaining before cash-out.</p>`
          : `<button type="button" class="btn btn-primary btn-small" id="btn-cash-out">Step down &amp; cash out</button>`
      }
    </div>`;
  } else if (state.flags?.cashedOut) {
    block = `<p class="fine-print">You already cashed out — start a new company from the main menu.</p>`;
  } else if (state.flags?.seedRoundClosed && !state.flags?.ipoUnlocked) {
    block = `<p class="fine-print">Reach ${formatMoney(getEffectiveIpoGate(state))} ARR to unlock the IPO window.</p>`;
  }

  mount.innerHTML = block;
}
