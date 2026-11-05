import {
  applySeedRound,
  applySeriesA,
  applySeriesB,
  applySeriesC,
  applySeriesD,
  applySeriesE,
  applySeriesF,
  seedRoundPreview,
  seriesAPreview,
  seriesBPreview,
  seriesCPreview,
  seriesDPreview,
  seriesEPreview,
  seriesFPreview,
  renderCapTableRows
} from './CapTable.js';
import {
  renderFinanceSummary,
  getTaskRevenueMultiplierPreview,
  getCoreTaskRevenueMult,
  getSandboxTuningMult
} from './Finance.js';
import { progressionTierLabel } from './ProgressionEconomy.js';
import { formatMoney } from './constants.js';
import {
  sentimentLabel,
  seriesBGateSentiment,
  hasInstitutionalBoard
} from './Sentiment.js';
import { setGameFeedback } from './GameFeedback.js';
import {
  canStartInterview,
  isInResidency,
  isXcAcceptedPendingBatch,
  xcBatchStartLabel,
  xcWaitingForRetry
} from './XC.js';
import { renderAcceleratorsBlock, joinAccelerator } from './Accelerators.js';

export { joinAccelerator };
import { renderOfficesPanel } from './Offices.js';
import { renderIpoPanel } from './IPO.js';

export function canCloseSeed(state) {
  return Boolean(
    state.flags?.xcAccepted &&
      state.flags?.xcResidencyComplete &&
      state.workspace?.smallOfficeOwned &&
      !state.flags?.seedRoundClosed
  );
}

export function closeSeedRound(state) {
  return applySeedRound(state);
}

export function closeSeriesA(state) {
  return applySeriesA(state);
}

export function closeSeriesB(state) {
  return applySeriesB(state);
}

export function closeSeriesC(state) {
  return applySeriesC(state);
}

export function closeSeriesD(state) {
  return applySeriesD(state);
}

export function closeSeriesE(state) {
  return applySeriesE(state);
}

export function closeSeriesF(state) {
  return applySeriesF(state);
}

function renderPricedRoundBlock(state, preview, flagName, buttonId, label) {
  if (!preview || state.flags?.[flagName]) return '';
  return `<div class="finance-action">
    <p><strong>${label}</strong> — raise ${formatMoney(preview.raised)} at ${formatMoney(preview.postMoney)} post-money.</p>
    <p class="fine-print">Founder ~${preview.founderPctNow}% → ~${preview.founderPctAfterApprox}%.</p>
    <button type="button" class="btn btn-primary btn-small" id="${buttonId}">Close ${label}</button>
  </div>`;
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
  const seriesA = seriesAPreview(state);
  const seriesB = seriesBPreview(state);
  const sentimentScore = state.sentiment?.score ?? 68;
  const rival = state.world?.competitor?.name;
  const instruments = (state.finance.instruments ?? [])
    .map(
      (i) =>
        `<li>${escapeHtml(i.label || i.id)} — ${formatMoney(i.amount)} · cap ${formatMoney(i.cap)} · ~${i.estConversionPct ?? '—'}% est.</li>`
    )
    .join('');

  let xcBlock = '';
  if (canStartInterview(state)) {
    const retryNote = state.xc?.needsFollowUpQuestion
      ? ' Partners added one follow-up question on this application.'
      : '';
    xcBlock = `<div class="finance-action">
        <p><strong>X Combinator</strong> — apply with a short interview ($500k SAFE, ~6%).${retryNote}</p>
        <button type="button" class="btn btn-primary btn-small" id="btn-xc-apply">Apply to XC</button>
      </div>`;
  } else if (xcWaitingForRetry(state)) {
    xcBlock = `<p class="fine-print">XC waitlist — finish this month and reapply next month with sharper metrics.</p>`;
  } else if (isInResidency(state)) {
    xcBlock = `<p class="fine-print"><strong>In SF batch</strong> — ${state.xc?.residencyMonthsRemaining ?? 0} month(s) left. +35% task revenue, +batch product momentum. Desk tasks are XC-only.</p>`;
  } else if (isXcAcceptedPendingBatch(state)) {
    const start = xcBatchStartLabel(state);
    xcBlock = `<p class="fine-print"><strong>Accepted into XC</strong> — batch starts Month ${start?.monthIndex ?? '?'}, Year ${start?.year ?? '?'}. $500k SAFE already on the cap table.</p>`;
  } else if (state.flags?.xcAccepted) {
    xcBlock = `<p class="fine-print">XC alumni — ${formatMoney(500_000)} SAFE closed. ${(state.xc?.graduateBoostMonths ?? 0) > 0 ? `${state.xc.graduateBoostMonths} mo alumni revenue boost left.` : 'Batch complete.'}</p>`;
  } else {
    xcBlock = `<p class="fine-print">Reach ${formatMoney(100_000)} ARR to unlock XC.</p>`;
  }

  const sentimentBlock = hasInstitutionalBoard(state)
    ? `<div class="sentiment-meter" role="meter" aria-valuenow="${sentimentScore}" aria-valuemin="0" aria-valuemax="100">
      <span class="stat-label">Board approval</span>
      <div class="sentiment-bar"><div class="sentiment-fill" style="width:${sentimentScore}%"></div></div>
      <span class="stat-value">${sentimentScore} — ${escapeHtml(sentimentLabel(sentimentScore))}</span>
      ${rival ? `<p class="fine-print">Rival in the news: <strong>${escapeHtml(rival)}</strong></p>` : ''}
    </div>`
    : `<p class="fine-print"><strong>Solo founder mode</strong> — no board yet. Close Series A to seat a lead investor; board approval then gates Series B+ and optional board prep on the Board tab.</p>`;

  const seriesBScore = seriesBGateSentiment(state);
  const seriesABlock =
    seriesA && !state.flags?.seriesAClosed
      ? `<div class="finance-action">
        <p><strong>Series A</strong> — raise ${formatMoney(seriesA.raised)} at ${formatMoney(seriesA.postMoney)} post-money.</p>
        <p class="fine-print">${escapeHtml(seriesA.note)} Founder ~${seriesA.founderPctNow}% → ~${seriesA.founderPctAfterApprox}%. Seats your first board member — no approval score required yet.</p>
        <button type="button" class="btn btn-primary btn-small" id="btn-close-series-a">Close Series A</button>
      </div>`
      : state.flags?.seriesAClosed
        ? `<p class="fine-print">Series A closed.</p>`
        : '';

  const seriesBBlock =
    seriesB && !state.flags?.seriesBClosed
      ? `<div class="finance-action">
        <p><strong>Series B</strong> — raise ${formatMoney(seriesB.raised)} at ${formatMoney(seriesB.postMoney)} post-money.</p>
        <p class="fine-print">${escapeHtml(seriesB.note)} Founder ~${seriesB.founderPctNow}% → ~${seriesB.founderPctAfterApprox}%.</p>
        ${
          seriesBScore < 25
            ? `<p class="fine-print error">Board sentiment ${seriesBScore}/100 — need at least 25 before Series B.</p>`
            : ''
        }
        <button type="button" class="btn btn-primary btn-small" id="btn-close-series-b" ${seriesBScore < 25 ? 'disabled title="Raise board sentiment to 25+"' : ''}>Close Series B</button>
      </div>`
      : state.flags?.seriesBClosed
        ? `<p class="fine-print">Series B closed.</p>`
        : '';

  const seedBlock = canCloseSeed(state) && preview
    ? `<div class="finance-action">
        <p><strong>Seed round</strong> — raise ${formatMoney(preview.raised)} at ${formatMoney(preview.postMoney)} post-money.</p>
        <p class="fine-print">${escapeHtml(preview.note)} Founder ~${preview.founderPctNow}% → ~${preview.founderPctAfterApprox}%.</p>
        <button type="button" class="btn btn-primary btn-small" id="btn-close-seed">Close seed round</button>
      </div>`
    : state.flags?.seedRoundClosed
      ? `<p class="fine-print">Seed round closed${state.finance.lastRound ? ` — ${formatMoney(state.finance.lastRound.raised)} at ${formatMoney(state.finance.lastRound.postMoney)} post.` : '.'}</p>`
      : state.flags?.xcAccepted && !state.flags?.xcResidencyComplete
        ? `<p class="fine-print">Finish the 3-month XC batch, then close seed (small office required).</p>`
        : state.flags?.xcAccepted
          ? `<p class="fine-print">Lease a small office to close seed.</p>`
          : '';

  const revMult = getTaskRevenueMultiplierPreview(state);
  const coreMult = getCoreTaskRevenueMult(state);
  const tuneMult = getSandboxTuningMult(state);
  const multExpl =
    state.mode === 'sandbox' && tuneMult !== 1
      ? `${progressionTierLabel(state)}: ${coreMult.toFixed(2)}× progression × ${tuneMult.toFixed(2)}× sandbox = ${revMult.toFixed(2)}× on desk & Growth payouts.`
      : `${progressionTierLabel(state)}: ${revMult.toFixed(2)}× on desk & Growth payouts (rounds + HQ + staff).`;

  container.innerHTML = `
    <p class="panel-lede">Cash from desk tasks lands right away. Payroll and rent bill when you close the month. Fundraising lives here, not on the desk.</p>
    <p class="fine-print">${escapeHtml(multExpl)} Close rounds to jump task tiers and multiplier.</p>
    <div class="summary-grid">
      <div><span class="stat-label">Cash</span><span class="stat-value">${sum.cashLabel}</span></div>
      <div><span class="stat-label">Last month rev.</span><span class="stat-value">${sum.mrrLabel}</span></div>
      <div><span class="stat-label">Overhead/mo</span><span class="stat-value">${sum.burnLabel}</span></div>
      <div><span class="stat-label">Runway</span><span class="stat-value">${sum.runway}</span></div>
      <div><span class="stat-label">Valuation</span><span class="stat-value">${state.finance.valuation ? formatMoney(state.finance.valuation) : '—'}</span></div>
      <div><span class="stat-label">Location</span><span class="stat-value">${escapeHtml(state.company.location || '—')}</span></div>
      <div><span class="stat-label">Lifetime revenue</span><span class="stat-value">${sum.lifetimeRevenueLabel}</span></div>
      <div><span class="stat-label">Lifetime expenses</span><span class="stat-value">${sum.lifetimeExpensesLabel}</span></div>
      <div><span class="stat-label">Lifetime profit</span><span class="stat-value">${sum.lifetimeProfitLabel}</span></div>
      <div><span class="stat-label">Starting cash (investment)</span><span class="stat-value">${sum.initialInvestmentLabel}</span></div>
      <div><span class="stat-label">Founder stake @ valuation</span><span class="stat-value">${sum.founderStakeLabel}</span></div>
    </div>
    ${sentimentBlock}
    ${xcBlock}
    ${seedBlock}
    ${seriesABlock}
    ${seriesBBlock}
    ${renderPricedRoundBlock(state, seriesCPreview(state), 'seriesCClosed', 'btn-close-series-c', 'Series C')}
    ${renderPricedRoundBlock(state, seriesDPreview(state), 'seriesDClosed', 'btn-close-series-d', 'Series D')}
    ${renderPricedRoundBlock(state, seriesEPreview(state), 'seriesEClosed', 'btn-close-series-e', 'Series E')}
    ${renderPricedRoundBlock(state, seriesFPreview(state), 'seriesFClosed', 'btn-close-series-f', 'Series F')}
    ${renderAcceleratorsBlock(state)}
    <div id="ipo-panel-mount"></div>
    <div id="offices-panel-mount"></div>
    <h3 class="log-head">Cap table</h3>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Holder</th><th>Shares</th><th>%</th><th>Class</th></tr></thead>
        <tbody>${renderCapTableRows(state) || '<tr><td colspan="4">Empty</td></tr>'}</tbody>
      </table>
    </div>
    ${
      instruments
        ? `<h3 class="log-head">Instruments</h3><ul class="instrument-list">${instruments}</ul>`
        : ''
    }
    <p id="finance-feedback" class="desk-feedback" hidden></p>
  `;

  renderIpoPanel(container, state);
  renderOfficesPanel(document.getElementById('offices-panel-mount'), state);
}

export function showFinanceFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}
