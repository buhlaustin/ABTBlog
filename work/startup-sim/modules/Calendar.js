import { STAGES } from './constants.js';
import { dealMonthlyTasks, allTasksComplete } from './Tasks.js';
import { resolveMonthEndBurn } from './Finance.js';
import { syncStageFromProgress, onStageChange, onIpoUnlocked } from './Progression.js';
import { tickPublicMarket, tickIpoLockup, isPublicCompany } from './IPO.js';
import { onMonthEndSentiment, onStockSentiment } from './Sentiment.js';
import { syncDraftFromFinalized } from './Staff.js';
import { tickXcResidency } from './XC.js';
import { archiveCurrentNews } from './News.js';

export { getMonthlyTaskSlots } from './constants.js';

export function createInitialCalendar() {
  return {
    monthIndex: 1,
    year: 1,
    monthTasks: [],
    tasksCompleted: 0,
    monthRevenue: 0,
    monthSpend: 0,
    log: [],
    recentTaskIds: []
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
  if (state.calendar?.taskCatalogError) {
    return { ok: false, reason: 'Tasks are not ready yet — reload and try closing the month again.' };
  }
  if (!allTasksComplete(state)) {
    return { ok: false, reason: 'Finish every desk task before closing the month.' };
  }

  const priorStage = state.stage;
  const priorMonthRevenue = state.finance?.monthlyRevenue ?? 0;
  const closedYear = state.calendar.year;
  const closedMonthIndex = state.calendar.monthIndex;
  const monthRevenue = state.calendar.monthRevenue ?? 0;
  const burn = resolveMonthEndBurn(state);
  onMonthEndSentiment(state, priorMonthRevenue, state.finance?.monthlyRevenue ?? 0);
  let stockDeltaPct = null;

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
  for (const line of onIpoUnlocked(state)) {
    appendLog(state, line);
  }

  if (isPublicCompany(state)) {
    const tick = tickPublicMarket(state);
    stockDeltaPct = tick.deltaPct ?? 0;
    onStockSentiment(state, stockDeltaPct);
    for (const line of tick.lines ?? []) {
      appendLog(state, line);
    }
    for (const line of tickIpoLockup(state)) {
      appendLog(state, line);
    }
  }

  for (const line of tickXcResidency(state)) {
    appendLog(state, line);
  }

  if (state.finance.cash < 0) {
    state.flags.gameOver = true;
    state.flags.gameOverReason = 'Ran out of cash.';
    appendLog(state, 'You ran out of cash. The run is over.');
    return {
      ok: true,
      gameOver: true,
      monthSummary: {
        closedYear,
        closedMonthIndex,
        monthRevenue,
        burn,
        cashAfter: state.finance.cash,
        stockDeltaPct
      }
    };
  }

  const cashAfter = state.finance.cash;
  archiveCurrentNews(state);
  advanceCalendarMonth(state);
  startMonth(state);
  return {
    ok: true,
    gameOver: false,
    monthSummary: {
      closedYear,
      closedMonthIndex,
      monthRevenue,
      burn,
      cashAfter,
      stockDeltaPct
    }
  };
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
