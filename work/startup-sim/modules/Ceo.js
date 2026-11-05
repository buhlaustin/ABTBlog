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
  maxOwnerDrawAmount
} from './CeoEconomics.js';
import { isPublicCompany } from './IPO.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export { setCeoSalaryAnnual, takeOwnerDraw };

function renderWealthBar(mix) {
  if (mix.total <= 0) {
    return '<p class="fine-print">Wealth mix fills in as you earn salary, take draws, or build equity value.</p>';
  }
  return `<div class="ceo-wealth-bar" role="img" aria-label="Wealth mix: ${mix.equityPct}% equity, ${mix.salaryPct}% salary, ${mix.drawsPct}% draws">
    <div class="ceo-wealth-seg ceo-wealth-equity" style="width:${mix.equityPct}%"></div>
    <div class="ceo-wealth-seg ceo-wealth-salary" style="width:${mix.salaryPct}%"></div>
    <div class="ceo-wealth-seg ceo-wealth-draws" style="width:${mix.drawsPct}%"></div>
  </div>
  <ul class="ceo-wealth-legend instrument-list">
    <li><span class="ceo-dot ceo-dot-equity"></span> Equity ${formatMoney(mix.equity)} (${mix.equityPct}%)</li>
    <li><span class="ceo-dot ceo-dot-salary"></span> Salary ${formatMoney(mix.salary)} (${mix.salaryPct}%)</li>
    <li><span class="ceo-dot ceo-dot-draws"></span> Draws ${formatMoney(mix.draws)} (${mix.drawsPct}%)</li>
  </ul>`;
}

export function renderCeoPanel(container, state) {
  if (!container) return;
  const name = ceoDisplayName(state);
  const annual = state.ceo?.salaryAnnual ?? 0;
  const monthly = ceoSalaryMonthly(state);
  const { pct, equity, salary, draws, liquid, net, publicCo } = renderCeoCompBreakdown(state);
  const equityLabel = publicCo ? 'Founder stake (public)' : 'Founder stake (@ valuation)';
  const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;
  const band = suggestedCeoSalaryBand(state);
  const boardNote = ceoSalaryBoardNote(state);
  const mix = wealthMix(state);
  const runway = ceoRunwayNote(state);
  const shares = founderShareStats(state);
  const ledger = buildCompLedger(state);
  const exitPrev = cashOutPreview(state);
  const maxDraw = maxOwnerDrawAmount(state);
  const disabled = state.flags?.gameOver ? 'disabled' : '';

  const presetBtns = band.presets
    .map(
      (p) =>
        `<button type="button" class="btn btn-ghost btn-small${annual === p.annual ? ' active' : ''}" data-ceo-salary-preset="${p.annual}" ${disabled}>${escapeHtml(p.label)}</button>`
    )
    .join('');

  const ledgerRows = ledger.length
    ? ledger
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.label)}</td><td>${formatMoney(r.amount)}</td><td>Y${r.year ?? '?'} M${r.month ?? '?'}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="3">No cash comp events yet.</td></tr>';

  const salaryChanges = (state.ceo?.salaryChangeLog ?? [])
    .slice(0, 4)
    .map(
      (c) =>
        `<li>${formatMoney(c.prior)}/yr → ${formatMoney(c.annual)}/yr · Y${c.year ?? '?'} M${c.month ?? '?'}</li>`
    )
    .join('');

  const publicBlock =
    publicCo && !state.flags?.cashedOut
      ? `<div class="finance-action">
      <p class="stock-headline"><strong>${escapeHtml(shares.ticker ?? '—')}</strong> · ${formatMoney(shares.markPx)}/share · your block ${formatMoney(shares.stakeValue)}</p>
      <div class="summary-grid">
        <div><span class="stat-label">Your shares</span><span class="stat-value">${(shares.shares / 1_000_000).toFixed(2)}M</span></div>
        <div><span class="stat-label">Ownership</span><span class="stat-value">${shares.pct}%</span></div>
        <div><span class="stat-label">vs IPO</span><span class="stat-value">${shares.gainSinceIpo != null ? formatMoney(shares.gainSinceIpo) : '—'}</span></div>
        <div><span class="stat-label">Analyst PT upside</span><span class="stat-value">${shares.upsideAtPt != null ? formatMoney(shares.upsideAtPt) : '—'}</span></div>
        ${
          shares.lastDividend > 0
            ? `<div><span class="stat-label">Last dividend (you)</span><span class="stat-value">${formatMoney(shares.lastDividend)}</span></div>`
            : ''
        }
      </div>
      ${
        exitPrev
          ? `<p class="fine-print">If you stepped down today: <strong>${formatMoney(exitPrev.payout)}</strong> stock + <strong>${formatMoney(exitPrev.liquid)}</strong> cash comp already taken = <strong>${formatMoney(exitPrev.combined)}</strong> personal total.</p>`
          : lockup > 0
            ? `<p class="fine-print">Paper payout after lockup at current price: <strong>${formatMoney(shares.stakeValue)}</strong>.</p>`
            : ''
      }
    </div>`
      : '';

  container.innerHTML = `
    <p class="panel-lede">${escapeHtml(name)}, ${escapeHtml(stageLabel(state.stage))} — track personal cash comp separately from company cash on Finance. Equity stays illiquid until IPO (and lockup).</p>

    <div class="capital-stack" role="region" aria-label="Estimated net worth">
      <p class="prelaunch-progress-title"><strong>Est. net worth</strong> ${formatMoney(net)}</p>
      ${renderWealthBar(mix)}
    </div>

    <div class="summary-grid">
      <div><span class="stat-label">${equityLabel}</span><span class="stat-value">${formatMoney(equity)}</span></div>
      <div><span class="stat-label">Career salary</span><span class="stat-value">${formatMoney(salary)}</span></div>
      <div><span class="stat-label">Owner draws</span><span class="stat-value">${formatMoney(draws)}</span></div>
      <div><span class="stat-label">Personal liquidity</span><span class="stat-value">${formatMoney(liquid)}</span></div>
      <div><span class="stat-label">Founder ownership</span><span class="stat-value">${pct}%</span></div>
      <div><span class="stat-label">CEO pay plan</span><span class="stat-value">${formatMoney(monthly)}/mo</span></div>
      <div><span class="stat-label">Company runway</span><span class="stat-value">${runway.runwayLabel}</span></div>
      <div><span class="stat-label">Implied share px</span><span class="stat-value">${shares.markPx > 0 ? formatMoney(shares.markPx) : '—'}</span></div>
    </div>
    ${
      runway.ceoMo > 0 && runway.deltaMo
        ? `<p class="fine-print">CEO salary adds ~${formatMoney(runway.ceoMo)}/mo to overhead (≈${runway.deltaMo} mo less runway vs $0 salary).</p>`
        : ''
    }

    ${publicBlock}

    <div class="finance-action">
      <p><strong>CEO salary</strong> — ${escapeHtml(band.label)} · typical ${formatMoney(band.typical)}/yr.</p>
      <p class="fine-print">${escapeHtml(band.note)}</p>
      ${boardNote ? `<p class="fine-print error">${escapeHtml(boardNote)}</p>` : ''}
      <div class="stock-actions">${presetBtns}</div>
      <div class="name-row ceo-salary-row">
        <label class="visually-hidden" for="ceo-salary-input">Annual salary</label>
        <input id="ceo-salary-input" type="number" min="0" max="2000000" step="1000" value="${annual}" ${disabled}>
        <button type="button" class="btn btn-small" id="btn-save-ceo-salary" ${disabled}>Save salary</button>
      </div>
      ${salaryChanges ? `<details><summary>Salary changes</summary><ul class="instrument-list">${salaryChanges}</ul></details>` : ''}
    </div>

    <div class="finance-action">
      <p><strong>Owner draws</strong> — distributions to you (max ${formatMoney(maxDraw)} from company cash today).</p>
      <div class="stock-actions">
        <button type="button" class="btn btn-small" data-owner-draw="5000" ${disabled}>Draw $5k</button>
        <button type="button" class="btn btn-small" data-owner-draw="10000" ${disabled}>Draw $10k</button>
        <button type="button" class="btn btn-small" data-owner-draw="25000" ${disabled}>Draw $25k</button>
        <button type="button" class="btn btn-small" data-owner-draw="50000" ${disabled}>Draw $50k</button>
      </div>
      <div class="name-row ceo-salary-row">
        <label class="visually-hidden" for="ceo-draw-input">Custom draw</label>
        <input id="ceo-draw-input" type="number" min="500" step="500" placeholder="Custom amount" ${disabled}>
        <button type="button" class="btn btn-small" id="btn-ceo-draw-custom" ${disabled}>Draw custom</button>
      </div>
    </div>

    <h3 class="log-head">Compensation ledger</h3>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Event</th><th>Amount</th><th>When</th></tr></thead>
        <tbody>${ledgerRows}</tbody>
      </table>
    </div>

    ${
      publicCo && !state.flags?.cashedOut
        ? `<div class="finance-action">
        <p><strong>Step down</strong> — sell founder shares at market and end the run (cash comp above is already yours).</p>
        ${
          lockup > 0
            ? `<p class="fine-print">Founder lockup: ${lockup} month(s) — stock desk on Finance until you can exit.</p>`
            : `<button type="button" class="btn btn-primary btn-small" id="btn-cash-out">Step down &amp; cash out</button>`
        }
      </div>`
        : state.flags?.cashedOut
          ? `<p class="fine-print">You already stepped down — start a new run from the main menu.</p>`
          : `<p class="fine-print">IPO unlocks a liquid exit; until then salary and draws are your only personal cash.</p>`
    }

    <p id="ceo-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showCeoFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
