import { formatMoney, stageLabel } from './constants.js';
import { setGameFeedback } from './GameFeedback.js';
import {
  ceoDisplayName,
  ceoSalaryMonthly,
  setCeoSalaryAnnual,
  takeOwnerDraw,
  renderCeoCompBreakdown,
  suggestedCeoSalaryBand,
  ceoSalaryBoardNote,
  wealthMix,
  ceoRunwayNote,
  founderShareStats,
  buildCompLedger,
  cashOutPreview,
  maxOwnerDrawAmount,
  ownerDrawsUnlocked,
  CEO_ARR_BONUS_PCTS,
  estimateCeoArrBonus,
  ceoArrBonusUiState,
  ceoPersonalBankBalance,
  personalExpenseBand,
  scheduledPersonalExpense,
  typicalPersonalExpenseMonthly,
  personalBankRunway,
  ceoPersonalCashComp,
  ceoNetWorth,
  ceoFinancialHealth,
  personalInvestmentBalance,
  personalInvestmentReturnRate
} from './CeoEconomics.js';
import {
  CEO_HOME_TIERS,
  getCeoLifestylePurchasesSync,
  getCeoLifestyleCategoriesSync,
  ceoHousingSummary,
  ceoLifestyleMonthlyDebit,
  ceoLifestyleOwnedDetails,
  ceoLifestyleLifetimeSpend,
  lifestylePurchaseGate,
  standardMortgagePayment,
  HOUSING_MODE,
  STACKABLE_EXCLUSIVE_GROUPS
} from './CeoLifestyle.js';
import {
  isPublicCompany,
  canSellFounderStock,
  canBuyFounderStock,
  canTakeCompanyPrivate,
  takePrivateQuote
} from './IPO.js';
import { formatCalendarStamp } from './GameCalendar.js';
import { ceoPersonalTaxDisplay } from './CeoPersonalTax.js';
import { ceoAgeDisplayLine } from './CeoProfile.js';
import { renderCeoAlumniSection, resolveCompanyAlmaMater } from './CeoAlumniGiving.js';
import {
  renderCeoBalanceSection,
  personalHappinessScore,
  personalHappinessLabel,
  personalHappinessTone
} from './CeoHappiness.js';
import {
  escapeHtml,
  panelStatCard,
  panelMetricGroup,
  panelMetricGrid,
  panelMetricStack,
  panelSnapshotSection
} from './PanelChrome.js';

export { setCeoSalaryAnnual, takeOwnerDraw };

const CEO_SECTIONS = new Set(['overview', 'wealth', 'comp', 'balance', 'lifestyle', 'alumni']);

export function setCeoSection(state, section) {
  if (!state.ceo) return;
  state.ceo.section = CEO_SECTIONS.has(section) ? section : 'overview';
}

function activeCeoSection(state) {
  const s = state.ceo?.section ?? 'overview';
  return CEO_SECTIONS.has(s) ? s : 'overview';
}

function renderWealthBar(mix) {
  if (mix.total <= 0) {
    return '<p class="fine-print">Net worth fills in as personal cash and equity grow.</p>';
  }
  const investSeg =
    mix.invest > 0
      ? `<div class="ceo-wealth-seg ceo-wealth-invest" style="width:${mix.investPct}%"></div>`
      : '';
  const homeSeg =
    mix.home > 0
      ? `<div class="ceo-wealth-seg ceo-wealth-home" style="width:${mix.homePct}%"></div>`
      : '';
  const investLegend =
    mix.invest > 0
      ? `<li><span class="ceo-dot ceo-dot-invest"></span> Portfolio ${formatMoney(mix.invest)} (${mix.investPct}%)</li>`
      : '';
  const homeLegend =
    mix.home > 0
      ? `<li><span class="ceo-dot ceo-dot-home"></span> Home equity ${formatMoney(mix.home)} (${mix.homePct}%)</li>`
      : '';
  return `<div class="ceo-wealth-bar" role="img" aria-label="Wealth mix">
    <div class="ceo-wealth-seg ceo-wealth-equity" style="width:${mix.equityPct}%"></div>
    <div class="ceo-wealth-seg ceo-wealth-cash" style="width:${mix.cashPct}%"></div>
    ${investSeg}
    ${homeSeg}
  </div>
  <ul class="ceo-wealth-legend instrument-list">
    <li><span class="ceo-dot ceo-dot-equity"></span> Equity ${formatMoney(mix.equity)} (${mix.equityPct}%)</li>
    <li><span class="ceo-dot ceo-dot-cash"></span> Personal bank ${formatMoney(mix.cash)} (${mix.cashPct}%)</li>
    ${investLegend}
    ${homeLegend}
  </ul>`;
}

function formatLedgerAmount(n) {
  const v = Math.round(Number(n) || 0);
  if (v > 0) return `+${formatMoney(v)}`;
  if (v < 0) return `−${formatMoney(Math.abs(v))}`;
  return formatMoney(0);
}

function renderDebitBreakdown(breakdown) {
  if (!breakdown?.length) return '';
  const rows = breakdown
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.label)}</td><td class="num">${formatMoney(line.amount)}</td></tr>`
    )
    .join('');
  return `<div class="table-scroll ceo-debit-table">
    <table class="data-table">
      <thead><tr><th>Category</th><th>This month</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderNetWorthHistory(history) {
  const rows = (history ?? []).slice(0, 8);
  if (!rows.length) {
    return '<p class="fine-print">Net worth history fills in after your first closed month.</p>';
  }
  const max = Math.max(...rows.map((r) => r.netWorth ?? 0), 1);
  const bars = rows
    .map((r) => {
      const w = Math.max(4, Math.round(((r.netWorth ?? 0) / max) * 100));
      const when = r.year != null ? formatCalendarStamp(r.year, r.month) : '—';
      return `<li class="ceo-nw-row"><span class="ceo-nw-when">${escapeHtml(when)}</span><span class="ceo-nw-bar" style="width:${w}%"></span><span class="ceo-nw-val">${formatMoney(r.netWorth ?? 0)}</span></li>`;
    })
    .join('');
  return `<ul class="ceo-nw-history instrument-list">${bars}</ul>`;
}

function buildCeoPanelContext(state) {
  const name = ceoDisplayName(state);
  const annual = state.ceo?.salaryAnnual ?? 0;
  const monthly = ceoSalaryMonthly(state);
  const comp = renderCeoCompBreakdown(state);
  const canSellStock = canSellFounderStock(state);
  const canBuyStock = canBuyFounderStock(state);
  const takePrivateGate = canTakeCompanyPrivate(state);
  const takePrivate = takePrivateQuote(state);
  const equityLabel = comp.publicCo ? 'Founder stake (public)' : 'Founder stake (@ valuation)';
  const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;
  const band = suggestedCeoSalaryBand(state);
  const boardNote = ceoSalaryBoardNote(state);
  const mix = wealthMix(state);
  const housing = ceoHousingSummary(state);
  const lifestyleOwned = new Set(state.ceo?.lifestyleOwned ?? []);
  const runway = ceoRunwayNote(state);
  const personalRunway = personalBankRunway(state);
  const expenseBand = personalExpenseBand(state);
  const scheduled = scheduledPersonalExpense(state);
  const typicalBurn = typicalPersonalExpenseMonthly(state);
  const lastExpense = state.ceo?.lastPersonalExpense;
  const careerDebits = state.ceo?.careerPersonalExpensesPaid ?? 0;
  const shares = founderShareStats(state);
  const ledger = buildCompLedger(state);
  const exitPrev = cashOutPreview(state);
  const maxDraw = maxOwnerDrawAmount(state);
  const disabled = state.flags?.gameOver ? 'disabled' : '';
  const opening = state.meta?.ceoOpeningBankBalance;
  const bank = comp.bank;
  const bankLow = bank < scheduled.total * 0.75;
  const givingLifetime = state.ceo?.personalGivingLifetime ?? 0;
  const netWorthHist = state.ceo?.netWorthHistory ?? [];
  const health = ceoFinancialHealth(state);
  const portfolio = personalInvestmentBalance(state);
  const investRate = personalInvestmentReturnRate(state);
  const netWorth = ceoNetWorth(state);
  const section = activeCeoSection(state);
  const personalTax = ceoPersonalTaxDisplay(state);
  const ageLine = ceoAgeDisplayLine(state);
  return {
    name,
    ageLine,
    annual,
    monthly,
    comp,
    canSellStock,
    equityLabel,
    lockup,
    band,
    boardNote,
    mix,
    housing,
    lifestyleOwned,
    runway,
    personalRunway,
    expenseBand,
    scheduled,
    typicalBurn,
    lastExpense,
    careerDebits,
    shares,
    ledger,
    exitPrev,
    maxDraw,
    disabled,
    opening,
    bank,
    bankLow,
    givingLifetime,
    netWorthHist,
    health,
    portfolio,
    investRate,
    netWorth,
    section,
    personalTax,
    state
  };
}

function renderCeoSectionHtml(ctx) {
  const { section, state } = ctx;
  if (section === 'wealth') return renderCeoWealthSection(ctx);
  if (section === 'comp') return renderCeoCompSection(ctx);
  if (section === 'lifestyle') return renderCeoLifestyleSection(ctx);
  if (section === 'balance') return renderCeoBalanceSection(state, { disabled: ctx.disabled });
  if (section === 'alumni') return renderCeoAlumniSection(state, { disabled: ctx.disabled });
  return renderCeoOverviewSection(ctx);
}

function renderCeoOverviewSection(ctx) {
  const {
    bank,
    mix,
    expenseBand,
    scheduled,
    typicalBurn,
    careerDebits,
    annual,
    lastExpense,
    bankLow,
    personalRunway,
    opening,
    runway,
    comp,
    shares,
    health,
    portfolio,
    state
  } = ctx;
  const happiness = personalHappinessScore(state);
  const happinessLabel = personalHappinessLabel(happiness);
  const happinessTone = personalHappinessTone(happiness);
  const runwaySalaryNoteInner =
    runway.ceoMo > 0 && runway.deltaMo
      ? `<p class="fine-print finance-details-note">CEO salary adds ~${formatMoney(runway.ceoMo)}/mo company overhead (≈${runway.deltaMo} mo less runway vs $0).</p>`
      : '';
  const openingLine =
    opening != null
      ? `Opened ${formatMoney(opening)} · typical spend ${formatMoney(typicalBurn)}/mo`
      : `Typical spend ${formatMoney(typicalBurn)}/mo from salary band`;
  const drawsOpen = ownerDrawsUnlocked(state);
  const compTabLabel = drawsOpen ? 'Comp &amp; draws' : 'Comp &amp; pay';
  const bankAlert = bankLow
    ? `<p class="finance-alert finance-alert--tax" role="status"><strong>Low personal runway</strong> — ${escapeHtml(personalRunway.label)} at ~${formatMoney(typicalBurn)}/mo spend. Raise CEO salary on <strong>${compTabLabel}</strong>${drawsOpen ? ' or take an owner draw' : ''}.</p>`
    : '';
  const personalTaxAlert =
    ctx.personalTax?.filingRequired && !ctx.personalTax?.taxPaid
      ? `<p class="finance-alert finance-alert--tax" role="status"><strong>April personal taxes</strong> — ${formatMoney(ctx.personalTax.liability)} on ${formatMoney(ctx.personalTax.baseIncome)} taxable income (TY ${ctx.personalTax.liabilityYear ?? '—'}; top bracket ${Math.round((ctx.personalTax.marginalRate ?? 0) * 100)}%). Pay via the mandatory desk task from your personal bank.</p>`
      : ctx.personalTax?.taxPaid && (state.calendar?.monthIndex ?? 0) === 4
        ? `<p class="finance-alert finance-alert--ok">Personal taxes filed for ${state.calendar?.year ?? ''} (career paid ${formatMoney(ctx.personalTax.careerTaxPaid)}).</p>`
        : '';
  const lastDebitBlock = lastExpense?.breakdown?.length
    ? `<details class="ceo-debit-history"><summary>Last month debited ${formatMoney(lastExpense.total)}</summary>${renderDebitBreakdown(lastExpense.breakdown)}</details>`
    : '';
  return `
    ${panelSnapshotSection(
      panelMetricGroup(
        'Personal snapshot',
        `${panelMetricGrid('4', [
          panelStatCard('Personal bank', formatMoney(bank), { hero: true }),
          panelStatCard('Est. net worth', formatMoney(ceoNetWorth(state))),
          panelStatCard('Personal happiness', `${happiness}/100`, { tone: happinessTone }),
          panelStatCard('Balance', happinessLabel, { tone: happinessTone })
        ])}${panelMetricGrid('2', [
          panelStatCard('Personal runway', escapeHtml(personalRunway.label)),
          panelStatCard('Liquidity', escapeHtml(health.label), {
            tone: health.tone === 'pos' ? 'pos' : health.tone === 'neg' ? 'neg' : null
          })
        ])}`
      ),
      { ariaLabel: 'Personal snapshot' }
    )}
    <p class="fine-print">${escapeHtml(health.detail)}${portfolio > 0 ? ` · Portfolio ${formatMoney(portfolio)}.` : ''}</p>
    <p class="fine-print finance-runway-detail">${openingLine}</p>
    ${bankAlert}
    ${personalTaxAlert}
    <section class="finance-section finance-card" aria-label="Wealth mix">
      <h3 class="finance-section-title">Wealth mix</h3>
      ${renderWealthBar(mix)}
    </section>
    <section class="finance-section finance-card ceo-debit-panel" aria-label="Personal debits">
      <div class="finance-section-head">
        <h3 class="finance-section-title">Personal debits</h3>
        <span class="fine-print">Auto · not editable</span>
      </div>
      <p class="fine-print">${escapeHtml(expenseBand.label)} · ${
        expenseBand.min === expenseBand.max
          ? `${formatMoney(expenseBand.min)}/mo fixed`
          : `${formatMoney(annual)}/yr salary → ${formatMoney(expenseBand.min)}–${formatMoney(expenseBand.max)}/mo band`
      }</p>
      ${panelMetricGrid('4', [
        panelStatCard('This month', formatMoney(scheduled.total)),
        panelStatCard('Typical / mo', formatMoney(typicalBurn)),
        panelStatCard('Career paid', formatMoney(careerDebits)),
        panelStatCard('Company stage', escapeHtml(stageLabel(state.stage)))
      ])}
      <details class="ceo-debit-details">
        <summary>This month’s breakdown</summary>
        ${renderDebitBreakdown(scheduled.breakdown)}
      </details>
      ${lastDebitBlock}
    </section>
    <section class="finance-section panel-snapshot" aria-label="Career totals and company link">
      <h3 class="finance-section-title">Career totals &amp; company link</h3>
      ${panelMetricStack(
        panelMetricGroup(
          'Cash compensation (career)',
          panelMetricGrid(drawsOpen || comp.draws > 0 ? '4' : '3', [
            panelStatCard('Career salary', formatMoney(comp.salary)),
            ...(drawsOpen || comp.draws > 0
              ? [panelStatCard('Owner draws', formatMoney(comp.draws))]
              : []),
            panelStatCard('Bonuses', formatMoney(comp.bonuses)),
            panelStatCard('Stock sales', formatMoney(comp.stockSales)),
            panelStatCard('Cash comp', formatMoney(ceoPersonalCashComp(state)))
          ])
        ),
        panelMetricGroup(
          'Equity & ownership',
          panelMetricGrid('4', [
            panelStatCard(ctx.equityLabel, formatMoney(comp.equity)),
            panelStatCard('Ownership', `${comp.pct}%`),
            panelStatCard('Share price', shares.markPx > 0 ? formatMoney(shares.markPx) : '—'),
            panelStatCard('Pay plan', `${formatMoney(ctx.monthly)}/mo`)
          ])
        ),
        panelMetricGroup(
          'Company runway',
          `${panelMetricGrid('2', [
            panelStatCard('Co. runway', escapeHtml(runway.runwayLabel)),
            panelStatCard('Runway detail', escapeHtml(runway.runwayDetail))
          ])}${runwaySalaryNoteInner}`
        )
      )}
    </section>
    <p class="fine-print finance-ceo-pointer">Work-life balance tasks → <strong>Balance</strong>. Company cash, loans, and charity → <strong>Finance</strong>. Liquid exit and secondary sales → <strong>Wealth &amp; exit</strong>.</p>
  `;
}

function renderCeoWealthSection(ctx) {
  const {
    comp,
    shares,
    exitPrev,
    lockup,
    canSellStock,
    disabled,
    givingLifetime,
    netWorthHist,
    portfolio,
    investRate,
    state
  } = ctx;
  const publicCo = comp.publicCo;
  const investRateLabel = `${(investRate * 100).toFixed(2)}%/mo est.`;
  const portfolioBlock = `<section class="finance-section finance-card">
      <div class="finance-section-head">
        <h3 class="finance-section-title">Personal portfolio</h3>
        <span class="fine-print">${investRateLabel}</span>
      </div>
      <p class="fine-print">Park cash outside your checking balance — monthly returns track public markets when listed, otherwise a money-market-style rate.</p>
      ${panelMetricGrid('3', [
        panelStatCard('Portfolio', formatMoney(portfolio), { hero: portfolio > 0 }),
        panelStatCard('Career returns', formatMoney(state.ceo?.careerInvestmentReturns ?? 0)),
        panelStatCard('Last month', formatMoney(state.ceo?.lastInvestmentReturn ?? 0), {
          tone: (state.ceo?.lastInvestmentReturn ?? 0) >= 0 ? 'pos' : 'neg'
        })
      ])}
      <p class="fine-print"><strong>To portfolio</strong> (from personal bank)</p>
      <div class="finance-charity-chips">
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-invest-deposit="5000" ${disabled}>${formatMoney(5_000)}</button>
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-invest-deposit="25000" ${disabled}>${formatMoney(25_000)}</button>
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-invest-deposit="100000" ${disabled}>${formatMoney(100_000)}</button>
      </div>
      <div class="finance-inline-form ceo-salary-row">
        <label class="visually-hidden" for="ceo-invest-deposit-input">Deposit amount</label>
        <input id="ceo-invest-deposit-input" type="number" min="1000" step="1000" placeholder="Deposit $" ${disabled}>
        <button type="button" class="btn btn-ghost btn-small" id="btn-ceo-invest-deposit" ${disabled}>Deposit</button>
      </div>
      <p class="fine-print"><strong>To personal bank</strong></p>
      <div class="finance-charity-chips">
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-invest-withdraw="5000" ${disabled || portfolio < 5000 ? 'disabled' : ''}>${formatMoney(5_000)}</button>
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-invest-withdraw="25000" ${disabled || portfolio < 25000 ? 'disabled' : ''}>${formatMoney(25_000)}</button>
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-invest-withdraw="max" ${disabled || portfolio < 500 ? 'disabled' : ''}>All</button>
      </div>
    </section>`;
  const publicBlock =
    publicCo && !state.flags?.cashedOut
      ? `<section class="finance-section finance-card ceo-public-card">
      <div class="finance-section-head">
        <h3 class="finance-section-title">Founder stake (public)</h3>
        <span class="ceo-ticker-pill">${escapeHtml(shares.ticker ?? '—')} ${formatMoney(shares.markPx)}/sh</span>
      </div>
      <p class="ceo-stake-headline">Paper <strong>${formatMoney(shares.stakeValue)}</strong>${
        shares.liquidationValue < shares.stakeValue * 0.98
          ? ` · est. cash-out <strong>${formatMoney(shares.liquidationValue)}</strong> after float depth`
          : ''
      }</p>
      ${panelMetricGrid('3', [
        panelStatCard('Your shares', shares.shares.toLocaleString('en-US')),
        panelStatCard('Ownership', `${comp.pct}%`),
        panelStatCard('vs IPO', shares.gainSinceIpo != null ? formatMoney(shares.gainSinceIpo) : '—', {
          tone: shares.gainSinceIpo > 0 ? 'pos' : shares.gainSinceIpo < 0 ? 'neg' : null
        }),
        panelStatCard('PT upside', shares.upsideAtPt != null ? formatMoney(shares.upsideAtPt) : '—'),
        shares.lastDividend > 0 ? panelStatCard('Last dividend', formatMoney(shares.lastDividend)) : ''
      ])}
      ${
        exitPrev
          ? `<p class="fine-print">Step-down today ≈ ${formatMoney(exitPrev.combined)} (${formatMoney(exitPrev.payout)} after liquidity, ${formatMoney(exitPrev.paperStake ?? exitPrev.payout)} on tape + ${formatMoney(exitPrev.liquid)} bank).</p>`
          : lockup > 0
            ? `<p class="fine-print">Paper value after lockup: ${formatMoney(shares.stakeValue)} (credits personal bank on step-down).</p>`
            : ''
      }
    </section>`
      : !publicCo
        ? `<section class="finance-section finance-card"><p class="fine-print">Pre-IPO wealth is mostly <strong>paper equity</strong> at the last valuation mark. IPO unlocks secondary sales and step-down exit.</p>
        ${panelMetricGrid('3', [
          panelStatCard('Founder stake', formatMoney(comp.equity), { hero: true }),
          panelStatCard('Ownership', `${comp.pct}%`),
          panelStatCard('Implied $/sh', shares.markPx > 0 ? formatMoney(shares.markPx) : '—')
        ])}</section>`
        : '';

  const sellStockBlock =
    publicCo && !state.flags?.cashedOut
      ? `<section class="finance-section finance-card">
        <h3 class="finance-section-title">Sell founder stock (secondary)</h3>
        <p class="fine-print">Last trade minus liquidity + sale costs · you stay CEO · net proceeds to personal bank</p>
        ${
          lockup > 0
            ? `<p class="fine-print">Lockup: ${lockup} month(s) remaining.</p>`
            : `<div class="finance-charity-chips">
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-sell-founder-pct="5" ${canSellStock ? '' : disabled}>5%</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-sell-founder-pct="10" ${canSellStock ? '' : disabled}>10%</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-sell-founder-pct="25" ${canSellStock ? '' : disabled}>25%</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-sell-founder-pct="50" ${canSellStock ? '' : disabled}>50%</button>
          </div>
          <div class="finance-inline-form ceo-salary-row">
            <label class="visually-hidden" for="ceo-sell-pct-input">Percent of founder shares</label>
            <input id="ceo-sell-pct-input" type="number" min="1" max="99" step="1" placeholder="Custom %" ${canSellStock ? '' : disabled}>
            <button type="button" class="btn btn-ghost btn-small" id="btn-sell-founder-custom" ${canSellStock ? '' : disabled}>Sell %</button>
          </div>`
        }
      </section>`
      : '';

  const buyStockBlock =
    publicCo && !state.flags?.cashedOut
      ? `<section class="finance-section finance-card">
        <h3 class="finance-section-title">Buy your company’s stock (open market)</h3>
        <p class="fine-print">Uses personal bank · slippage + fees vs last trade · shares move from public float to your founder block</p>
        ${
          lockup > 0
            ? `<p class="fine-print">Lockup: ${lockup} month(s) remaining.</p>`
            : `<div class="finance-charity-chips">
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-buy-founder-pct="2" ${canBuyStock ? '' : disabled}>2% float</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-buy-founder-pct="5" ${canBuyStock ? '' : disabled}>5%</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-buy-founder-pct="10" ${canBuyStock ? '' : disabled}>10%</button>
          </div>
          <div class="finance-inline-form ceo-salary-row">
            <label class="visually-hidden" for="ceo-buy-pct-input">Percent of float</label>
            <input id="ceo-buy-pct-input" type="number" min="1" max="50" step="1" placeholder="% of float" ${canBuyStock ? '' : disabled}>
            <button type="button" class="btn btn-ghost btn-small" id="btn-buy-founder-custom" ${canBuyStock ? '' : disabled}>Buy %</button>
          </div>
          ${
            takePrivate
              ? `<p class="fine-print">Go-private tender (≥50% ownership): ~${formatMoney(takePrivate.totalCost)} for ${takePrivate.floatShares.toLocaleString('en-US')} remaining float shares.</p>
          <button type="button" class="btn btn-primary btn-small" id="btn-take-private" ${takePrivateGate.ok ? '' : disabled} title="${escapeHtml(takePrivateGate.reason ?? '')}">Take company private</button>
          ${!takePrivateGate.ok && takePrivateGate.reason ? `<p class="fine-print">${escapeHtml(takePrivateGate.reason)}</p>` : ''}`
              : ''
          }`
        }
      </section>`
      : state.flags?.takenPrivate
        ? `<section class="finance-section finance-card"><p class="fine-print"><strong>Company is private again</strong> — you delisted after buying out the float. No public tape; subsidiary M&amp;A and operations continue.</p></section>`
        : '';

  const stepDownBlock =
    publicCo && !state.flags?.cashedOut
      ? `<section class="finance-section finance-card ceo-step-down">
        <h3 class="finance-section-title">Step down &amp; exit</h3>
        <p class="fine-print">Sell remaining founder shares; proceeds to personal bank and end the run.</p>
        ${
          lockup > 0
            ? `<p class="fine-print">Lockup: ${lockup} month(s) — manage the stock on Finance until exit unlocks.</p>`
            : `<button type="button" class="btn btn-primary btn-small" id="btn-cash-out">Step down &amp; cash out</button>`
        }
      </section>`
      : state.flags?.cashedOut
        ? `<p class="fine-print finance-ceo-pointer">Run ended — start a new company from the main menu.</p>`
        : '';

  return `
    ${publicBlock}
    ${portfolioBlock}
    <section class="finance-section finance-card">
      <h3 class="finance-section-title">Net worth trend</h3>
      <p class="fine-print">Snapshot after each month’s personal debits (cash, portfolio, equity, home equity).</p>
      ${renderNetWorthHistory(netWorthHist)}
    </section>
    <section class="finance-section finance-card finance-charity">
      <h3 class="finance-section-title">Personal philanthropy</h3>
      ${panelMetricGrid('single', [panelStatCard('Lifetime donated', formatMoney(givingLifetime))])}
      <p class="fine-print">Give from your <strong>personal bank</strong> — separate from company charity on Finance (gifts are not modeled as deductions).</p>
      <div class="finance-charity-chips">
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-personal-give="2500" ${disabled}>${formatMoney(2_500)}</button>
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-personal-give="10000" ${disabled}>${formatMoney(10_000)}</button>
        <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-personal-give="50000" ${disabled}>${formatMoney(50_000)}</button>
      </div>
      <div class="finance-inline-form ceo-salary-row">
        <label class="visually-hidden" for="ceo-personal-give-input">Custom gift</label>
        <input id="ceo-personal-give-input" type="number" min="500" step="500" placeholder="Custom amount" ${disabled}>
        <button type="button" class="btn btn-ghost btn-small" id="btn-ceo-personal-give-custom" ${disabled}>Give</button>
      </div>
    </section>
    ${sellStockBlock}
    ${buyStockBlock}
    ${stepDownBlock}
  `;
}

function renderCeoCompSection(ctx) {
  const { band, boardNote, annual, disabled, maxDraw, ledger, state } = ctx;
  const drawsOpen = ownerDrawsUnlocked(state);
  const arrBonus = ceoArrBonusUiState(state);
  const arrBonusBtns = CEO_ARR_BONUS_PCTS.map((pct) => {
    const est = estimateCeoArrBonus(state, pct);
    const gateCash = (state.finance?.cash ?? 0) >= est && est >= 500;
    const btnDisabled =
      disabled || !arrBonus.cooldown.eligible || arrBonus.priorYearArr < 1 || !gateCash
        ? ' disabled'
        : '';
    return `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-arr-bonus="${pct}"${btnDisabled}>${pct}% · ${formatMoney(est)}</button>`;
  }).join('');
  const arrBonusNote =
    arrBonus.priorYearArr < 1
      ? 'Available after your first full fiscal year closes (December year-end).'
      : arrBonus.cooldown.eligible
        ? `Prior-year revenue base ${formatMoney(arrBonus.priorYearArr)} — once every 12 months.`
        : `On cooldown — ${arrBonus.cooldown.monthsUntil} month(s) until the next ARR bonus${arrBonus.lastPaidLabel ? ` (last paid ${arrBonus.lastPaidLabel})` : ''}.`;
  const presetBtns = band.presets
    .map(
      (p) =>
        `<button type="button" class="btn btn-ghost btn-small finance-chip-btn${annual === p.annual ? ' active' : ''}" data-ceo-salary-preset="${p.annual}" ${disabled}>${escapeHtml(p.label)}</button>`
    )
    .join('');
  const salaryChanges = (state.ceo?.salaryChangeLog ?? [])
    .slice(0, 4)
    .map(
      (c) =>
        `<li>${formatMoney(c.prior)}/yr → ${formatMoney(c.annual)}/yr · ${escapeHtml(c.year ? formatCalendarStamp(c.year, c.month) : '—')}</li>`
    )
    .join('');
  const ledgerRows = ledger.length
    ? ledger
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.label)}</td><td>${formatLedgerAmount(r.amount)}</td><td>${escapeHtml(r.year ? formatCalendarStamp(r.year, r.month) : '—')}${r.balanceAfter != null ? `<br><span class="fine-print">Bal ${formatMoney(r.balanceAfter)}</span>` : ''}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="3">No bank activity yet.</td></tr>';

  return `
    <section class="finance-section ceo-comp-stack">
      <h3 class="finance-section-title">Compensation</h3>
      <div class="finance-action finance-card">
        <p><strong>CEO salary</strong> — ${escapeHtml(band.label)} · typical ${formatMoney(band.typical)}/yr</p>
        <p class="fine-print">${escapeHtml(band.note)} Salary sets your personal debit band; paid at month close.</p>
        ${boardNote ? `<p class="finance-alert finance-alert--tax">${escapeHtml(boardNote)}</p>` : ''}
        <div class="finance-charity-chips">${presetBtns}</div>
        <div class="finance-inline-form ceo-salary-row">
          <label class="visually-hidden" for="ceo-salary-input">Annual salary</label>
          <input id="ceo-salary-input" type="number" min="0" step="1000" value="${annual}" ${disabled}>
          <button type="button" class="btn btn-small" id="btn-save-ceo-salary" ${disabled}>Save salary</button>
        </div>
        ${salaryChanges ? `<details class="ceo-salary-history"><summary>Salary history</summary><ul class="instrument-list">${salaryChanges}</ul></details>` : ''}
      </div>
      ${
        drawsOpen
          ? `<div class="finance-action finance-card">
        <p><strong>Owner draws</strong> — company cash → personal bank (max ${formatMoney(maxDraw)} today)</p>
        <p class="fine-print">Bootstrap only — owner draws lock when seed closes; use salary and ARR bonuses afterward.</p>
        <div class="finance-charity-chips">
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="5000" ${disabled}>${formatMoney(5_000)}</button>
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="10000" ${disabled}>${formatMoney(10_000)}</button>
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="25000" ${disabled}>${formatMoney(25_000)}</button>
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="50000" ${disabled}>${formatMoney(50_000)}</button>
        </div>
        <p class="fine-print">Or draw a % of available company cash:</p>
        <div class="finance-charity-chips">
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw-pct="0.1" ${disabled}>10%</button>
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw-pct="0.25" ${disabled}>25%</button>
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw-pct="0.5" ${disabled}>50%</button>
          <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw-pct="1" ${disabled ? 'disabled' : maxDraw >= 500 ? '' : 'disabled'}>Max</button>
        </div>
        <div class="finance-inline-form ceo-salary-row">
          <label class="visually-hidden" for="ceo-draw-input">Custom draw</label>
          <input id="ceo-draw-input" type="number" min="500" step="500" placeholder="Custom amount" ${disabled}>
          <button type="button" class="btn btn-ghost btn-small" id="btn-ceo-draw-custom" ${disabled}>Draw</button>
        </div>
      </div>`
          : ''
      }
      <div class="finance-action finance-card">
        <p><strong>CEO ARR bonus</strong> — % of prior fiscal-year revenue (company cash → personal bank)</p>
        <p class="fine-print">${escapeHtml(arrBonusNote)}</p>
        <div class="finance-charity-chips">${arrBonusBtns}</div>
      </div>
    </section>
    <section class="finance-section finance-section--cap">
      <h3 class="finance-section-title">Personal bank ledger</h3>
      <div class="table-scroll finance-cap-scroll">
        <table class="data-table">
          <thead><tr><th>Event</th><th>Amount</th><th>When</th></tr></thead>
          <tbody>${ledgerRows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderCeoLifestyleSection(ctx) {
  const { housing, lifestyleOwned, bank, disabled, netWorth, state } = ctx;
  const currentTierId = housing.mode !== HOUSING_MODE.RENT ? housing.tierId : null;
  const homeCards = CEO_HOME_TIERS.map((tier) => {
    const down = Math.round(tier.cashPrice * (tier.downPct ?? 0.2));
    const principal = tier.cashPrice - down;
    const mo = standardMortgagePayment(principal, tier.mortgageApr);
    const isCurrent = currentTierId === tier.id;
    const gated = tier.minNetWorth && netWorth < tier.minNetWorth;
    const canBuy = housing.mode === HOUSING_MODE.RENT && !disabled && !gated;
    return `<div class="finance-action people-perk-card ceo-home-card${isCurrent ? ' ceo-home-card--current' : ''}">
      <p><strong>${escapeHtml(tier.label)}</strong>${isCurrent ? ' <span class="task-tag">Current</span>' : ''} — ${formatMoney(tier.cashPrice)}</p>
      <p class="fine-print">${escapeHtml(tier.blurb)}</p>
      ${gated ? `<p class="fine-print people-perk-effects">Unlock ≈ ${formatMoney(tier.minNetWorth)} net worth</p>` : ''}
      <p class="fine-print people-perk-effects">Cash ${formatMoney(tier.cashPrice)} · mortgage ${formatMoney(down)} down · ~${formatMoney(mo)}/mo · upkeep ${formatMoney(tier.maintenanceMo)}/mo</p>
      <div class="ceo-home-actions">
        <button type="button" class="btn btn-primary btn-small" data-ceo-home-cash="${escapeHtml(tier.id)}" ${canBuy ? '' : 'disabled'}>Buy cash</button>
        <button type="button" class="btn btn-ghost btn-small" data-ceo-home-mortgage="${escapeHtml(tier.id)}" ${canBuy ? '' : 'disabled'}>Mortgage</button>
      </div>
    </div>`;
  }).join('');

  const renderLifestyleCard = (item) => {
    const owned = lifestyleOwned.has(item.id);
    const gate = lifestylePurchaseGate(state, item, { ok: !item.minNetWorth || netWorth >= item.minNetWorth });
    const canBuy = gate.ok && !disabled;
    const tags = [
      item.exclusiveGroup && STACKABLE_EXCLUSIVE_GROUPS.has(item.exclusiveGroup)
        ? 'Garage / club collectible'
        : item.exclusiveGroup
          ? 'One per category'
          : null,
      item.resalePct ? `Resell ~${Math.round(item.resalePct * 100)}%` : null,
      item.buzzOnPurchase ? `+${item.buzzOnPurchase} buzz` : null,
      item.sentimentOnPurchase ? `+${item.sentimentOnPurchase} sentiment` : null,
      item.minHomeEquity ? `≥${formatMoney(item.minHomeEquity)} home equity` : null
    ]
      .filter(Boolean)
      .join(' · ');
    const sellBtn =
      owned && item.resalePct
        ? `<button type="button" class="btn btn-ghost btn-small" data-ceo-lifestyle-sell="${escapeHtml(item.id)}" ${disabled}>Sell</button>`
        : '';
    return `<div class="finance-action people-perk-card ceo-lifestyle-card">
      <p><strong>${escapeHtml(item.label)}</strong> — ${formatMoney(item.cost)}${owned ? ' <span class="task-tag">Owned</span>' : ''}</p>
      <p class="fine-print">${escapeHtml(item.blurb)}</p>
      ${tags ? `<p class="fine-print ceo-lifestyle-tags">${escapeHtml(tags)}</p>` : ''}
      ${item.minNetWorth ? `<p class="fine-print people-perk-effects">≈ ${formatMoney(item.minNetWorth)} net worth</p>` : ''}
      ${item.monthlyDebitBump ? `<p class="fine-print people-perk-effects">+${formatMoney(item.monthlyDebitBump)}/mo discretionary debits</p>` : ''}
      <div class="ceo-lifestyle-card-actions">
        <button type="button" class="btn btn-primary btn-small" data-ceo-lifestyle="${escapeHtml(item.id)}" ${owned || !canBuy ? 'disabled' : ''}${!canBuy && !owned ? ` title="${escapeHtml(gate.reason ?? '')}"` : ''}>Buy</button>
        ${sellBtn}
      </div>
    </div>`;
  };

  const lifestyleByCategory = getCeoLifestyleCategoriesSync().map((cat) => {
    const items = getCeoLifestylePurchasesSync().filter((p) => (p.category ?? 'other') === cat.id);
    if (!items.length) return '';
    return `<div class="ceo-lifestyle-category">
      <h5 class="finance-section-title">${escapeHtml(cat.label)}</h5>
      <div class="people-perk-grid">${items.map(renderLifestyleCard).join('')}</div>
    </div>`;
  }).join('');

  const ownedDetails = ceoLifestyleOwnedDetails(state);
  const lifestyleMo = ceoLifestyleMonthlyDebit(state);
  const lifestyleSpend = ceoLifestyleLifetimeSpend(state);
  const ownedList =
    ownedDetails.length > 0
      ? `<ul class="instrument-list fine-print">${ownedDetails
          .map((p) => {
            const sell =
              p.resalePct && !disabled
                ? ` <button type="button" class="btn btn-ghost btn-small" data-ceo-lifestyle-sell="${escapeHtml(p.id)}">Sell</button>`
                : '';
            return `<li><strong>${escapeHtml(p.label)}</strong>${p.monthlyDebitBump ? ` · +${formatMoney(p.monthlyDebitBump)}/mo` : ''}${sell}</li>`;
          })
          .join('')}</ul>`
      : '<p class="fine-print">No splurges yet — e-bike, standing desk, or premium gym are affordable early; build a full garage and stack club memberships as you scale.</p>';

  const housingStatusLine =
    housing.mode === HOUSING_MODE.RENT
      ? 'You are renting — Housing is part of the rolled monthly debit band.'
      : housing.mode === HOUSING_MODE.MORTGAGE
        ? `${escapeHtml(housing.label)} · mortgage ~${formatMoney(housing.monthlyHousingDebit)}/mo in debits · balance ${formatMoney(housing.mortgageBalance)} · equity ${formatMoney(housing.equity)}`
        : `${escapeHtml(housing.label)} · upkeep ~${formatMoney(housing.monthlyHousingDebit)}/mo · equity ${formatMoney(housing.equity)}`;

  const sellHomeBlock =
    housing.mode !== HOUSING_MODE.RENT
      ? `<div class="ceo-home-sell">
          <p class="fine-print">Upgrade by selling — you receive ~94% of home equity after sale costs, then you can buy up.</p>
          <button type="button" class="btn btn-ghost btn-small" id="btn-sell-ceo-home" ${disabled}>Sell home (${formatMoney(housing.equity)} equity)</button>
        </div>`
      : '';

  const mortgageBlock =
    housing.mode === HOUSING_MODE.MORTGAGE && (housing.mortgageBalance ?? 0) > 0
      ? `<div class="ceo-mortgage-panel finance-card">
          <h4 class="finance-section-title">Mortgage prepay</h4>
          <p class="fine-print">Balance ${formatMoney(housing.mortgageBalance)} · ${housing.mortgageProgress}% paid · payment ~${formatMoney(housing.monthlyHousingDebit)}/mo in debits</p>
          <div class="ceo-mortgage-progress" role="progressbar" aria-valuenow="${housing.mortgageProgress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${housing.mortgageProgress}%"></span></div>
          <div class="finance-charity-chips">
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-mortgage-prepay="10000" ${disabled}>${formatMoney(10_000)}</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-ceo-mortgage-prepay="50000" ${disabled}>${formatMoney(50_000)}</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" id="btn-payoff-ceo-mortgage" ${disabled}>Pay off (${formatMoney(housing.mortgageBalance)})</button>
          </div>
          <div class="finance-inline-form ceo-salary-row">
            <label class="visually-hidden" for="ceo-mortgage-prepay-input">Prepay amount</label>
            <input id="ceo-mortgage-prepay-input" type="number" min="500" step="500" placeholder="Custom prepay" ${disabled}>
            <button type="button" class="btn btn-ghost btn-small" id="btn-ceo-mortgage-prepay-custom" ${disabled}>Prepay</button>
          </div>
        </div>`
      : '';

  return `
    <section class="finance-section finance-card ceo-lifestyle-section" aria-label="Real estate and lifestyle">
      <div class="finance-section-head">
        <h3 class="finance-section-title">Real estate &amp; lifestyle</h3>
        <span class="growth-channel-badge growth-channel-badge--inline">${escapeHtml(housing.label)}</span>
      </div>
      <p class="fine-print people-benefits-lede">Spend <strong>personal bank</strong> cash (${formatMoney(bank)}) on homes and splurges. Mortgages replace the rolled <strong>Housing</strong> debit; paid-off homes switch to upkeep.</p>
      <p class="fine-print">${housingStatusLine}</p>
      ${sellHomeBlock}
      ${mortgageBlock}
      ${panelMetricGroup(
        'Lifestyle snapshot',
        panelMetricGrid('5', [
          panelStatCard('Home equity', formatMoney(housing.equity), { hero: housing.equity > 0 }),
          panelStatCard('Est. net worth', formatMoney(netWorth)),
          panelStatCard('Splurges owned', String(lifestyleOwned.size)),
          panelStatCard('Lifetime splurge spend', lifestyleSpend > 0 ? formatMoney(lifestyleSpend) : '—'),
          panelStatCard('Lifestyle debits', lifestyleMo > 0 ? `${formatMoney(lifestyleMo)}/mo` : '—', {
            hero: lifestyleMo > 0
          })
        ])
      )}
      <div class="ceo-lifestyle-owned">${ownedList}</div>
      <h4 class="finance-section-title">Homes</h4>
      <div class="people-perk-grid ceo-home-grid">${homeCards}</div>
      <h4 class="finance-section-title">Splurge catalog</h4>
      <p class="fine-print">${getCeoLifestylePurchasesSync().length} purchases across ${getCeoLifestyleCategoriesSync().length} categories — collect every vehicle and club tier (net worth and cash gates still apply), resell on select items, optional buzz/sentiment on flagship buys.</p>
      ${lifestyleByCategory}
    </section>
  `;
}

export function renderCeoPanel(container, state) {
  if (!container) return;
  if (!state.ceo) return;
  const ctx = buildCeoPanelContext(state);
  const drawsOpen = ownerDrawsUnlocked(state);
  const compTabLabel = drawsOpen ? 'Comp & draws' : 'Comp & pay';
  const panelLede = drawsOpen
    ? 'Personal bank, salary band debits, owner draws, and equity. Company cash lives on Finance.'
    : 'Personal bank, salary band debits, and equity. Company cash lives on Finance.';
  const tab = (id, label) =>
    `<button type="button" class="${ctx.section === id ? 'active' : ''}" data-ceo-tab="${id}">${label}</button>`;

  container.innerHTML = `
    <div class="ceo-panel people-panel finance-panel">
      <header class="ceo-hero">
        <p class="ceo-name-chip">${escapeHtml(ctx.name)}</p>
        ${ctx.ageLine ? `<p class="ceo-age-line fine-print">${escapeHtml(ctx.ageLine)}</p>` : ''}
        ${
          resolveCompanyAlmaMater(state)
            ? `<p class="fine-print ceo-alma-line">Alma mater: ${escapeHtml(resolveCompanyAlmaMater(state).label)}</p>`
            : ''
        }
        <p class="panel-lede">${panelLede}</p>
      </header>
      <nav class="people-subtabs ceo-subtabs" aria-label="CEO sections">
        ${tab('overview', 'Overview')}
        ${tab('wealth', 'Wealth & exit')}
        ${tab('comp', compTabLabel)}
        ${tab('balance', 'Balance')}
        ${tab('lifestyle', 'Homes & splurges')}
        ${tab('alumni', 'Alma mater')}
      </nav>
      <div id="ceo-section-mount">${renderCeoSectionHtml(ctx)}</div>
      <p id="ceo-feedback" class="desk-feedback" hidden></p>
    </div>
  `;
}

export function showCeoFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
