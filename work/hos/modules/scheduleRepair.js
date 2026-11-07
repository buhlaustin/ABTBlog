import { PHASE_LABELS, PHASES, WEEKDAYS } from './GameState.js';
import { escapeHtml } from './utils.js';

/**
 * @param {import('./GameState.js').GameState} state
 */
export function snapshotSchedule(state) {
  const hoh =
    state.currentHOH ||
    state.getActiveContestants().find((c) => c.isHOH) ||
    null;
  const idx = state.weekdayIndex ?? 0;
  return {
    week: state.week,
    weekdayIndex: idx,
    weekday: WEEKDAYS[idx] ?? state.getWeekdayName?.() ?? `Day ${idx + 1}`,
    phase: state.phase,
    phaseLabel: PHASE_LABELS[state.phase] || state.phase,
    nomineeCount: state.getActiveNominees().length,
    nomineeNames: state.getActiveNominees().map((n) => n.name),
    hohName: hoh?.name ?? null,
    houseEventComplete: Boolean(state.houseEventComplete)
  };
}

/**
 * @param {'missing_hoh' | 'missing_nominees'} reason
 */
export function describeScheduleRepairReason(reason) {
  if (reason === 'missing_hoh') {
    return 'Eviction night ran without a reigning Head of Household.';
  }
  return 'Eviction night ran without two nominees on the block.';
}

/**
 * @param {'missing_hoh' | 'missing_nominees'} reason
 */
export function describeScheduleRepairAction(reason) {
  if (reason === 'missing_hoh') {
    return 'The week rewinds to <strong>Friday</strong> for the HOH competition.';
  }
  return 'The schedule jumps to <strong>Saturday</strong>’s nomination ceremony.';
}

/**
 * Format before/after for detail panel.
 * @param {ReturnType<typeof snapshotSchedule>} snap
 */
function formatSnapLine(snap) {
  const noms = snap.nomineeCount
    ? `${snap.nomineeCount} on block (${snap.nomineeNames.join(', ')})`
    : '0 on block';
  const hoh = snap.hohName ? `HOH: ${snap.hohName}` : 'No HOH';
  return `${snap.weekday} · ${snap.phaseLabel} · ${noms} · ${hoh}`;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {'load' | 'recover' | 'runtime'} [source]
 * @returns {object | null}
 */
export function runScheduleRepair(state, source = 'runtime') {
  if (state.gameOver) return null;
  if (state.phase !== PHASES.EVICTION) return null;
  if (state.getActiveNominees().length >= 2) return null;

  const before = snapshotSchedule(state);

  const hoh =
    state.currentHOH ||
    state.getActiveContestants().find((c) => c.isHOH) ||
    null;

  const reason = hoh ? 'missing_nominees' : 'missing_hoh';

  if (!hoh) {
    state.nominees = [];
    state.weekdayIndex = 0;
    state.houseEventComplete = false;
    state.syncPhaseForWeekday();
  } else {
    state.weekdayIndex = 1;
    state.houseEventComplete = false;
    state.phase = PHASES.NOMINATION;
    state.day = 2;
  }

  const after = snapshotSchedule(state);
  const record = {
    at: Date.now(),
    week: state.week,
    reason,
    source,
    before,
    after
  };

  state.lastScheduleRepair = record;
  if (!state.scheduleRepairLog) state.scheduleRepairLog = [];
  state.scheduleRepairLog.push(record);
  if (state.scheduleRepairLog.length > 5) {
    state.scheduleRepairLog = state.scheduleRepairLog.slice(-5);
  }

  state._scheduleRepaired = true;
  return record;
}

/**
 * @param {NonNullable<ReturnType<typeof runScheduleRepair>>} repair
 */
export function buildScheduleRepairFeedEntries(repair) {
  const why = describeScheduleRepairReason(repair.reason);
  const action = describeScheduleRepairAction(repair.reason);
  const beforeLine = escapeHtml(formatSnapLine(repair.before));
  const afterLine = escapeHtml(formatSnapLine(repair.after));
  const src =
    repair.source === 'load'
      ? 'Detected while loading your save.'
      : repair.source === 'recover'
        ? 'Detected during live eviction.'
        : 'Detected automatically.';

  return [
    {
      type: 'warning',
      text: `<span class="schedule-repair-label">Schedule adjusted</span> — ${why} ${action}`
    },
    {
      type: 'schedule-repair',
      text: `<details class="schedule-repair-detail">
<summary>View what happened</summary>
<p class="schedule-repair-meta">${escapeHtml(src)}</p>
<ul class="schedule-repair-diff">
<li><strong>Before:</strong> ${beforeLine}</li>
<li><strong>After:</strong> ${afterLine}</li>
</ul>
</details>`
    }
  ];
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getScheduleRepairBanner(state) {
  const r = state.lastScheduleRepair;
  if (!r || r.week !== state.week) return '';
  const day = r.after?.weekday || '—';
  return `Schedule repair · now ${day} (${r.after?.phaseLabel || '—'})`;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildScheduleRepairIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const log = state.scheduleRepairLog || [];
  if (!log.length && !state.lastScheduleRepair) return null;

  const items = (log.length ? log : [state.lastScheduleRepair])
    .slice(-3)
    .reverse()
    .map((r, idx) => ({
      key: `sched-repair-${r.week}-${r.at}-${idx}`,
      name: `Week ${r.week} fix`,
      detail: `${describeScheduleRepairReason(r.reason).replace(/\.$/, '')} → ${r.after.weekday} (${r.after.phaseLabel})`
    }));

  return {
    id: 'schedule-repair',
    title: 'Schedule repairs',
    tone: 'caution',
    items
  };
}
