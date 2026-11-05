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
  ceoPersonalBankBalance,
  personalExpenseBand,
  scheduledPersonalExpense,
  typicalPersonalExpenseMonthly,
  personalBankRunway,
  ceoPersonalCashComp,
  ceoNetWorth
} from './CeoEconomics.js';
import {
  CEO_HOME_TIERS,
  CEO_LIFESTYLE_PURCHASES,
  ceoHousingSummary,
  standardMortgagePayment
} from './CeoLifestyle.js';
import { isPublicCompany, canSellFounderStock } from './IPO.js';
import { formatCalendarStamp } from './GameCalendar.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ceoStatCard(label, value, { hero = false, tone = null } = {}) {
  const classes = ['finance-stat-card'];
  if (hero) classes.push('finance-stat-card--hero');
  if (tone === 'pos') classes.push('finance-stat-card--pos');
  if (tone === 'neg') classes.push('finance-stat-card--neg');
  return `<div class="${classes.join(' ')}"><span class="finance-stat-label">${escapeHtml(label)}</span><span class="finance-stat-value">${value}</span></div>`;
}

export { setCeoSalaryAnnual, takeOwnerDraw };

function renderWealthBar(mix) {
  if (mix.total <= 0) {
    return '<p class="fine-print">Net worth fills in as personal cash and equity grow.</p>';
  }
  const homeSeg =
    mix.home > 0
      ? `<div class="ceo-wealth-seg ceo-wealth-home" style="width:${mix.homePct}%"></div>`
      : '';
  const homeLegend =
    mix.home > 0
      ? `<li><span class="ceo-dot ceo-dot-home"></span> Home equity ${formatMoney(mix.home)} (${mix.homePct}%)</li>`
      : '';
  return `<div class="ceo-wealth-bar" role="img" aria-label="Wealth mix">
    <div class="ceo-wealth-seg ceo-wealth-equity" style="width:${mix.equityPct}%"></div>
    <div class="ceo-wealth-seg ceo-wealth-cash" style="width:${mix.cashPct}%"></div>
    ${homeSeg}
  </div>
  <ul class="ceo-wealth-legend instrument-list">
    <li><span class="ceo-dot ceo-dot-equity"></span> Equity ${formatMoney(mix.equity)} (${mix.equityPct}%)</li>
    <li><span class="ceo-dot ceo-dot-cash"></span> Personal bank ${formatMoney(mix.cash)} (${mix.cashPct}%)</li>
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

export function renderCeoPanel(container, state) {
  if (!container) return;
  const name = ceoDisplayName(state);
  const annual = state.ceo?.salaryAnnual ?? 0;
  const monthly = ceoSalaryMonthly(state);
  const { pct, equity, salary, draws, bonuses, stockSales, bank, net, publicCo } =
    renderCeoCompBreakdown(state);
  const canSellStock = canSellFounderStock(state);
  const equityLabel = publicCo ? 'Founder stake (public)' : 'Founder stake (@ valuation)';
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
  const bankLow = bank < scheduled.total * 0.75;

  const presetBtns = band.presets
    .map(
      (p) =>
        `<button type="button" class="btn btn-ghost btn-small finance-chip-btn${annual === p.annual ? ' active' : ''}" data-ceo-salary-preset="${p.annual}" ${disabled}>${escapeHtml(p.label)}</button>`
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

  const salaryChanges = (state.ceo?.salaryChangeLog ?? [])
    .slice(0, 4)
    .map(
      (c) =>
        `<li>${formatMoney(c.prior)}/yr → ${formatMoney(c.annual)}/yr · ${escapeHtml(c.year ? formatCalendarStamp(c.year, c.month) : '—')}</li>`
    )
    .join('');

  const lastDebitBlock = lastExpense?.breakdown?.length
    ? `<details class="ceo-debit-history"><summary>Last month debited ${formatMoney(lastExpense.total)}</summary>${renderDebitBreakdown(lastExpense.breakdown)}</details>`
    : '';

  const bankAlert = bankLow
    ? `<p class="finance-alert finance-alert--tax" role="status"><strong>Low personal runway</strong> — ${escapeHtml(personalRunway.label)} at ~${formatMoney(typicalBurn)}/mo spend. Raise salary or draw from the company.</p>`
    : '';

  const openingLine =
    opening != null
      ? `Opened ${formatMoney(opening)} · typical spend ${formatMoney(typicalBurn)}/mo`
      : `Typical spend ${formatMoney(typicalBurn)}/mo from salary band`;

  const publicBlock =
    publicCo && !state.flags?.cashedOut
      ? `<section class="finance-section finance-card ceo-public-card">
      <div class="finance-section-head">
        <h3 class="finance-section-title">Founder stake (public)</h3>
        <span class="ceo-ticker-pill">${escapeHtml(shares.ticker ?? '—')} ${formatMoney(shares.markPx)}/sh</span>
      </div>
      <p class="ceo-stake-headline">Your block <strong>${formatMoney(shares.stakeValue)}</strong></p>
      <div class="finance-operating-grid">
        ${ceoStatCard('Your shares', shares.shares.toLocaleString('en-US'))}
        ${ceoStatCard('Ownership', `${pct}%`)}
        ${ceoStatCard('vs IPO', shares.gainSinceIpo != null ? formatMoney(shares.gainSinceIpo) : '—', { tone: shares.gainSinceIpo > 0 ? 'pos' : shares.gainSinceIpo < 0 ? 'neg' : null })}
        ${ceoStatCard('PT upside', shares.upsideAtPt != null ? formatMoney(shares.upsideAtPt) : '—')}
        ${
          shares.lastDividend > 0
            ? ceoStatCard('Last dividend', formatMoney(shares.lastDividend))
            : ''
        }
      </div>
      ${
        exitPrev
          ? `<p class="fine-print">Step-down today ≈ ${formatMoney(exitPrev.combined)} (${formatMoney(exitPrev.payout)} stock + ${formatMoney(exitPrev.liquid)} bank).</p>`
          : lockup > 0
            ? `<p class="fine-print">Paper value after lockup: ${formatMoney(shares.stakeValue)} (credits personal bank on step-down).</p>`
            : ''
      }
    </section>`
      : '';

  const sellStockBlock =
    publicCo && !state.flags?.cashedOut
      ? `<section class="finance-section finance-card">
        <h3 class="finance-section-title">Sell founder stock (secondary)</h3>
        <p class="fine-print">Market price · you stay CEO · proceeds to personal bank</p>
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
        : `<p class="fine-print finance-ceo-pointer">IPO unlocks a liquid exit; until then, salary and draws fund your personal bank. Company cash → <strong>Finance</strong>.</p>`;

  const homeCards = CEO_HOME_TIERS.map((tier) => {
    const down = Math.round(tier.cashPrice * (tier.downPct ?? 0.2));
    const principal = tier.cashPrice - down;
    const mo = standardMortgagePayment(principal, tier.mortgageApr);
    const canBuy = housing.mode === 'rent' && !disabled;
    return `<div class="finance-action people-perk-card ceo-home-card">
      <p><strong>${escapeHtml(tier.label)}</strong> — ${formatMoney(tier.cashPrice)}</p>
      <p class="fine-print">${escapeHtml(tier.blurb)}</p>
      <p class="fine-print people-perk-effects">Cash ${formatMoney(tier.cashPrice)} · mortgage ${formatMoney(down)} down · ~${formatMoney(mo)}/mo · upkeep ${formatMoney(tier.maintenanceMo)}/mo</p>
      <div class="ceo-home-actions">
        <button type="button" class="btn btn-primary btn-small" data-ceo-home-cash="${escapeHtml(tier.id)}" ${canBuy ? '' : 'disabled'}>Buy cash</button>
        <button type="button" class="btn btn-ghost btn-small" data-ceo-home-mortgage="${escapeHtml(tier.id)}" ${canBuy ? '' : 'disabled'}>Mortgage</button>
      </div>
    </div>`;
  }).join('');

  const lifestyleCards = CEO_LIFESTYLE_PURCHASES.map((item) => {
    const owned = lifestyleOwned.has(item.id);
    return `<div class="finance-action people-perk-card">
      <p><strong>${escapeHtml(item.label)}</strong> — ${formatMoney(item.cost)}${owned ? ' <span class="task-tag">Owned</span>' : ''}</p>
      <p class="fine-print">${escapeHtml(item.blurb)}</p>
      ${item.monthlyDebitBump ? `<p class="fine-print people-perk-effects">+${formatMoney(item.monthlyDebitBump)}/mo discretionary debits</p>` : ''}
      <button type="button" class="btn btn-primary btn-small" data-ceo-lifestyle="${escapeHtml(item.id)}" ${owned || disabled ? 'disabled' : ''}>Buy</button>
    </div>`;
  }).join('');

  const housingStatusLine =
    housing.mode === 'rent'
      ? 'You are renting — Housing is part of the rolled monthly debit band.'
      : housing.mode === 'mortgage'
        ? `${escapeHtml(housing.label)} · mortgage ~${formatMoney(housing.monthlyHousingDebit)}/mo in debits · balance ${formatMoney(housing.mortgageBalance)} · equity ${formatMoney(housing.equity)}`
        : `${escapeHtml(housing.label)} · upkeep ~${formatMoney(housing.monthlyHousingDebit)}/mo · equity ${formatMoney(housing.equity)}`;

  const runwaySalaryNote =
    runway.ceoMo > 0 && runway.deltaMo
      ? `<p class="fine-print finance-details-note">CEO salary adds ~${formatMoney(runway.ceoMo)}/mo company overhead (≈${runway.deltaMo} mo less runway vs $0).</p>`
      : '';

  container.innerHTML = `
    <div class="ceo-panel">
      <header class="ceo-hero">
        <p class="ceo-name-chip">${escapeHtml(name)}</p>
        <p class="panel-lede">Personal bank, salary band debits, draws, and equity. Company cash lives on Finance.</p>
      </header>

      <section class="finance-kpi-row" aria-label="Personal snapshot">
        ${ceoStatCard('Personal bank', formatMoney(bank), { hero: true })}
        ${ceoStatCard('Est. net worth', formatMoney(net))}
        ${ceoStatCard('Personal runway', escapeHtml(personalRunway.label))}
      </section>
      <p class="fine-print finance-runway-detail">${openingLine}</p>
      ${bankAlert}

      <section class="finance-section finance-card" aria-label="Wealth mix">
        <h3 class="finance-section-title">Wealth mix</h3>
        ${renderWealthBar(mix)}
      </section>

      <section class="finance-section finance-card ceo-debit-panel" aria-label="Personal debits">
        <div class="finance-section-head">
          <h3 class="finance-section-title">Personal debits</h3>
          <span class="fine-print">Auto · not editable</span>
        </div>
        <p class="fine-print">${escapeHtml(expenseBand.label)} · ${formatMoney(annual)}/yr salary → ${formatMoney(expenseBand.min)}–${formatMoney(expenseBand.max)}/mo band</p>
        <div class="finance-operating-grid">
          ${ceoStatCard('This month', formatMoney(scheduled.total))}
          ${ceoStatCard('Typical / mo', formatMoney(typicalBurn))}
          ${ceoStatCard('Career paid', formatMoney(careerDebits))}
          ${ceoStatCard('Company stage', escapeHtml(stageLabel(state.stage)))}
        </div>
        <details class="ceo-debit-details">
          <summary>This month’s breakdown</summary>
          ${renderDebitBreakdown(scheduled.breakdown)}
        </details>
        ${lastDebitBlock}
      </section>

      <details class="finance-details">
        <summary>Career totals &amp; company link</summary>
        <div class="finance-operating-grid finance-details-grid">
          ${ceoStatCard(equityLabel, formatMoney(equity))}
          ${ceoStatCard('Career salary', formatMoney(salary))}
          ${ceoStatCard('Owner draws', formatMoney(draws))}
          ${ceoStatCard('Bonuses', formatMoney(bonuses))}
          ${ceoStatCard('Stock sales', formatMoney(stockSales))}
          ${ceoStatCard('Ownership', `${pct}%`)}
          ${ceoStatCard('Pay plan', `${formatMoney(monthly)}/mo`)}
          ${ceoStatCard('Co. runway', escapeHtml(runway.runwayLabel))}
          ${ceoStatCard('Share price', shares.markPx > 0 ? formatMoney(shares.markPx) : '—')}
          ${ceoStatCard('Cash comp', formatMoney(ceoPersonalCashComp(state)))}
        </div>
        <p class="fine-print finance-details-note">${escapeHtml(runway.runwayDetail)}</p>
        ${runwaySalaryNote}
      </details>

      ${publicBlock}
      ${sellStockBlock}

      <section class="finance-section finance-card ceo-lifestyle-section" aria-label="Real estate and lifestyle">
        <div class="finance-section-head">
          <h3 class="finance-section-title">Real estate &amp; lifestyle</h3>
          <span class="growth-channel-badge growth-channel-badge--inline">${escapeHtml(housing.label)}</span>
        </div>
        <p class="fine-print people-benefits-lede">Spend <strong>personal bank</strong> cash on homes and toys. A mortgage replaces the rolled <strong>Housing</strong> debit with your payment; paid-off homes switch to upkeep.</p>
        <p class="fine-print">${housingStatusLine}</p>
        <div class="finance-kpi-row people-kpi-row">
          ${ceoStatCard('Home equity', formatMoney(housing.equity), { hero: housing.equity > 0 })}
          ${ceoStatCard('Est. net worth', formatMoney(ceoNetWorth(state)))}
          ${ceoStatCard('Personal bank', formatMoney(bank))}
        </div>
        <h4 class="finance-section-title">Homes</h4>
        <div class="people-perk-grid ceo-home-grid">${homeCards}</div>
        <h4 class="finance-section-title">One-time splurges</h4>
        <div class="people-perk-grid">${lifestyleCards}</div>
      </section>

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
        <div class="finance-action finance-card">
          <p><strong>Owner draws</strong> — company cash → personal bank (max ${formatMoney(maxDraw)} today)</p>
          <div class="finance-charity-chips">
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="5000" ${disabled}>${formatMoney(5_000)}</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="10000" ${disabled}>${formatMoney(10_000)}</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="25000" ${disabled}>${formatMoney(25_000)}</button>
            <button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-owner-draw="50000" ${disabled}>${formatMoney(50_000)}</button>
          </div>
          <div class="finance-inline-form ceo-salary-row">
            <label class="visually-hidden" for="ceo-draw-input">Custom draw</label>
            <input id="ceo-draw-input" type="number" min="500" step="500" placeholder="Custom amount" ${disabled}>
            <button type="button" class="btn btn-ghost btn-small" id="btn-ceo-draw-custom" ${disabled}>Draw</button>
          </div>
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

      ${stepDownBlock}

      <p id="ceo-feedback" class="desk-feedback" hidden></p>
    </div>
  `;
}

export function showCeoFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
