import { formatMoney } from './constants.js';
import { formatCalendarMonth, formatStateMonth } from './GameCalendar.js';
import { companyRunwayDisplay } from './Finance.js';
import { isPublicCompany, marketCap } from './IPO.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function runwayLabel(state) {
  return companyRunwayDisplay(state).monthsLabel;
}

export function runwayDetail(state) {
  return companyRunwayDisplay(state).detail;
}

/** Render month-close summary into dialog body. */
export function renderMonthSummaryContent(container, state, summary, headlineTeaser) {
  if (!container) return;
  const stockBlock =
    summary.stockDeltaPct != null
      ? `<div><span class="stat-label">Stock move</span><span class="stat-value">${summary.stockDeltaPct >= 0 ? '+' : ''}${(summary.stockDeltaPct * 100).toFixed(1)}%</span></div>
      ${
        isPublicCompany(state)
          ? `<div><span class="stat-label">${state.publicMarket?.ticker ?? 'Stock'}</span><span class="stat-value">${formatMoney(state.publicMarket?.sharePrice ?? 0)} · cap ${formatMoney(marketCap(state))}</span></div>`
          : ''
      }`
      : '';

  container.innerHTML = `
    <p class="eyebrow">${escapeHtml(formatCalendarMonth(summary.closedYear, summary.closedMonthIndex))} closed</p>
    <h2 id="month-summary-title" class="month-summary-title">Month-end summary</h2>
    <div class="summary-grid">
      <div><span class="stat-label">Cash</span><span class="stat-value">${formatMoney(summary.cashAfter)}</span></div>
      <div><span class="stat-label">Month revenue</span><span class="stat-value">${formatMoney(summary.monthRevenue)}</span></div>
      <div><span class="stat-label">ARR (after close)</span><span class="stat-value">${formatMoney(summary.arrAfter ?? 0)}</span></div>
      <div><span class="stat-label">Overhead</span><span class="stat-value">${formatMoney(summary.burn)}</span></div>
      ${
        summary.growthCampaignsClosed
          ? `<div><span class="stat-label">Growth campaigns</span><span class="stat-value">${summary.growthCampaignsClosed}</span></div>`
          : ''
      }
      <div><span class="stat-label">Runway</span><span class="stat-value">${escapeHtml(runwayLabel(state))}</span></div>
      ${stockBlock}
    </div>
    <p class="fine-print">${escapeHtml(runwayDetail(state))}</p>
    ${
      headlineTeaser
        ? `<p class="month-summary-headline"><strong>Headlines:</strong> ${escapeHtml(headlineTeaser)}</p>`
        : '<p class="fine-print">Headlines will appear on the News tab.</p>'
    }
    <p class="fine-print">Now playing ${escapeHtml(formatStateMonth(state))}.</p>
  `;
}

export function updateMonthSummaryHeadline(headlineTeaser) {
  const dialog = document.getElementById('month-summary-dialog');
  if (!dialog?.open) return;
  const body = document.getElementById('month-summary-body');
  if (!body) return;
  let el = body.querySelector('.month-summary-headline');
  if (!headlineTeaser) return;
  const html = `<strong>Headlines:</strong> ${escapeHtml(headlineTeaser)}`;
  if (el) {
    el.innerHTML = html;
  } else {
    el = document.createElement('p');
    el.className = 'month-summary-headline';
    el.innerHTML = html;
    body.appendChild(el);
  }
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
