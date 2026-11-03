import { applyXCSafe, applySeedRound, seedRoundPreview, renderCapTableRows } from './CapTable.js';
import { renderFinanceSummary } from './Finance.js';
import { formatMoney } from './GameState.js';

export function canApplyXC(state) {
  return Boolean(state.flags?.xcUnlocked && !state.flags?.xcAccepted);
}

export function canCloseSeed(state) {
  return Boolean(state.flags?.xcAccepted && !state.flags?.seedRoundClosed);
}

export function acceptXC(state) {
  return applyXCSafe(state);
}

export function closeSeedRound(state) {
  return applySeedRound(state);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderFinancePanel(container, state) {
  if (!container) return;

  const sum = renderFinanceSummary(state);
  const preview = seedRoundPreview(state);
  const instruments = (state.finance.instruments ?? [])
    .map(
      (i) =>
        `<li>${escapeHtml(i.label || i.id)} — ${formatMoney(i.amount)} · cap ${formatMoney(i.cap)} · ~${i.estConversionPct ?? '—'}% est.</li>`
    )
    .join('');

  const xcBlock = canApplyXC(state)
    ? `<div class="finance-action">
        <p><strong>X Combinator</strong> is open ($500k SAFE, ~6% on conversion).</p>
        <button type="button" class="btn btn-primary btn-small" id="btn-accept-xc">Accept XC offer</button>
      </div>`
    : state.flags?.xcAccepted
      ? `<p class="fine-print">X Combinator SAFE closed — ${formatMoney(500_000)} added to cash.</p>`
      : `<p class="fine-print">Reach ${formatMoney(500_000)} lifetime revenue to unlock XC.</p>`;

  const seedBlock = canCloseSeed(state) && preview
    ? `<div class="finance-action">
        <p><strong>Seed round</strong> — raise ${formatMoney(preview.raised)} at ${formatMoney(preview.postMoney)} post-money.</p>
        <p class="fine-print">${escapeHtml(preview.note)} Founder ~${preview.founderPctNow}% → ~${preview.founderPctAfterApprox}%.</p>
        <button type="button" class="btn btn-primary btn-small" id="btn-close-seed">Close seed round</button>
      </div>`
    : state.flags?.seedRoundClosed
      ? `<p class="fine-print">Seed round closed${state.finance.lastRound ? ` — ${formatMoney(state.finance.lastRound.raised)} at ${formatMoney(state.finance.lastRound.postMoney)} post.` : '.'}</p>`
      : '';

  container.innerHTML = `
    <p class="panel-lede">Task cash flow is immediate; payroll + fixed costs hit on month close. Fundraising does not use task slots.</p>
    <div class="summary-grid">
      <div><span class="stat-label">Cash</span><span class="stat-value">${sum.cashLabel}</span></div>
      <div><span class="stat-label">Last month rev.</span><span class="stat-value">${sum.mrrLabel}</span></div>
      <div><span class="stat-label">Overhead/mo</span><span class="stat-value">${sum.burnLabel}</span></div>
      <div><span class="stat-label">Runway</span><span class="stat-value">${sum.runway}</span></div>
      <div><span class="stat-label">Valuation</span><span class="stat-value">${state.finance.valuation ? formatMoney(state.finance.valuation) : '—'}</span></div>
    </div>
    ${xcBlock}
    ${seedBlock}
    <h3 class="log-head">Cap table</h3>
    <table class="data-table">
      <thead><tr><th>Holder</th><th>Shares</th><th>%</th><th>Class</th></tr></thead>
      <tbody>${renderCapTableRows(state) || '<tr><td colspan="4">Empty</td></tr>'}</tbody>
    </table>
    ${
      instruments
        ? `<h3 class="log-head">Instruments</h3><ul class="instrument-list">${instruments}</ul>`
        : ''
    }
    <p id="finance-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showFinanceFeedback(message, isError = false) {
  const el = document.getElementById('finance-feedback');
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
  el.classList.toggle('error', isError);
}
