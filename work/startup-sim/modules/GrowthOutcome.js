import { formatMoney } from './constants.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showGrowthOutcomeDialog(bodyHtml) {
  const dialog = document.getElementById('growth-outcome-dialog');
  const body = document.getElementById('growth-outcome-body');
  if (!dialog || !body) return Promise.resolve();
  body.innerHTML = bodyHtml;
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

export function openGrowthCampaignOutcomeDialog({ title, cost, revenue, buzzDelta, multLine }) {
  return showGrowthOutcomeDialog(`
    <p class="eyebrow">Growth campaign</p>
    <h2 id="growth-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    <div class="summary-grid">
      <div><span class="stat-label">Spent</span><span class="stat-value negative">${formatMoney(cost)}</span></div>
      <div><span class="stat-label">Booked revenue</span><span class="stat-value positive">${formatMoney(revenue)}</span></div>
      ${buzzDelta ? `<div><span class="stat-label">Buzz</span><span class="stat-value">+${buzzDelta}</span></div>` : ''}
    </div>
    ${multLine ? `<p class="fine-print">${escapeHtml(multLine)}</p>` : ''}
    <p class="fine-print">Counts toward this month’s MRR when you close the month. Does not use desk slots.</p>
  `);
}

function renderLaunchList(items, max = 6) {
  if (!items?.length) return '';
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  const lis = shown.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const more = rest > 0 ? `<li class="fine-print">+ ${rest} more</li>` : '';
  return `<ul class="growth-outcome-list">${lis}${more}</ul>`;
}

/** Popup after buy-all paid campaigns (aggregates each launch). */
export function openGrowthCampaignBulkOutcomeDialog({
  count,
  totalCost,
  totalRevenue,
  totalBuzz,
  titles,
  multLine
}) {
  const n = Number(count) || 0;
  const title = n === 1 ? '1 campaign launched' : `${n} campaigns launched`;
  const buzzCell =
    totalBuzz > 0
      ? `<div><span class="stat-label">Buzz</span><span class="stat-value">+${totalBuzz}</span></div>`
      : '';
  return showGrowthOutcomeDialog(`
    <p class="eyebrow">Paid campaigns · buy all</p>
    <h2 id="growth-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    <div class="summary-grid">
      <div><span class="stat-label">Total spent</span><span class="stat-value negative">${formatMoney(totalCost)}</span></div>
      <div><span class="stat-label">Booked revenue</span><span class="stat-value positive">${formatMoney(totalRevenue)}</span></div>
      ${buzzCell}
    </div>
    ${multLine ? `<p class="fine-print">${escapeHtml(multLine)}</p>` : ''}
    ${renderLaunchList(titles)}
    <p class="fine-print">Revenue books when each campaign runs and counts toward this month’s MRR at month close. Uses the campaign meter, not desk slots.</p>
  `);
}

/** Popup after buy-all side plays (no revenue — buzz & product). */
export function openSidePlayBulkOutcomeDialog({ count, totalCost, totalBuzz, totalProduct, titles }) {
  const n = Number(count) || 0;
  const title = n === 1 ? '1 side play run' : `${n} side plays run`;
  const productCell =
    totalProduct > 0
      ? `<div><span class="stat-label">Product</span><span class="stat-value">+${totalProduct}</span></div>`
      : '';
  return showGrowthOutcomeDialog(`
    <p class="eyebrow">Side plays · buy all</p>
    <h2 id="growth-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    <div class="summary-grid">
      <div><span class="stat-label">Total spent</span><span class="stat-value negative">${formatMoney(totalCost)}</span></div>
      <div><span class="stat-label">Buzz</span><span class="stat-value">+${totalBuzz}</span></div>
      ${productCell}
    </div>
    ${renderLaunchList(titles)}
    <p class="fine-print">Side plays spend cash for traction — they do not book revenue. Uses the side-play meter, not desk slots.</p>
  `);
}
