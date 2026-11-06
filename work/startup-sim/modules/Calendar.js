import { STAGES, formatMoney } from './constants.js';
import { advanceRealCalendarMonth, realClockNow } from './GameCalendar.js';
import { dealMonthlyTasks, allTasksComplete } from './Tasks.js';
import { dealBoardTasks } from './Board.js';
import { resolveMonthEndBurn } from './Finance.js';
import { closeFiscalYearOnDecember } from './CorporateTax.js';
import { closeCeoPersonalTaxYearOnDecember } from './CeoPersonalTax.js';
import { serviceLoanAtMonthEnd } from './BankLoan.js';
import { settleRevenueAdvanceAtMonthEnd } from './RevenueAdvance.js';
import {
  recordCeoSalaryForMonth,
  settlePersonalExpensesAtMonthEnd,
  recordCeoNetWorthSnapshot,
  settlePersonalInvestmentsAtMonthEnd,
  preparePersonalExpensesForMonth
} from './CeoEconomics.js';
import { prepareCompanyOverheadForMonth } from './CompanyOverhead.js';
import { syncStageFromProgress, onStageChange, onIpoUnlocked } from './Progression.js';
import {
  tickPublicMarket,
  tickIpoLockup,
  tickPublicMarketAtMonthStart,
  isPublicCompany,
  refreshMarketValuationFromFundamentals
} from './IPO.js';
import { resetPublicMarketEventsAtMonthStart } from './PublicMarkets.js';
import { onMonthEndSentiment, onStockSentiment } from './Sentiment.js';
import { syncDraftFromFinalized, tickMarketSalaryDemand } from './Staff.js';
import { tickXcResidency } from './XC.js';
import { archiveCurrentNews } from './News.js';
import { maybeStartScheduledXcBatch, tickXcGraduateBoost } from './XC.js';
import { tickAcceleratorBoost } from './Accelerators.js';
import { tickCooCompensationReview } from './Coo.js';
import { resetGrowthCampaignsMonth, growthRosterRefreshLine } from './GrowthCampaigns.js';
import { resetProductActionsMonth } from './ProductActions.js';
import { resetEmployeeBenefitsMonth } from './EmployeeBenefits.js';
import { tickAnnualFacilitiesAtMonthStart } from './FacilitiesEconomics.js';
import {
  tickLaunchAtMonthStart,
  tickPreLaunchAtMonthStart,
  settleLaunchAtMonthEnd,
  graduateLaunchIfLeftGarage
} from './LaunchLifecycle.js';
import {
  applyBuzzDecayAtMonthStart,
  settleRivalHeatAtMonthEnd,
  settleBoardGovernance,
  scorePublicGuidanceBeat
} from './WorldDynamics.js';
import { tickScenarioModifiers } from './ScenarioEffects.js';
import { applySubsidiaryMrrPayout, tickAcquisitionsAtMonthStart } from './Acquisitions.js';

export { getMonthlyTaskSlots } from './constants.js';

export function createInitialCalendar(start) {
  const s = start ?? realClockNow();
  return {
    monthIndex: s.monthIndex,
    year: s.year,
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
  return advanceRealCalendarMonth(state);
}

export function startMonth(state) {
  const stageBeforeBatch = state.stage;
  maybeStartScheduledXcBatch(state);
  syncStageFromProgress(state);
  if (state.stage !== stageBeforeBatch) {
    for (const line of onStageChange(state, stageBeforeBatch, state.stage)) {
      appendLog(state, line);
    }
  }
  syncDraftFromFinalized(state);
  resetGrowthCampaignsMonth(state);
  appendLog(state, growthRosterRefreshLine(state));
  resetProductActionsMonth(state);
  resetEmployeeBenefitsMonth(state);
  for (const line of applyBuzzDecayAtMonthStart(state)) {
    appendLog(state, line);
  }
  for (const line of tickScenarioModifiers(state)) {
    appendLog(state, line);
  }
  for (const line of tickLaunchAtMonthStart(state)) {
    appendLog(state, line);
  }
  for (const line of tickPreLaunchAtMonthStart(state)) {
    appendLog(state, line);
  }
  for (const line of tickAnnualFacilitiesAtMonthStart(state)) {
    appendLog(state, line);
  }
  for (const line of tickAcquisitionsAtMonthStart(state)) {
    appendLog(state, line);
  }
  resetPublicMarketEventsAtMonthStart(state);
  for (const line of tickPublicMarketAtMonthStart(state)) {
    appendLog(state, line);
  }
  dealMonthlyTasks(state);
  dealBoardTasks(state);
  preparePersonalExpensesForMonth(state);
  prepareCompanyOverheadForMonth(state);
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
  const growthCampaignsClosed = state.growth?.campaignsThisMonth?.length ?? 0;
  const burn = resolveMonthEndBurn(state);
  for (const line of recordCeoSalaryForMonth(state)) {
    appendLog(state, line);
  }
  for (const line of tickCooCompensationReview(state)) {
    appendLog(state, line);
  }
  for (const line of tickMarketSalaryDemand(state)) {
    appendLog(state, line);
  }
  for (const line of settlePersonalExpensesAtMonthEnd(state)) {
    appendLog(state, line);
  }
  for (const line of settlePersonalInvestmentsAtMonthEnd(state)) {
    appendLog(state, line);
  }
  recordCeoNetWorthSnapshot(state);
  for (const line of settleRevenueAdvanceAtMonthEnd(state)) {
    appendLog(state, line);
  }
  for (const line of serviceLoanAtMonthEnd(state)) {
    appendLog(state, line);
  }
  const portfolio = applySubsidiaryMrrPayout(state);
  for (const line of portfolio.lines ?? []) {
    appendLog(state, line);
  }
  onMonthEndSentiment(state, priorMonthRevenue, state.finance?.monthlyRevenue ?? 0);
  let stockDeltaPct = null;

  appendLog(
    state,
    `Month closed: ${state.calendar.tasksCompleted} tasks, ${formatMoney(state.calendar.monthRevenue)} revenue, ${formatMoney(burn)} overhead.`
  );

  for (const line of settleBoardGovernance(state)) {
    appendLog(state, line);
  }
  for (const line of scorePublicGuidanceBeat(state, monthRevenue, burn)) {
    appendLog(state, line);
  }
  for (const line of settleRivalHeatAtMonthEnd(state, monthRevenue, burn)) {
    appendLog(state, line);
  }
  for (const line of settleLaunchAtMonthEnd(state)) {
    appendLog(state, line);
  }

  syncStageFromProgress(state);
  for (const line of graduateLaunchIfLeftGarage(state)) {
    appendLog(state, line);
  }
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
  refreshMarketValuationFromFundamentals(state);

  for (const line of tickXcResidency(state)) {
    appendLog(state, line);
  }
  tickXcGraduateBoost(state);
  tickAcceleratorBoost(state);

  const stageBeforeResidencySync = state.stage;
  syncStageFromProgress(state);
  if (state.stage !== stageBeforeResidencySync) {
    for (const line of onStageChange(state, stageBeforeResidencySync, state.stage)) {
      appendLog(state, line);
    }
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
        stockDeltaPct,
        growthCampaignsClosed,
        arrAfter: state.finance.arr ?? 0
      }
    };
  }

  const cashAfter = state.finance.cash;
  const closedFy = closeFiscalYearOnDecember(state, closedYear, closedMonthIndex);
  if (closedFy) {
    appendLog(
      state,
      `Fiscal ${closedYear} closed — revenue ${formatMoney(closedFy.revenue)}, expenses ${formatMoney(closedFy.expenses)}, profit ${formatMoney(closedFy.profit)}.`
    );
  }
  const closedPersonalTax = closeCeoPersonalTaxYearOnDecember(state, closedYear, closedMonthIndex);
  if (closedPersonalTax) {
    appendLog(
      state,
      `Personal tax year ${closedYear} closed — taxable income ${formatMoney(closedPersonalTax.income)} (April filing).`
    );
  }
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
      stockDeltaPct,
      growthCampaignsClosed,
      arrAfter: state.finance.arr ?? 0
    }
  };
}

/** Complete a counted task instance. */
export function completeTaskInstance(state, instanceId, taskDef, rolled) {
  const task = state.calendar.monthTasks?.find(
    (t) => t.instanceId === instanceId && t.status === 'pending'
  );
  if (!task) return { ok: false };

  task.status = 'done';
  state.calendar.tasksCompleted = (state.calendar.tasksCompleted ?? 0) + 1;
  if (!state.meta) state.meta = {};
  state.meta.deskTasksLifetime = (state.meta.deskTasksLifetime ?? 0) + 1;
  return { ok: true };
}
