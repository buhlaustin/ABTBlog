import { formatMoney } from './constants.js';
import { projectMonthlyBurn } from './Finance.js';
import { isPublicCompany } from './IPO.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function runwayLabel(state) {
  const burn = state.finance?.monthlyBurn ?? projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  if (burn <= 0) return '∞';
  const months = cash / burn;
  if (months >= 99) return '99+ mo';
  return `${Math.round(months * 10) / 10} mo`;
}

/** Render month-close summary into dialog body. */
export function renderMonthSummaryContent(container, state, summary, headlineTeaser) {
  if (!container) return;
  const stockBlock =
    summary.stockDeltaPct != null
      ? `<div><span class="stat-label">Stock move</span><span class="stat-value">${summary.stockDeltaPct >= 0 ? '+' : ''}${(summary.stockDeltaPct * 100).toFixed(1)}%</span></div>`
      : '';

  container.innerHTML = `
    <p class="eyebrow">Month ${summary.closedMonthIndex}, Year ${summary.closedYear} closed</p>
    <h2 id="month-summary-title" class="month-summary-title">Month-end summary</h2>
    <div class="summary-grid">
      <div><span class="stat-label">Cash</span><span class="stat-value">${formatMoney(summary.cashAfter)}</span></div>
      <div><span class="stat-label">Month revenue</span><span class="stat-value">${formatMoney(summary.monthRevenue)}</span></div>
      <div><span class="stat-label">Overhead</span><span class="stat-value">${formatMoney(summary.burn)}</span></div>
      <div><span class="stat-label">Runway</span><span class="stat-value">${escapeHtml(runwayLabel(state))}</span></div>
      ${stockBlock}
    </div>
    ${
      headlineTeaser
        ? `<p class="month-summary-headline"><strong>Headlines:</strong> ${escapeHtml(headlineTeaser)}</p>`
        : '<p class="fine-print">Headlines will appear on the News tab.</p>'
    }
    <p class="fine-print">Now playing Month ${state.calendar.monthIndex}, Year ${state.calendar.year}.</p>
  `;
}

export function openMonthSummaryDialog(state, summary, headlineTeaser) {
  const dialog = document.getElementById('month-summary-dialog');
  const body = document.getElementById('month-summary-body');
  if (!dialog) return Promise.resolve();
  renderMonthSummaryContent(body, state, summary, headlineTeaser);
  dialog.returnValue = 'dismiss';
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
    return new Promise((resolve) => {
      const done = () => {
        dialog.removeEventListener('close', done);
        resolve();
      };
      dialog.addEventListener('close', done);
    });
  }
  dialog.hidden = false;
  return new Promise((resolve) => {
    const btn = document.getElementById('btn-month-summary-close');
    const handler = () => {
      dialog.hidden = true;
      btn?.removeEventListener('click', handler);
      resolve();
    };
    btn?.addEventListener('click', handler);
  });
}
