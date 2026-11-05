import { formatMoney } from './constants.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function openGrowthCampaignOutcomeDialog({ title, cost, revenue, buzzDelta, multLine }) {
  const dialog = document.getElementById('growth-outcome-dialog');
  const body = document.getElementById('growth-outcome-body');
  if (!dialog || !body) return Promise.resolve();

  body.innerHTML = `
    <p class="eyebrow">Growth campaign</p>
    <h2 id="growth-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    <div class="summary-grid">
      <div><span class="stat-label">Spent</span><span class="stat-value negative">${formatMoney(cost)}</span></div>
      <div><span class="stat-label">Booked revenue</span><span class="stat-value positive">${formatMoney(revenue)}</span></div>
      ${buzzDelta ? `<div><span class="stat-label">Buzz</span><span class="stat-value">+${buzzDelta}</span></div>` : ''}
    </div>
    ${multLine ? `<p class="fine-print">${escapeHtml(multLine)}</p>` : ''}
    <p class="fine-print">Counts toward this month’s MRR when you close the month. Does not use desk slots.</p>
  `;

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
  return Promise.resolve();
}
