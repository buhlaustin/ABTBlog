import { STAGES } from './GameState.js';
import { dealMonthlyTasks, allTasksComplete } from './Tasks.js';
import { resolveMonthEndBurn } from './Finance.js';
import { syncStageFromProgress, onStageChange } from './Progression.js';
import { syncDraftFromFinalized } from './Staff.js';
import { tickXcResidency } from './XC.js';
import { archiveCurrentNews } from './News.js';

/** Counted task slots per month (staff/finance actions excluded). */
export function getMonthlyTaskSlots(stage) {
  switch (stage) {
    case STAGES.GARAGE:
      return 4;
    case STAGES.OFFICE:
      return 6;
    case STAGES.XC:
      return 6;
    case STAGES.POST_XC:
      return 7;
    case STAGES.PUBLIC:
      return 8;
    default:
      return 4;
  }
}

export function createInitialCalendar() {
  return {
    monthIndex: 1,
    year: 1,
    monthTasks: [],
    tasksCompleted: 0,
    monthRevenue: 0,
    monthSpend: 0,
    log: []
  };
}

export function appendLog(state, message) {
  if (!state.calendar.log) state.calendar.log = [];
  state.calendar.log.unshift({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    message
  });
  state.calendar.log = state.calendar.log.slice(0, 24);
}

export function advanceCalendarMonth(state) {
  let { monthIndex, year } = state.calendar;
  monthIndex += 1;
  if (monthIndex > 12) {
    monthIndex = 1;
    year += 1;
  }
  state.calendar.monthIndex = monthIndex;
  state.calendar.year = year;
  return state;
}

export function startMonth(state) {
  syncDraftFromFinalized(state);
  dealMonthlyTasks(state);
  return state;
}

export function endMonth(state) {
  if (!allTasksComplete(state)) {
    return { ok: false, reason: 'Complete all counted tasks before closing the month.' };
  }

  const priorStage = state.stage;
  const burn = resolveMonthEndBurn(state);

  appendLog(
    state,
    `Month closed: ${state.calendar.tasksCompleted} tasks, ${formatLogMoney(state.calendar.monthRevenue)} revenue, ${formatLogMoney(burn)} overhead.`
  );

  syncStageFromProgress(state);
  if (state.stage !== priorStage) {
    for (const line of onStageChange(state, priorStage, state.stage)) {
      appendLog(state, line);
    }
  }

  for (const line of tickXcResidency(state)) {
    appendLog(state, line);
  }

  if (state.finance.cash < 0) {
    state.flags.gameOver = true;
    state.flags.gameOverReason = 'Ran out of cash.';
    appendLog(state, 'You ran out of cash. Game over.');
    return { ok: true, gameOver: true };
  }

  archiveCurrentNews(state);
  advanceCalendarMonth(state);
  startMonth(state);
  return { ok: true, gameOver: false };
}

function formatLogMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${Math.round(v)}`;
}

/** Complete a counted task instance. */
export function completeTaskInstance(state, instanceId, taskDef, rolled) {
  const task = state.calendar.monthTasks?.find(
    (t) => t.instanceId === instanceId && t.status === 'pending'
  );
  if (!task) return { ok: false };

  task.status = 'done';
  state.calendar.tasksCompleted = (state.calendar.tasksCompleted ?? 0) + 1;
  return { ok: true };
}
