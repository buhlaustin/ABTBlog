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
  renderCapTableRows,
  renderCapTableSummary
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
  marketTrustLabel,
  seriesBGateSentiment,
  seriesAGateSentiment,
  hasInstitutionalBoard
} from './Sentiment.js';
import { isFundraisingBlockedByScenario } from './ScenarioEffects.js';
import { totalSubsidiaryMrr } from './Acquisitions.js';
import { setGameFeedback } from './GameFeedback.js';
import {
  canStartInterview,
  isInResidency,
  isXcAcceptedPendingBatch,
  xcWaitingForRetry
} from './XC.js';
import { renderAcceleratorsBlock, joinAccelerator } from './Accelerators.js';
import { canCloseAngelSafe, closeAngelSafe, angelSafesClosedCount, ANGEL_SAFE_AMOUNT, ANGEL_SAFE_CAP, ANGEL_SAFE_MAX_ROUNDS } from './AngelSafe.js';
import {
  computeCreditLimit,
  loanOutstanding,
  loanPaymentMonthly,
  requestLoanDraw,
  bankApprovalBreakdown,
  creditScoreLabel,
  prepayLoan,
  refinanceLoanAfterSeed,
  renderLoanHistoryList
} from './BankLoan.js';
import {
  renderCapitalStackSummary,
  renderSafeInstrumentList,
  totalSafePrincipal,
  estSafeDilutionAtSeed
} from './FinanceCapital.js';
import {
  canDrawRevenueAdvance,
  drawRevenueAdvance,
  rbfOutstanding
} from './RevenueAdvance.js';

export { joinAccelerator };
export { closeAngelSafe, requestLoanDraw, prepayLoan, refinanceLoanAfterSeed, drawRevenueAdvance };
import { renderOfficesPanel } from './Offices.js';
import { xcBatchStartLabelText } from './XC.js';
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
    .filter((i) => !i.converted)
    .map(
      (i) =>
        `<li>${escapeHtml(i.label || i.id)} — ${formatMoney(i.amount)} · cap ${formatMoney(i.cap)} · ~${i.estConversionPct ?? '—'}% est.${i.leadName ? ` · ${escapeHtml(i.leadName)}` : ''}</li>`
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
    const demoHint =
      (state.xc?.residencyMonthsRemaining ?? 0) === 1 && !state.xc?.demoDayTaskDone
        ? ' Final month: <strong>Demo Day</strong> hits the desk — your pitch sets seed terms.'
        : '';
    xcBlock = `<p class="fine-print"><strong>In SF batch</strong> — ${state.xc?.residencyMonthsRemaining ?? 0} month(s) left. +35% task revenue, +batch product momentum. Desk tasks are XC-only.${demoHint}</p>`;
  } else if (isXcAcceptedPendingBatch(state)) {
    const startLabel = xcBatchStartLabelText(state);
    xcBlock = `<p class="fine-print"><strong>Accepted into XC</strong> — ${escapeHtml(startLabel ?? 'next seasonal batch')}. $500k SAFE already on the cap table.</p>`;
  } else if (state.flags?.xcAccepted) {
    xcBlock = `<p class="fine-print">XC alumni — ${formatMoney(500_000)} SAFE closed. ${(state.xc?.graduateBoostMonths ?? 0) > 0 ? `${state.xc.graduateBoostMonths} mo alumni revenue boost left.` : 'Batch complete.'}</p>`;
  } else {
    xcBlock = `<p class="fine-print">Reach ${formatMoney(100_000)} ARR to unlock XC.</p>`;
  }

  const fundraisingBlocked = isFundraisingBlockedByScenario(state);
  const sentimentBlock = hasInstitutionalBoard(state)
    ? `<div class="sentiment-meter" role="meter" aria-valuenow="${sentimentScore}" aria-valuemin="0" aria-valuemax="100">
      <span class="stat-label">Board approval</span>
      <div class="sentiment-bar"><div class="sentiment-fill" style="width:${sentimentScore}%"></div></div>
      <span class="stat-value">${sentimentScore} — ${escapeHtml(sentimentLabel(sentimentScore))}</span>
      ${rival ? `<p class="fine-print">Rival in the news: <strong>${escapeHtml(rival)}</strong></p>` : ''}
    </div>`
    : `<div class="sentiment-meter" role="meter" aria-valuenow="${sentimentScore}" aria-valuemin="0" aria-valuemax="100">
      <span class="stat-label">Market trust</span>
      <div class="sentiment-bar"><div class="sentiment-fill" style="width:${sentimentScore}%"></div></div>
      <span class="stat-value">${sentimentScore} — ${escapeHtml(marketTrustLabel(sentimentScore))}</span>
      <p class="fine-print">Crisis and decision choices move trust. Series A requires at least 32. After Series A this becomes board approval.</p>
    </div>`;
  const blockNote = fundraisingBlocked
    ? `<p class="fine-print error">Fundraising paused — fallout from a recent crisis or decision.</p>`
    : '';

  const seriesBScore = seriesBGateSentiment(state);
  const seriesAScore = seriesAGateSentiment(state);
  const seriesABlock =
    seriesA && !state.flags?.seriesAClosed
      ? `<div class="finance-action">
        <p><strong>Series A</strong> — raise ${formatMoney(seriesA.raised)} at ${formatMoney(seriesA.postMoney)} post-money.</p>
        <p class="fine-print">${escapeHtml(seriesA.note)} Founder ~${seriesA.founderPctNow}% → ~${seriesA.founderPctAfterApprox}%. Seats your first board member.</p>
        ${
          seriesAScore < 32
            ? `<p class="fine-print error">Market trust ${seriesAScore}/100 — need at least 32 (recover via smart crisis/decision outcomes).</p>`
            : ''
        }
        <button type="button" class="btn btn-primary btn-small" id="btn-close-series-a" ${seriesAScore < 32 || fundraisingBlocked ? 'disabled' : ''}>Close Series A</button>
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

  const angelGate = canCloseAngelSafe(state);
  const angelCount = angelSafesClosedCount(state);
  const angelBlock =
    angelGate.ok || angelCount > 0
      ? `<div class="finance-action">
        <p><strong>Angel SAFE (garage)</strong> — ${formatMoney(ANGEL_SAFE_AMOUNT)} on ${formatMoney(ANGEL_SAFE_CAP)} post-money cap (~${Math.round((ANGEL_SAFE_AMOUNT / ANGEL_SAFE_CAP) * 1000) / 10}% est.)</p>
        <p class="fine-print">${angelCount}/${ANGEL_SAFE_MAX_ROUNDS} closed.${angelGate.ok ? '' : ` ${angelGate.reason}`}</p>
        <button type="button" class="btn btn-ghost btn-small" id="btn-close-angel-safe" ${angelGate.ok && !fundraisingBlocked ? '' : 'disabled'}>Close angel SAFE</button>
      </div>`
      : '';

  const creditLimit = computeCreditLimit(state);
  const loanBal = loanOutstanding(state);
  const loanPay = loanPaymentMonthly(state);
  const breakdown = bankApprovalBreakdown(state, 25_000);
  const score = breakdown.score;
  const factorLines = breakdown.factors
    .map((f) => `<li>${escapeHtml(f.label)}: ${f.pts >= 0 ? '+' : ''}${f.pts} bp</li>`)
    .join('');
  const loanBlock = `<div class="finance-action loan-panel">
    <p><strong>Bank line of credit</strong> — draw subject to approval; repay monthly as overhead.</p>
    <p class="fine-print">Limit ${formatMoney(creditLimit)} · Headroom ${formatMoney(breakdown.headroom)} · Outstanding ${formatMoney(loanBal)} · Debt service ${formatMoney(loanPay)}/mo · APR ${Math.round((state.finance?.loan?.apr ?? 0.14) * 100)}%</p>
    <p class="fine-print">Credit score <strong>${score}</strong> (${escapeHtml(creditScoreLabel(score))}) · ~${Math.round(breakdown.odds * 100)}% approval on $25k draw</p>
    <details class="loan-breakdown"><summary>Approval breakdown</summary><ul class="instrument-list">${factorLines}</ul></details>
    <div class="stock-actions">
      <button type="button" class="btn btn-small" data-loan-draw="25000" ${loanBal + 25_000 > creditLimit ? 'disabled' : ''}>Draw $25k</button>
      <button type="button" class="btn btn-small" data-loan-draw="50000" ${loanBal + 50_000 > creditLimit ? 'disabled' : ''}>Draw $50k</button>
      <button type="button" class="btn btn-small" data-loan-draw="100000" ${loanBal + 100_000 > creditLimit ? 'disabled' : ''}>Draw $100k</button>
      ${loanBal > 0 ? `<button type="button" class="btn btn-ghost btn-small" data-loan-prepay="10000">Prepay $10k</button>
      <button type="button" class="btn btn-ghost btn-small" data-loan-prepay="25000">Prepay $25k</button>` : ''}
      ${state.flags?.seedRoundClosed && loanBal > 0 && !state.finance?.loan?.refinancedAtSeed ? `<button type="button" class="btn btn-ghost btn-small" id="btn-loan-refinance">Refinance at seed rate</button>` : ''}
    </div>
    ${renderLoanHistoryList(state)}
  </div>`;

  const rbfGate = canDrawRevenueAdvance(state);
  const rbfOwed = rbfOutstanding(state);
  const rbfBlock =
    rbfOwed > 0 || rbfGate.ok
      ? `<div class="finance-action">
        <p><strong>Revenue advance</strong> — non-dilutive capital repaid from a slice of monthly desk revenue.</p>
        <p class="fine-print">${rbfOwed > 0 ? `Outstanding ${formatMoney(rbfOwed)} — auto-repaid from revenue each month.` : rbfGate.ok ? 'Available once you have meaningful MRR.' : rbfGate.reason}</p>
        <button type="button" class="btn btn-ghost btn-small" id="btn-revenue-advance" ${rbfGate.ok ? '' : 'disabled'}>Draw revenue advance</button>
      </div>`
      : '';

  const capitalStack = renderCapitalStackSummary(state);
  const safeList = renderSafeInstrumentList(state);
  const seedPreviewNote =
    preview && !state.flags?.seedRoundClosed && totalSafePrincipal(state) > 0
      ? ` Outstanding SAFEs (~${estSafeDilutionAtSeed(state)}% est.) convert on seed close.`
      : '';

  const seedBlock = canCloseSeed(state) && preview
    ? `<div class="finance-action">
        <p><strong>Seed round</strong> — raise ${formatMoney(preview.raised)} at ${formatMoney(preview.postMoney)} post-money.</p>
        <p class="fine-print">${escapeHtml(preview.note)} Founder ~${preview.founderPctNow}% → ~${preview.founderPctAfterApprox}%.${seedPreviewNote}</p>
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
      <div><span class="stat-label">Portfolio MRR</span><span class="stat-value">${formatMoney(totalSubsidiaryMrr(state))}/mo</span></div>
      <div><span class="stat-label">Overhead/mo</span><span class="stat-value">${sum.burnLabel}</span></div>
      <div><span class="stat-label">Runway</span><span class="stat-value">${sum.runway}</span></div>
      <div><span class="stat-label">Valuation</span><span class="stat-value">${state.finance.valuation ? formatMoney(state.finance.valuation) : '—'}</span></div>
      <div><span class="stat-label">Location</span><span class="stat-value">${escapeHtml(state.company.location || '—')}</span></div>
      <div><span class="stat-label">Lifetime revenue</span><span class="stat-value">${sum.lifetimeRevenueLabel}</span></div>
      <div><span class="stat-label">Lifetime expenses</span><span class="stat-value">${sum.lifetimeExpensesLabel}</span></div>
      <div><span class="stat-label">Lifetime profit</span><span class="stat-value">${sum.lifetimeProfitLabel}</span></div>
      <div><span class="stat-label">Starting cash (investment)</span><span class="stat-value">${sum.initialInvestmentLabel}</span></div>
    </div>
    <p class="fine-print">Founder equity, salary, owner draws, and net worth live on the <strong>CEO</strong> tab.</p>
    ${blockNote}
    ${capitalStack}
    ${safeList}
    ${sentimentBlock}
    ${xcBlock}
    ${angelBlock}
    ${rbfBlock}
    ${loanBlock}
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
    ${renderCapTableSummary(state)}
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
