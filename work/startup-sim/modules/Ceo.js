import { formatMoney } from './constants.js';
import { setGameFeedback } from './GameFeedback.js';
import {
  ceoDisplayName,
  ceoSalaryMonthly,
  setCeoSalaryAnnual,
  takeOwnerDraw,
  renderCeoCompBreakdown
} from './CeoEconomics.js';
import { isPublicCompany } from './IPO.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export { setCeoSalaryAnnual, takeOwnerDraw };

export function renderCeoPanel(container, state) {
  if (!container) return;
  const name = ceoDisplayName(state);
  const annual = state.ceo?.salaryAnnual ?? 0;
  const monthly = ceoSalaryMonthly(state);
  const { pct, equity, salary, draws, liquid, net, publicCo } = renderCeoCompBreakdown(state);
  const equityLabel = publicCo ? 'Founder stake (public)' : 'Founder stake (@ valuation)';
  const lockup = state.publicMarket?.lockupMonthsRemaining ?? 0;

  const drawLog = (state.ceo?.drawLog ?? [])
    .map((d) => `<li>${formatMoney(d.amount)} · turn ${d.turn}</li>`)
    .join('');

  container.innerHTML = `
    <p class="panel-lede">Your personal economics as CEO — salary and owner draws come from company cash. Equity is paper until you sell or step down after IPO.</p>
    <div class="summary-grid">
      <div><span class="stat-label">CEO</span><span class="stat-value">${escapeHtml(name)}</span></div>
      <div><span class="stat-label">Founder ownership</span><span class="stat-value">${pct}%</span></div>
      <div><span class="stat-label">${equityLabel}</span><span class="stat-value">${formatMoney(equity)}</span></div>
      <div><span class="stat-label">Career salary (cash)</span><span class="stat-value">${formatMoney(salary)}</span></div>
      <div><span class="stat-label">Owner draws (cash)</span><span class="stat-value">${formatMoney(draws)}</span></div>
      <div><span class="stat-label">Personal liquidity</span><span class="stat-value">${formatMoney(liquid)}</span></div>
      <div><span class="stat-label">Est. net worth</span><span class="stat-value">${formatMoney(net)}</span></div>
      <div><span class="stat-label">CEO pay / mo</span><span class="stat-value">${formatMoney(monthly)}</span></div>
    </div>

    <div class="finance-action">
      <p><strong>CEO salary</strong> — default $0 in the garage; set anytime. Paid from company cash when you close the month (included in overhead).</p>
      <div class="name-row ceo-salary-row">
        <label class="visually-hidden" for="ceo-salary-input">Annual salary</label>
        <input id="ceo-salary-input" type="number" min="0" max="2000000" step="1000" value="${annual}" ${state.flags?.gameOver ? 'disabled' : ''}>
        <button type="button" class="btn btn-small" id="btn-save-ceo-salary" ${state.flags?.gameOver ? 'disabled' : ''}>Save salary</button>
      </div>
      <p class="fine-print">Cap $2M/yr · Current plan bills ~${formatMoney(monthly)}/mo at month close.</p>
    </div>

    <div class="finance-action">
      <p><strong>Owner draws</strong> — move cash from the company to you personally (tracked for career earnings).</p>
      <div class="stock-actions">
        <button type="button" class="btn btn-small" data-owner-draw="5000" ${state.flags?.gameOver ? 'disabled' : ''}>Draw $5k</button>
        <button type="button" class="btn btn-small" data-owner-draw="10000" ${state.flags?.gameOver ? 'disabled' : ''}>Draw $10k</button>
        <button type="button" class="btn btn-small" data-owner-draw="25000" ${state.flags?.gameOver ? 'disabled' : ''}>Draw $25k</button>
        <button type="button" class="btn btn-small" data-owner-draw="50000" ${state.flags?.gameOver ? 'disabled' : ''}>Draw $50k</button>
      </div>
      ${drawLog ? `<ul class="instrument-list">${drawLog}</ul>` : '<p class="fine-print">No owner draws yet.</p>'}
    </div>

    ${
      publicCo && !state.flags?.cashedOut
        ? `<div class="finance-action">
        <p><strong>Step down</strong> — cash out founder shares at the current market price (ends the run).</p>
        ${
          lockup > 0
            ? `<p class="fine-print">Founder lockup: ${lockup} month(s) remaining — manage the stock desk on Finance until lockup ends.</p>`
            : `<button type="button" class="btn btn-primary btn-small" id="btn-cash-out">Step down &amp; cash out</button>`
        }
      </div>`
        : state.flags?.cashedOut
          ? `<p class="fine-print">You already stepped down — start a new run from the main menu.</p>`
          : `<p class="fine-print">Take the company public to eventually cash out equity; until then, salary and draws are your liquid comp.</p>`
    }

    <p id="ceo-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showCeoFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
