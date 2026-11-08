import { PHASE_LABELS, PHASES, WEEKDAYS } from './GameState.js';
import { escapeHtml } from './utils.js';

const SOURCE_LABELS = {
  load: 'Save load',
  recover: 'Live eviction guard',
  runtime: 'Auto fix'
};

/**
 * @param {import('./GameState.js').GameState} state
 */
export function snapshotSchedule(state) {
  const hoh =
    state.currentHOH ||
    state.getActiveContestants().find((c) => c.isHOH) ||
    null;
  const idx = state.weekdayIndex ?? 0;
  const vetoHolder = state.vetoHolderId
    ? state.getContestant(state.vetoHolderId)
    : null;

  return {
    week: state.week,
    weekdayIndex: idx,
    weekday: WEEKDAYS[idx] ?? state.getWeekdayName?.() ?? `Day ${idx + 1}`,
    phase: state.phase,
    phaseLabel: PHASE_LABELS[state.phase] || state.phase,
    nomineeCount: state.getActiveNominees().length,
    nomineeNames: state.getActiveNominees().map((n) => n.name),
    hohName: hoh?.name ?? null,
    vetoHolderName: vetoHolder?.name ?? null,
    houseEventComplete: Boolean(state.houseEventComplete),
    doubleEviction: Boolean(
      state.doubleEvictionWeekActive
      || state.doubleEvictionAwaitingRound2
      || state.doubleEvictionRound2Cycle
    )
  };
}

/**
 * @param {ReturnType<typeof snapshotSchedule>} before
 * @param {ReturnType<typeof snapshotSchedule>} after
 */
export function formatCalendarJump(before, after) {
  return `${before.weekday} (${before.phaseLabel}) → ${after.weekday} (${after.phaseLabel})`;
}

/**
 * @param {NonNullable<ReturnType<typeof runScheduleRepair>>} repair
 */
export function describeRepairNextStep(repair) {
  if (repair.reason === 'missing_hoh') {
    return 'Run the Friday HOH competition when you are ready, then continue the week in order.';
  }
  return 'Proceed with the nomination ceremony — two houseguests must be on the block before eviction night returns.';
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getActiveScheduleRepair(state) {
  const r = state.lastScheduleRepair;
  if (!r || r.week !== state.week) return null;
  return r;
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
  const veto = snap.vetoHolderName ? ` · Veto: ${snap.vetoHolderName}` : '';
  const de = snap.doubleEviction ? ' · DE week' : '';
  return `Week ${snap.week} · ${snap.weekday} · ${snap.phaseLabel} · ${noms} · ${hoh}${veto}${de}`;
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
  const jump = escapeHtml(formatCalendarJump(repair.before, repair.after));
  const srcLabel = SOURCE_LABELS[repair.source] || 'Auto fix';
  const src =
    repair.source === 'load'
      ? 'Detected while loading your save (older broken state).'
      : repair.source === 'recover'
        ? 'Detected during live eviction — you would have been soft-locked.'
        : 'Detected automatically.';
  const next = escapeHtml(describeRepairNextStep(repair));

  return [
    {
      type: 'warning',
      text: `<span class="schedule-repair-label">Schedule adjusted</span> — ${why} ${action}`
    },
    {
      type: 'schedule-repair',
      text: `<details class="schedule-repair-detail" open>
<summary>View what happened</summary>
<p class="schedule-repair-meta">${escapeHtml(srcLabel)} · ${escapeHtml(src)}</p>
<p class="schedule-repair-jump"><strong>Calendar jump:</strong> ${jump}</p>
<ul class="schedule-repair-diff">
<li><strong>Before:</strong> ${beforeLine}</li>
<li><strong>After:</strong> ${afterLine}</li>
</ul>
<p class="schedule-repair-next"><strong>Next:</strong> ${next}</p>
</details>`
    }
  ];
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getScheduleRepairBanner(state) {
  const r = getActiveScheduleRepair(state);
  if (!r) return '';
  return `Schedule repair · ${formatCalendarJump(r.before, r.after)}`;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildScheduleRepairIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const log = state.scheduleRepairLog || [];
  if (!log.length && !state.lastScheduleRepair) return null;

  const items = [];

  const active = getActiveScheduleRepair(state);
  if (active) {
    items.push({
      key: 'sched-repair-active',
      name: 'This week',
      detail: `${formatCalendarJump(active.before, active.after)} · ${SOURCE_LABELS[active.source] || 'Fix'}`
    });
    items.push({
      key: 'sched-repair-next',
      name: 'What’s next',
      detail: describeRepairNextStep(active)
    });
  }

  for (const r of (log.length ? log : []).slice(-3).reverse()) {
    if (active && r.at === active.at) continue;
    items.push({
      key: `sched-repair-${r.week}-${r.at}`,
      name: `Week ${r.week} (${SOURCE_LABELS[r.source] || 'Fix'})`,
      detail: `${formatCalendarJump(r.before, r.after)}`
    });
  }

  if (!items.length && state.lastScheduleRepair) {
    const r = state.lastScheduleRepair;
    items.push({
      key: 'sched-repair-last',
      name: `Week ${r.week}`,
      detail: formatCalendarJump(r.before, r.after)
    });
  }

  return {
    id: 'schedule-repair',
    title: `Schedule repairs${log.length ? ` (${log.length})` : ''}`,
    tone: 'caution',
    items: items.slice(0, 6)
  };
}
