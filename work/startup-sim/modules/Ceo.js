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
  recommendedPersonalBurnMonthly,
  effectivePersonalBurnMonthly,
  personalBankRunway,
  setCeoPersonalBurnMonthly,
  resetCeoPersonalBurnToRecommended,
  ceoPersonalCashComp
} from './CeoEconomics.js';
import { isPublicCompany } from './IPO.js';
import { formatCalendarStamp } from './GameCalendar.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export {
  setCeoSalaryAnnual,
  takeOwnerDraw,
  setCeoPersonalBurnMonthly,
  resetCeoPersonalBurnToRecommended
};

function renderWealthBar(mix) {
  if (mix.total <= 0) {
    return '<p class="fine-print">Net worth fills in as personal cash and equity grow.</p>';
  }
  return `<div class="ceo-wealth-bar" role="img" aria-label="Wealth mix: ${mix.equityPct}% equity, ${mix.cashPct}% personal cash">
    <div class="ceo-wealth-seg ceo-wealth-equity" style="width:${mix.equityPct}%"></div>
    <div class="ceo-wealth-seg ceo-wealth-cash" style="width:${mix.cashPct}%"></div>
  </div>
  <ul class="ceo-wealth-legend instrument-list">
    <li><span class="ceo-dot ceo-dot-equity"></span> Equity ${formatMoney(mix.equity)} (${mix.equityPct}%)</li>
    <li><span class="ceo-dot ceo-dot-cash"></span> Personal bank ${formatMoney(mix.cash)} (${mix.cashPct}%)</li>
  </ul>`;
}

function formatLedgerAmount(n) {
  const v = Math.round(Number(n) || 0);
  if (v > 0) return `+${formatMoney(v)}`;
  if (v < 0) return `−${formatMoney(Math.abs(v))}`;
  return formatMoney(0);
}

export function renderCeoPanel(container, state) {
  if (!container) return;
  const name = ceoDisplayName(state);
  const annual = state.ceo?.salaryAnnual ?? 0;
  const monthly = ceoSalaryMonthly(state);
  const { pct, equity, salary, draws, bank, net, publicCo } = renderCeoCompBreakdown(state);
  const equityLabel = publicCo ? 'Founder stake (public)' : 'Founder stake (@ valuation)';
  const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;
  const band = suggestedCeoSalaryBand(state);
  const boardNote = ceoSalaryBoardNote(state);
  const mix = wealthMix(state);
  const runway = ceoRunwayNote(state);
  const personalRunway = personalBankRunway(state);
  const recBurn = recommendedPersonalBurnMonthly(state);
  const personalBurn = effectivePersonalBurnMonthly(state);
  const burnCustom = state.ceo?.personalBurnCustom ?? false;
  const shares = founderShareStats(state);
  const ledger = buildCompLedger(state);
  const exitPrev = cashOutPreview(state);
  const maxDraw = maxOwnerDrawAmount(state);
  const disabled = state.flags?.gameOver ? 'disabled' : '';
  const opening = state.meta?.ceoOpeningBankBalance;
  const bankLow = bank < personalBurn * 0.75;

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

  const publicBlock =
    publicCo && !state.flags?.cashedOut
      ? `<div class="finance-action">
      <p class="stock-headline"><strong>${escapeHtml(shares.ticker ?? '—')}</strong> · ${formatMoney(shares.markPx)}/share · your block ${formatMoney(shares.stakeValue)}</p>
      <div class="summary-grid">
        <div><span class="stat-label">Your shares</span><span class="stat-value">${(shares.shares / 1_000_000).toFixed(2)}M</span></div>
        <div><span class="stat-label">Ownership</span><span class="stat-value">${pct}%</span></div>
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
          ? `<p class="fine-print">If you stepped down today: <strong>${formatMoney(exitPrev.payout)}</strong> stock proceeds + <strong>${formatMoney(exitPrev.liquid)}</strong> already in your bank ≈ <strong>${formatMoney(exitPrev.combined)}</strong>.</p>`
          : lockup > 0
            ? `<p class="fine-print">Paper payout after lockup: <strong>${formatMoney(shares.stakeValue)}</strong> (goes to personal bank on step-down).</p>`
            : ''
      }
    </div>`
      : '';

  container.innerHTML = `
    <p class="panel-lede">${escapeHtml(name)} — <strong>company cash</strong> is on Finance; this tab is your personal bank, salary, draws, and equity.</p>

    <div class="capital-stack ceo-bank-panel" role="region" aria-label="Personal bank">
      <p class="prelaunch-progress-title"><strong>Personal bank</strong> ${formatMoney(bank)}</p>
      <p class="fine-print">${opening != null ? `Opened this run at ${formatMoney(opening)}.` : 'Randomized opening balance for this run.'} Salary deposits and owner draws land here; living expenses debit each month close.</p>
      ${bankLow ? `<p class="fine-print error">Personal runway ${escapeHtml(personalRunway.label)} at ${formatMoney(personalBurn)}/mo — increase salary or draw from the company.</p>` : `<p class="fine-print">Personal runway ~${escapeHtml(personalRunway.label)} at ${formatMoney(personalBurn)}/mo living budget.</p>`}
    </div>

    <div class="capital-stack" role="region" aria-label="Estimated net worth">
      <p class="prelaunch-progress-title"><strong>Est. net worth</strong> ${formatMoney(net)} <span class="fine-print">(bank + equity)</span></p>
      ${renderWealthBar(mix)}
    </div>

    <div class="summary-grid">
      <div><span class="stat-label">${equityLabel}</span><span class="stat-value">${formatMoney(equity)}</span></div>
      <div><span class="stat-label">Career salary (total)</span><span class="stat-value">${formatMoney(salary)}</span></div>
      <div><span class="stat-label">Owner draws (total)</span><span class="stat-value">${formatMoney(draws)}</span></div>
      <div><span class="stat-label">Founder ownership</span><span class="stat-value">${pct}%</span></div>
      <div><span class="stat-label">CEO pay plan</span><span class="stat-value">${formatMoney(monthly)}/mo</span></div>
      <div><span class="stat-label">Living budget</span><span class="stat-value">${formatMoney(personalBurn)}/mo</span></div>
      <div><span class="stat-label">Company runway</span><span class="stat-value">${runway.runwayLabel}</span></div>
      <div><span class="stat-label">Implied share px</span><span class="stat-value">${shares.markPx > 0 ? formatMoney(shares.markPx) : '—'}</span></div>
    </div>
    ${
      runway.ceoMo > 0 && runway.deltaMo
        ? `<p class="fine-print">CEO salary adds ~${formatMoney(runway.ceoMo)}/mo to company overhead (≈${runway.deltaMo} mo less runway vs $0 salary).</p>`
        : ''
    }

    <div class="finance-action">
      <p><strong>Personal living budget</strong> — recommended ${formatMoney(recBurn)}/mo for ${escapeHtml(stageLabel(state.stage))}${burnCustom ? ' · using your custom amount' : ' · auto-tracked'}.</p>
      <p class="fine-print">Debited from your personal bank when you close each month (rent, food, insurance — fictionally).</p>
      <div class="name-row ceo-salary-row">
        <label class="visually-hidden" for="ceo-personal-burn-input">Monthly personal budget</label>
        <input id="ceo-personal-burn-input" type="number" min="1500" max="30000" step="100" value="${burnCustom ? personalBurn : recBurn}" ${disabled}>
        <button type="button" class="btn btn-small" id="btn-save-ceo-personal-burn" ${disabled}>Save budget</button>
        <button type="button" class="btn btn-ghost btn-small" id="btn-reset-ceo-personal-burn" ${disabled}>Use recommended</button>
      </div>
    </div>

    ${publicBlock}

    <div class="finance-action">
      <p><strong>CEO salary</strong> — ${escapeHtml(band.label)} · typical ${formatMoney(band.typical)}/yr. Paid from company cash at month close, then deposited to your bank.</p>
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
      <p><strong>Owner draws</strong> — from company cash to your personal bank (max ${formatMoney(maxDraw)} today).</p>
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
      <p class="fine-print">Lifetime cash comp (salary + draws): ${formatMoney(ceoPersonalCashComp(state))}.</p>
    </div>

    <h3 class="log-head">Personal bank ledger</h3>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Event</th><th>Amount</th><th>When</th></tr></thead>
        <tbody>${ledgerRows}</tbody>
      </table>
    </div>

    ${
      publicCo && !state.flags?.cashedOut
        ? `<div class="finance-action">
        <p><strong>Step down</strong> — sell founder shares; proceeds deposit to your personal bank and end the run.</p>
        ${
          lockup > 0
            ? `<p class="fine-print">Founder lockup: ${lockup} month(s) — stock desk on Finance until you can exit.</p>`
            : `<button type="button" class="btn btn-primary btn-small" id="btn-cash-out">Step down &amp; cash out</button>`
        }
      </div>`
        : state.flags?.cashedOut
          ? `<p class="fine-print">You already stepped down — start a new run from the main menu.</p>`
          : `<p class="fine-print">IPO unlocks a liquid equity exit; until then, salary and draws fund your personal bank.</p>`
    }

    <p id="ceo-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showCeoFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
