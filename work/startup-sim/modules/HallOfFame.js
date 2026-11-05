import { formatMoney } from './constants.js';
import { calendarTurn } from './XC.js';

const HOF_KEY = 'startup_sim_hall_of_fame_v1';

function formatOutcome(outcome) {
  if (outcome === 'cash_out') return 'CEO cash-out';
  if (outcome === 'game_over') return 'Run ended';
  return 'Completed';
}

function emptyRecord() {
  return {
    version: 1,
    runsRecorded: 0,
    bestFounderPayout: null,
    bestValuation: null,
    fastestIpoMonths: null,
    recentRuns: []
  };
}

export function loadHallOfFame() {
  try {
    const raw = localStorage.getItem(HOF_KEY);
    if (!raw) return emptyRecord();
    const data = JSON.parse(raw);
    return { ...emptyRecord(), ...data, recentRuns: data.recentRuns ?? [] };
  } catch {
    return emptyRecord();
  }
}

function saveHallOfFame(data) {
  try {
    localStorage.setItem(HOF_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function monthsPlayed(state) {
  return calendarTurn(state);
}

function isBetter(a, b) {
  if (a == null) return false;
  if (b == null) return true;
  return a > b;
}

/** Persist run stats when a game ends (cash-out or game over). */
export function recordRunInHallOfFame(state) {
  const hof = loadHallOfFame();
  const months = monthsPlayed(state);
  const payout = state.ending?.type === 'cash_out' ? state.ending.payout ?? 0 : 0;
  const valuation = state.finance?.valuation ?? 0;
  const monthsToIpo = state.meta?.monthsAtIpo ?? null;
  const outcome =
    state.ending?.type === 'cash_out'
      ? 'cash_out'
      : state.flags?.gameOver
        ? 'game_over'
        : 'ended';

  const entry = {
    company: state.company?.name ?? 'Unknown',
    outcome,
    payout,
    valuation,
    lifetimeRevenue: state.finance?.lifetimeRevenue ?? 0,
    months,
    monthsToIpo,
    recordedAt: Date.now()
  };

  hof.runsRecorded += 1;
  hof.recentRuns.unshift(entry);
  hof.recentRuns = hof.recentRuns.slice(0, 8);

  const highlights = [];

  if (isBetter(payout, hof.bestFounderPayout?.value)) {
    hof.bestFounderPayout = { value: payout, company: entry.company, months };
    highlights.push('bestFounderPayout');
  }
  if (isBetter(valuation, hof.bestValuation?.value)) {
    hof.bestValuation = { value: valuation, company: entry.company, months };
    highlights.push('bestValuation');
  }
  if (
    monthsToIpo != null &&
    (hof.fastestIpoMonths == null || monthsToIpo < hof.fastestIpoMonths.value)
  ) {
    hof.fastestIpoMonths = { value: monthsToIpo, company: entry.company };
    highlights.push('fastestIpoMonths');
  }

  saveHallOfFame(hof);
  return { hof, highlights, entry };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderHallOfFameBlock(container) {
  if (!container) return;
  const hof = loadHallOfFame();
  if (hof.runsRecorded === 0) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  container.hidden = false;
  const bestLines = [];
  if (hof.bestFounderPayout?.value) {
    bestLines.push(
      `Best cash-out: ${formatMoney(hof.bestFounderPayout.value)} (${escapeHtml(hof.bestFounderPayout.company)})`
    );
  }
  if (hof.bestValuation?.value) {
    bestLines.push(
      `Peak valuation: ${formatMoney(hof.bestValuation.value)} (${escapeHtml(hof.bestValuation.company)})`
    );
  }
  if (hof.fastestIpoMonths?.value != null) {
    bestLines.push(
      `Fastest to IPO: ${hof.fastestIpoMonths.value} mo (${escapeHtml(hof.fastestIpoMonths.company)})`
    );
  }

  const recent = (hof.recentRuns ?? [])
    .slice(0, 4)
    .map(
      (r) =>
        `<li>${escapeHtml(r.company)} — ${escapeHtml(formatOutcome(r.outcome))} · ${formatMoney(r.lifetimeRevenue)} lifetime · ${r.months} mo</li>`
    )
    .join('');

  container.innerHTML = `
    <h2 class="hof-title">Hall of fame</h2>
    <p class="fine-print">${hof.runsRecorded} completed run${hof.runsRecorded === 1 ? '' : 's'} in the hall.</p>
    ${bestLines.length ? `<ul class="hof-bests">${bestLines.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
    ${recent ? `<ul class="hof-recent">${recent}</ul>` : ''}
  `;
}

export function formatHallHighlights(highlights) {
  if (!highlights?.length) return '';
  const labels = {
    bestFounderPayout: 'Best founder cash-out',
    bestValuation: 'Highest valuation',
    fastestIpoMonths: 'Fastest path to IPO'
  };
  return highlights.map((k) => labels[k] ?? k).join(' · ');
}
