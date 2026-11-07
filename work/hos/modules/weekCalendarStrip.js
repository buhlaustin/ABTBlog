import { PHASES, PHASE_LABELS, WEEKDAYS } from './GameState.js';
import { getNextHostEventPreview } from './hostPhaseBeats.js';
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

/** @type {Record<string, string>} */
export const PHASE_SHORT = {
  [PHASES.COMPETITION]: 'HOH',
  [PHASES.NOMINATION]: 'Noms',
  [PHASES.VETO_COMP]: 'POV comp',
  [PHASES.VETO_CEREMONY]: 'Veto',
  [PHASES.VETO]: 'Veto',
  [PHASES.EVICTION]: 'Evict',
  [PHASES.SOCIAL]: 'Social',
  [PHASES.WEEK_END]: 'Summary'
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
 * @param {number} dayIndex
 */
function resolveEventState(state, dayIndex, status, live) {
  if (status === 'past') return 'done';
  if (status !== 'today') return 'upcoming';
  if (live) {
    return state.houseEventComplete ? 'done' : 'now';
  }
  return 'social';
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {object} cell
 */
function resolveSubtitle(state, cell) {
  let deTag = '';
  if (cell.doubleEviction && cell.index === 6) {
    if (state.doubleEvictionAwaitingRound2) deTag = 'DE break';
    else if (state.doubleEvictionRound2Cycle || state.doubleEvictionRound === 2) deTag = 'DE R2';
    else if (state.doubleEvictionWeekActive) deTag = 'DE R1';
  }

  if (cell.status === 'today' && !cell.live) {
    const n = state.actionsRemaining;
    const acts = typeof n === 'number' ? `${n} action${n === 1 ? '' : 's'}` : cell.phaseShort;
    return deTag ? `${deTag} · ${acts}` : acts;
  }
  if (cell.status === 'today' && cell.live && cell.eventState === 'now') {
    return deTag ? `${deTag} · now` : 'Live now';
  }
  if (cell.status === 'today' && cell.live && cell.eventState === 'done') {
    return deTag ? `${deTag} · done` : 'Done';
  }
  if (deTag) return deTag;
  if (cell.premiere) return 'Move-in';
  return cell.phaseShort;
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
      phaseShort: 'Finale',
      live: true,
      status: 'today',
      eventState: 'now',
      doubleEviction: false,
      premiere: false,
      subtitle: 'Live now'
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

    const live = isLiveCalendarPhase(phase);
    const doubleTonight = de && i === 6;
    const premiere = state.week === 1 && i === 0;

    let phaseLabel = PHASE_LABELS[phase] || phase;
    if (doubleTonight && i === idx && state.getPhaseDisplayLabel) {
      phaseLabel = state.getPhaseDisplayLabel();
    } else if (doubleTonight && i !== idx) {
      phaseLabel = 'Double eviction night';
    }

    const phaseShort = PHASE_SHORT[phase] || phase;

    const cell = {
      index: i,
      short,
      full: WEEKDAYS[i] || short,
      phase,
      phaseLabel,
      phaseShort,
      live,
      status,
      doubleEviction: doubleTonight,
      premiere,
      eventState: resolveEventState(state, i, status, live),
      subtitle: ''
    };
    cell.subtitle = resolveSubtitle(state, cell);
    return cell;
  });
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getWeekCalendarFooter(state) {
  if (state.gameOver) return '';

  if (state.inFinale) {
    const label = state.getPhaseDisplayLabel?.() || 'Finale';
    return `Finale · ${label}`;
  }

  const preview = getNextHostEventPreview(state);
  const liveToday = state.isScheduledHouseEventDay?.()
    && !state.houseEventComplete
    && state.weekdayIndex != null;

  if (liveToday) {
    const day = WEEKDAYS[state.weekdayIndex] || 'Tonight';
    return `${day} · Live now — ${PHASE_LABELS[state.phase] || preview.label}`;
  }

  if (preview.today) {
    return `Tonight · ${preview.label}`;
  }
  if (preview.nextWeek) {
    return `Next week · ${preview.day} — ${preview.label}`;
  }
  if (preview.day) {
    return `Next · ${preview.day} — ${preview.label}`;
  }
  return '';
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildWeekCalendarIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted || state.gameOver) return null;

  const footer = getWeekCalendarFooter(state);
  const today = buildWeekCalendarCells(state).find((c) => c.status === 'today');
  if (!today && !footer) return null;

  /** @type {{ key: string, name: string, detail: string }[]} */
  const items = [];
  if (today) {
    items.push({
      key: 'cal-today',
      name: today.full,
      detail: `${today.phaseLabel} · ${today.subtitle}`
    });
  }
  if (footer) {
    items.push({ key: 'cal-next', name: 'Up next', detail: footer });
  }
  items.push({
    key: 'cal-legend',
    name: 'Legend',
    detail: '◆ Live house event · · Social days (actions)'
  });

  return {
    id: 'week-calendar',
    title: 'Week schedule',
    tone: 'neutral',
    items
  };
}

/**
 * @param {ReturnType<typeof buildWeekCalendarCells>} cells
 */
function renderCellHtml(c) {
  const classes = [
    'cal-cell',
    `cal-${c.status}`,
    c.live ? 'cal-live' : 'cal-social',
    c.doubleEviction ? 'cal-double' : '',
    c.premiere ? 'cal-premiere' : '',
    c.eventState === 'now' ? 'cal-now' : '',
    c.eventState === 'done' ? 'cal-event-done' : ''
  ].filter(Boolean).join(' ');

  let icon = c.live ? '◆' : '·';
  if (c.eventState === 'done') icon = '✓';

  const kind = c.live ? 'Live' : 'Social';
  const aria = `${c.full} — ${c.phaseLabel}${c.subtitle ? ` · ${c.subtitle}` : ''}`;

  return `<span class="${classes}" data-day="${c.index}" role="listitem" title="${escapeHtml(aria)}" aria-label="${escapeHtml(aria)}">
      <span class="cal-icon" aria-hidden="true">${icon}</span>
      <span class="cal-day">${escapeHtml(c.short)}</span>
      <span class="cal-tag">${escapeHtml(c.subtitle || c.phaseShort)}</span>
      <span class="cal-kind">${kind}</span>
    </span>`;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function renderWeekCalendarHtml(state) {
  const cells = buildWeekCalendarCells(state);
  const week = state.week ?? 1;
  const footer = getWeekCalendarFooter(state);

  if (cells.length === 1 && cells[0].index === -1) {
    const c = cells[0];
    return `<div class="week-calendar-wrap" data-week="${week}">
      <div class="week-calendar week-calendar--finale" role="list">${renderCellHtml(c)}</div>
      ${footer ? `<p class="week-calendar-footer">${escapeHtml(footer)}</p>` : ''}
      <p class="week-calendar-legend" aria-hidden="true">◆ Live</p>
    </div>`;
  }

  const parts = cells.map(renderCellHtml);
  const footerHtml = footer
    ? `<p class="week-calendar-footer" aria-live="polite">${escapeHtml(footer)}</p>`
    : '';

  return `<div class="week-calendar-wrap" data-week="${week}">
    <div class="week-calendar" role="list">${parts.join('')}</div>
    ${footerHtml}
    <p class="week-calendar-legend" aria-hidden="true">◆ Live · · Social · ✓ Done</p>
  </div>`;
}
