import { formatMoney, stageLabel } from './constants.js';
import { formatStateMonth } from './GameCalendar.js';
import { calendarTurn } from './XC.js';

export function buildRunExportText(state) {
  const lines = [];
  const company = state.company?.name ?? 'Company';
  const months = calendarTurn(state);
  lines.push(`Startup Simulator — ${company}`);
  lines.push(`Mode: ${state.mode === 'sandbox' ? 'Sandbox' : 'Career'}`);
  lines.push(`Category: ${state.company?.categoryLabel ?? '—'}`);
  lines.push(`Stage: ${stageLabel(state.stage)}`);
  lines.push(`Calendar: ${formatStateMonth(state)}`);
  lines.push(`Months played: ${months}`);
  lines.push(`Lifetime revenue: ${formatMoney(state.finance?.lifetimeRevenue ?? 0)}`);
  lines.push(`Cash: ${formatMoney(state.finance?.cash ?? 0)}`);

  if (state.ending?.type === 'cash_out') {
    const e = state.ending;
    lines.push('');
    lines.push('Outcome: CEO step-down (cash out)');
    lines.push(`Payout: ${formatMoney(e.payout)}`);
    lines.push(`Ticker: ${e.ticker ?? '—'} @ ${formatMoney(e.sharePrice)}/share`);
    lines.push(`Founder stake: ${e.founderPct}%`);
    lines.push(`CEO salary (career): ${formatMoney(e.ceoSalaryCareer ?? 0)}`);
    lines.push(`Owner draws: ${formatMoney(e.ceoOwnerDraws ?? 0)}`);
    lines.push(`Personal bank at exit: ${formatMoney(e.ceoBankBalance ?? 0)}`);
    if (e.ceoPortfolioBalance > 0) {
      lines.push(`Personal portfolio: ${formatMoney(e.ceoPortfolioBalance)}`);
    }
    if (e.ceoHomeMarketValue > 0) {
      lines.push(
        `${e.ceoHomeLabel ?? 'Home'} (market): ${formatMoney(e.ceoHomeMarketValue)} · equity ${formatMoney(e.ceoHomeEquity ?? 0)}`
      );
    }
    lines.push(`Total personal cash comp: ${formatMoney(e.totalCareerCashComp ?? e.payout)}`);
    if (e.pressHeadline) lines.push(`Press: ${e.pressHeadline}`);
  } else if (state.flags?.gameOver) {
    lines.push('');
    lines.push(`Outcome: ${state.flags.gameOverReason ?? 'Run ended'}`);
  }

  if (state.meta?.hofHighlights?.length) {
    lines.push('');
    lines.push(`Records: ${state.meta.hofHighlights.join(', ')}`);
  }

  lines.push('');
  if (typeof window !== 'undefined' && window.location?.origin) {
    lines.push(`${window.location.origin}/play/startup-sim/`);
  } else {
    lines.push('https://austinbuhltech.com/play/startup-sim/');
  }
  return lines.join('\n');
}

export async function copyRunExportToClipboard(state) {
  const text = buildRunExportText(state);
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, text };
  } catch {
    return { ok: false, text, reason: 'Could not copy — select text manually.' };
  }
}
