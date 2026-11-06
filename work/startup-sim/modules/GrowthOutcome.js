import { formatMoney } from './constants.js';
import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';

function dialogMetrics(cards) {
  return `<div class="dialog-metric-panel">${panelMetricGrid('3', cards)}</div>`;
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
    ${dialogMetrics(
      [
        panelStatCard('Spent', formatMoney(cost), { tone: 'neg' }),
        panelStatCard('Booked revenue', formatMoney(revenue), { tone: 'pos' }),
        buzzDelta ? panelStatCard('Buzz', `+${buzzDelta}`) : null
      ].filter(Boolean)
    )}
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
  return showGrowthOutcomeDialog(`
    <p class="eyebrow">Paid campaigns · buy all</p>
    <h2 id="growth-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    ${dialogMetrics(
      [
        panelStatCard('Total spent', formatMoney(totalCost), { tone: 'neg' }),
        panelStatCard('Booked revenue', formatMoney(totalRevenue), { tone: 'pos' }),
        totalBuzz > 0 ? panelStatCard('Buzz', `+${totalBuzz}`) : null
      ].filter(Boolean)
    )}
    ${multLine ? `<p class="fine-print">${escapeHtml(multLine)}</p>` : ''}
    ${renderLaunchList(titles)}
    <p class="fine-print">Revenue books when each campaign runs and counts toward this month’s MRR at month close. Uses the campaign meter, not desk slots.</p>
  `);
}

/** Popup after buy-all side plays (no revenue — buzz & product). */
export function openSidePlayBulkOutcomeDialog({ count, totalCost, totalBuzz, totalProduct, titles }) {
  const n = Number(count) || 0;
  const title = n === 1 ? '1 side play run' : `${n} side plays run`;
  return showGrowthOutcomeDialog(`
    <p class="eyebrow">Side plays · buy all</p>
    <h2 id="growth-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    ${dialogMetrics(
      [
        panelStatCard('Total spent', formatMoney(totalCost), { tone: 'neg' }),
        panelStatCard('Buzz', `+${totalBuzz}`),
        totalProduct > 0 ? panelStatCard('Product', `+${totalProduct}`) : null
      ].filter(Boolean)
    )}
    ${renderLaunchList(titles)}
    <p class="fine-print">Side plays spend cash for traction — they do not book revenue. Uses the side-play meter, not desk slots.</p>
  `);
}
