import { PHASES, PHASE_LABELS, WEEKDAYS } from './GameState.js';
import { escapeHtml } from './utils.js';

export const WEEKDAY_SHORT = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

/** Default phase per calendar day (matches `GameState.syncPhaseForWeekday`). */
export const WEEKDAY_PHASE = {
  0: PHASES.COMPETITION,
  1: PHASES.NOMINATION,
  2: PHASES.VETO_COMP,
  3: PHASES.VETO_CEREMONY,
  4: PHASES.SOCIAL,
  5: PHASES.SOCIAL,
  6: PHASES.EVICTION
};

const LIVE_PHASES = new Set([
  PHASES.COMPETITION,
  PHASES.NOMINATION,
  PHASES.VETO_COMP,
  PHASES.VETO_CEREMONY,
  PHASES.VETO,
  PHASES.EVICTION
]);

/**
 * @param {string} phase
 */
export function isLiveCalendarPhase(phase) {
  return LIVE_PHASES.has(phase);
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildWeekCalendarCells(state) {
  if (state.inFinale) {
    const label = state.getPhaseDisplayLabel?.() || 'Finale';
    return [{
      index: -1,
      short: 'Finale',
      full: 'Finale',
      phase: state.finalePhase || 'finale',
      phaseLabel: label,
      live: true,
      status: 'today',
      doubleEviction: false
    }];
  }

  const idx = state.weekdayIndex ?? 0;
  const de = Boolean(
    state.doubleEvictionWeekActive
    || state.doubleEvictionAwaitingRound2
    || state.doubleEvictionRound2Cycle
  );

  return WEEKDAY_SHORT.map((short, i) => {
    const phase = i === idx ? state.phase : (WEEKDAY_PHASE[i] ?? PHASES.SOCIAL);
    let status = 'future';
    if (i < idx) status = 'past';
    else if (i === idx) status = 'today';

    const doubleTonight = de && i === 6;
    let phaseLabel = PHASE_LABELS[phase] || phase;
    if (doubleTonight && i === idx && state.getPhaseDisplayLabel) {
      phaseLabel = state.getPhaseDisplayLabel();
    } else if (doubleTonight && i !== idx) {
      phaseLabel = 'Double eviction night';
    }

    return {
      index: i,
      short,
      full: WEEKDAYS[i] || short,
      phase,
      phaseLabel,
      live: isLiveCalendarPhase(phase),
      status,
      doubleEviction: doubleTonight
    };
  });
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function renderWeekCalendarHtml(state) {
  const cells = buildWeekCalendarCells(state);
  const week = state.week ?? 1;

  if (cells.length === 1 && cells[0].index === -1) {
    const c = cells[0];
    return `<div class="week-calendar week-calendar--finale" data-week="${week}">
      <span class="cal-cell cal-today cal-live" title="${escapeHtml(c.phaseLabel)}">
        <span class="cal-icon" aria-hidden="true">◆</span>
        <span class="cal-day">${escapeHtml(c.short)}</span>
        <span class="cal-kind">Live</span>
      </span>
    </div>`;
  }

  const parts = cells.map((c) => {
    const classes = [
      'cal-cell',
      `cal-${c.status}`,
      c.live ? 'cal-live' : 'cal-social',
      c.doubleEviction ? 'cal-double' : ''
    ].filter(Boolean).join(' ');
    const kind = c.live ? 'Live' : 'Social';
    const icon = c.live ? '◆' : '·';
    const done = c.status === 'past' ? ' cal-done' : '';
    return `<span class="${classes}${done}" data-day="${c.index}" title="${escapeHtml(`${c.full} — ${c.phaseLabel}`)}">
      <span class="cal-icon" aria-hidden="true">${icon}</span>
      <span class="cal-day">${escapeHtml(c.short)}</span>
      <span class="cal-kind">${kind}</span>
    </span>`;
  });

  return `<div class="week-calendar" data-week="${week}" role="list">${parts.join('')}</div>`;
}
