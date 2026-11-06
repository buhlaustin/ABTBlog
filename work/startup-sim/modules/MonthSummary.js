import { formatMoney } from './constants.js';
import { formatCalendarMonth, formatStateMonth } from './GameCalendar.js';
import { companyRunwayDisplay } from './Finance.js';
import { isPublicCompany, marketCap } from './IPO.js';
import { escapeHtml, panelStatCard, panelMetricGrid, panelMetricGroup, panelMetricStack } from './PanelChrome.js';

export function runwayLabel(state) {
  return companyRunwayDisplay(state).monthsLabel;
}

export function runwayDetail(state) {
  return companyRunwayDisplay(state).detail;
}

/** Render month-close summary into dialog body. */
export function renderMonthSummaryContent(container, state, summary, headlineTeaser) {
  if (!container) return;
  const stockMovePct =
    summary.stockDeltaPct != null
      ? `${summary.stockDeltaPct >= 0 ? '+' : ''}${(summary.stockDeltaPct * 100).toFixed(1)}%`
      : null;
  const stockTone = summary.stockDeltaPct != null && summary.stockDeltaPct >= 0 ? 'pos' : 'neg';

  const operatingCards = [
    panelStatCard('Cash', formatMoney(summary.cashAfter), { hero: true }),
    panelStatCard('Month revenue', formatMoney(summary.monthRevenue), { tone: 'pos' }),
    panelStatCard('ARR (after close)', formatMoney(summary.arrAfter ?? 0)),
    panelStatCard('Overhead', formatMoney(summary.burn)),
    summary.growthCampaignsClosed
      ? panelStatCard('Growth campaigns', String(summary.growthCampaignsClosed))
      : null,
    panelStatCard('Runway', escapeHtml(runwayLabel(state)))
  ].filter(Boolean);

  const publicCards =
    stockMovePct != null
      ? [
          panelStatCard('Stock move', stockMovePct, { tone: stockTone }),
          isPublicCompany(state)
            ? panelStatCard(
                state.publicMarket?.ticker ?? 'Stock',
                `${formatMoney(state.publicMarket?.sharePrice ?? 0)} · cap ${formatMoney(marketCap(state))}`
              )
            : null
        ].filter(Boolean)
      : [];

  container.innerHTML = `
    <p class="eyebrow">${escapeHtml(formatCalendarMonth(summary.closedYear, summary.closedMonthIndex))} closed</p>
    <h2 id="month-summary-title" class="month-summary-title">Month-end summary</h2>
    <div class="dialog-metric-panel">
      ${panelMetricStack(
        panelMetricGroup('Operating snapshot', panelMetricGrid('3', operatingCards)),
        publicCards.length
          ? panelMetricGroup('Public market', panelMetricGrid('2', publicCards))
          : null
      )}
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
