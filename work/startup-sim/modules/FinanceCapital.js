import { formatMoney } from './constants.js';
import { loanOutstanding, loanPaymentMonthly, computeCreditLimit } from './BankLoan.js';
import { getArr } from './Workspace.js';

export function activeSafeInstruments(state) {
  return (state.finance?.instruments ?? []).filter((i) => i.type === 'safe' && !i.converted);
}

export function totalSafePrincipal(state) {
  return activeSafeInstruments(state).reduce((s, i) => s + (i.amount ?? 0), 0);
}

/** Rough fully-diluted % if every SAFE converts at its cap on $15M seed post. */
export function estSafeDilutionAtSeed(state, assumedPostMoney = 15_000_000) {
  let pct = 0;
  for (const i of activeSafeInstruments(state)) {
    const cap = i.cap ?? assumedPostMoney;
    const effectivePost = Math.min(assumedPostMoney, cap);
    pct += ((i.amount ?? 0) / effectivePost) * 100;
  }
  return Math.round(pct * 10) / 10;
}

export function convertOutstandingSafesAtSeed(state, postMoney) {
  const lines = [];
  for (const i of activeSafeInstruments(state)) {
    i.converted = true;
    i.convertedAtPost = postMoney;
    i.convertedMonth = state.calendar?.monthIndex;
    i.convertedYear = state.calendar?.year;
    lines.push(`${i.label} converts at seed (${formatMoney(postMoney)} post).`);
  }
  return lines;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderCapitalStackSummary(state) {
  const safeTotal = totalSafePrincipal(state);
  const safeCount = activeSafeInstruments(state).length;
  const debt = loanOutstanding(state);
  const debtSvc = loanPaymentMonthly(state);
  const cash = state.finance?.cash ?? 0;
  const limit = computeCreditLimit(state);
  const dilution = estSafeDilutionAtSeed(state);
  const arr = getArr(state);

  if (safeCount === 0 && debt <= 0) return '';

  return `<div class="capital-stack" role="region" aria-label="Capital stack">
    <p class="prelaunch-progress-title"><strong>Capital stack</strong></p>
    <div class="summary-grid">
      <div><span class="stat-label">Cash</span><span class="stat-value">${formatMoney(cash)}</span></div>
      <div><span class="stat-label">SAFE outstanding</span><span class="stat-value">${formatMoney(safeTotal)} (${safeCount})</span></div>
      <div><span class="stat-label">Est. SAFE dilution @ seed</span><span class="stat-value">~${dilution}%</span></div>
      <div><span class="stat-label">Bank debt</span><span class="stat-value">${formatMoney(debt)}</span></div>
      <div><span class="stat-label">Debt service</span><span class="stat-value">${formatMoney(debtSvc)}/mo</span></div>
      <div><span class="stat-label">Credit headroom</span><span class="stat-value">${formatMoney(Math.max(0, limit - debt))}</span></div>
    </div>
    <p class="fine-print">ARR ${formatMoney(arr)} · Line limit ${formatMoney(limit)}. SAFEs convert on priced seed; loan balance is paid down via monthly overhead.</p>
  </div>`;
}

export function renderSafeInstrumentList(state) {
  const list = activeSafeInstruments(state);
  if (!list.length) return '';
  const items = list
    .map(
      (i) =>
        `<li>${escapeHtml(i.label)} — ${formatMoney(i.amount)} · cap ${formatMoney(i.cap)} · ~${i.estConversionPct ?? '—'}%${i.leadName ? ` · ${escapeHtml(i.leadName)}` : ''}</li>`
    )
    .join('');
  return `<h3 class="log-head">Outstanding SAFEs</h3><ul class="instrument-list">${items}</ul>`;
}
